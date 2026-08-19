/**
 * Liveblocks auth endpoint.
 *
 * Liveblocks calls this route when a user tries to enter a room.
 * We return a signed session token that:
 * 1. Identifies the user (guest or authenticated)
 * 2. Grants access to the specific room (board ID)
 *
 * Security model:
 * - Auth users: Clerk session verified server-side → user gets their clerkId
 * - Guest users: guestId from localStorage is passed in the request body
 *   for a stable identity across page reloads (no login required)
 *
 * This replaces the PartyKit server entirely.
 *
 * Setup:
 * - LIVEBLOCKS_SECRET_KEY must be set in .env.local
 * - Get it from: liveblocks.io/dashboard → your project → API Keys → Secret key
 */

import { Liveblocks } from "@liveblocks/node";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: NextRequest) {
  // ── Parse request body ───────────────────────────────────────────────────

  let body: { room?: string; guestId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { room, guestId } = body;

  if (!room) {
    return NextResponse.json(
      { error: "Missing room in request body" },
      { status: 400 }
    );
  }

  // ── Identify the user ────────────────────────────────────────────────────

  const { userId: clerkId } = await auth();

  let userId: string;
  let userName: string;

  if (clerkId) {
    // Authenticated Clerk user — use their stable Clerk ID
    userId = `auth:${clerkId}`;
    userName = "User"; // Name is carried by the awareness protocol, not Liveblocks identity
  } else {
    // Guest user — use their localStorage-generated guestId for stable identity.
    // This ensures the same guest is recognised across reconnects/page reloads.
    const stableGuestId =
      guestId ?? `guest-${Math.random().toString(36).slice(2, 9)}`;
    userId = `guest:${stableGuestId}`;
    userName = "Guest";
  }

  // ── Check peak connections (limit to 10) ─────────────────────────────────
  try {
    const activeUsersRes = await fetch(
      `https://api.liveblocks.io/v2/rooms/${room}/active_users`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY!}`,
        },
      }
    );
    if (activeUsersRes.ok) {
      const activeUsersData = await activeUsersRes.json();
      const activeConnections = activeUsersData.data ?? [];
      
      const isAlreadyConnected = activeConnections.some((c: any) => c.id === userId);
      if (activeConnections.length >= 10 && !isAlreadyConnected) {
        return NextResponse.json(
          { error: "Peak connections limit reached (max 10 users per room)" },
          { status: 403 }
        );
      }
    }
  } catch (err) {
    console.error("[liveblocks-auth] Failed to fetch active users count:", err);
  }

  // ── Issue a Liveblocks session token ─────────────────────────────────────

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name: userName },
  });

  // Grant full access to the requested room.
  // Board-level access control is enforced by the DB layer on the board page.
  // Here we allow any valid user/guest into any room so share links work.
  session.allow(room, session.FULL_ACCESS);

  const { status, body: responseBody } = await session.authorize();

  return new NextResponse(responseBody, { status });
}
