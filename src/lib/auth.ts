/**
 * Clerk auth utility functions for server-side use.
 *
 * Provides helpers for getting current user data in server components
 * and API routes with consistent error handling.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated user's database record.
 * Creates the user record in DB if it doesn't exist yet (first sign-in).
 *
 * @throws Redirects to sign-in if not authenticated
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Try to find existing user in our DB
  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (existingUser) {
    return existingUser;
  }

  // User doesn't exist in our DB yet — create from Clerk data
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name:
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        "Anonymous",
      avatarUrl: clerkUser.imageUrl,
    })
    .returning();

  return newUser;
}

/**
 * Get the current user's Clerk ID without a database lookup.
 * Lightweight — use when you only need the ID for authorization checks.
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
