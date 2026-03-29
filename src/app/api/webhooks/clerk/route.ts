/**
 * Clerk webhook handler — syncs user events to our database.
 *
 * Handles:
 *   user.created  → upsert user row + create "Personal" team + add as owner
 *   user.updated  → sync name + avatarUrl to users table
 *   user.deleted  → cascade handled by FK; we just log
 *
 * Security:
 * - Every request is verified using svix (Clerk's webhook library)
 * - CLERK_WEBHOOK_SECRET must be set in .env.local
 * - Invalid signatures → 400
 *
 * Setup (required):
 * 1. In Clerk Dashboard → Webhooks → Add endpoint → /api/webhooks/clerk
 * 2. Subscribe to: user.created, user.updated, user.deleted
 * 3. Copy signing secret → CLERK_WEBHOOK_SECRET in .env.local
 */

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/db/schema";

// ─── Clerk webhook event shapes ───────────────────────────────────────────────

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  image_url: string | null;
}

interface ClerkEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: ClerkUserData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(data: ClerkUserData): string {
  if (data.first_name || data.last_name) {
    return [data.first_name, data.last_name].filter(Boolean).join(" ");
  }
  return data.username ?? "User";
}

function getPrimaryEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? "";
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[webhook/clerk] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // ── Verify signature ────────────────────────────────────────────────────────
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: ClerkEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("[webhook/clerk] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Dispatch by event type ───────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(event.data);
        break;
      case "user.updated":
        await handleUserUpdated(event.data);
        break;
      case "user.deleted":
        await handleUserDeleted(event.data);
        break;
      default:
        // Unknown event — acknowledge but don't process
        console.log("[webhook/clerk] Unhandled event type:", (event as ClerkEvent).type);
    }
  } catch (err) {
    console.error("[webhook/clerk] Handler error:", err);
    // Return 500 so Clerk will retry
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * user.created — create user row + personal team + add as owner.
 * Uses upsert so it's safe to re-run on duplicate delivery.
 */
async function handleUserCreated(data: ClerkUserData) {
  const email = getPrimaryEmail(data);
  const name = getDisplayName(data);

  if (!email) {
    console.warn("[webhook/clerk] user.created: no email found for", data.id);
    return;
  }

  // Upsert user
  const [user] = await db
    .insert(users)
    .values({
      clerkId: data.id,
      email: email.toLowerCase(),
      name,
      avatarUrl: data.image_url,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: email.toLowerCase(),
        name,
        avatarUrl: data.image_url,
      },
    })
    .returning({ id: users.id });

  // Check if personal team already exists (idempotent)
  const existingTeam = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.ownerId, user.id))
    .limit(1);

  if (existingTeam[0]) {
    console.log("[webhook/clerk] user.created: personal team already exists for", data.id);
    return;
  }

  // Create personal team
  const [team] = await db
    .insert(teams)
    .values({
      name: "Personal",
      ownerId: user.id,
      tier: "free",
    })
    .returning({ id: teams.id });

  // Add user as owner member
  await db.insert(teamMembers).values({
    userId: user.id,
    teamId: team.id,
    role: "owner",
  });

  console.log("[webhook/clerk] user.created: provisioned user + team for", data.id);
}

/**
 * user.updated — sync name and avatar URL to the users table.
 */
async function handleUserUpdated(data: ClerkUserData) {
  const email = getPrimaryEmail(data);
  const name = getDisplayName(data);

  await db
    .update(users)
    .set({
      name,
      avatarUrl: data.image_url,
      ...(email ? { email: email.toLowerCase() } : {}),
    })
    .where(eq(users.clerkId, data.id));

  console.log("[webhook/clerk] user.updated:", data.id);
}

/**
 * user.deleted — FK cascades handle cleanup.
 * We just log the event for observability.
 */
async function handleUserDeleted(data: ClerkUserData) {
  // ON DELETE CASCADE on all FK relations handles cleanup automatically.
  // Deleting the user row cascades to: team ownership (but team persists),
  // teamMembers, createdBoards, boardAssets, favorites.
  await db.delete(users).where(eq(users.clerkId, data.id));
  console.log("[webhook/clerk] user.deleted:", data.id);
}
