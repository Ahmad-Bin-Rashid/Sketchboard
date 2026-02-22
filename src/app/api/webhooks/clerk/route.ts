/**
 * Clerk webhook handler.
 *
 * Syncs Clerk user events to our database:
 * - user.created: Create user record
 * - user.updated: Update user record
 * - user.deleted: Delete user record
 *
 * Setup:
 * 1. In Clerk dashboard, create a webhook endpoint pointing to /api/webhooks/clerk
 * 2. Set the signing secret in CLERK_WEBHOOK_SECRET env var
 * 3. Subscribe to user.created, user.updated, user.deleted events
 */

import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Implement webhook verification and handling in Phase 6
  // Will use svix for webhook signature verification
  return NextResponse.json({ received: true });
}
