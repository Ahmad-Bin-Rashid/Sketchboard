/**
 * Liveblocks client singleton.
 *
 * Uses the PUBLIC key (no auth endpoint) for room connections.
 * This is architecturally correct for our use case:
 *
 * - Guest boards: share-link access via nanoid board IDs (unguessable)
 * - Auth boards: access control is enforced at the page level in page.tsx
 *   (server component redirects to dashboard if user has no DB access)
 *
 * Board IDs are 10-character nanoid strings (~3.7×10^15 possible values),
 * making them effectively unguessable without a share link.
 *
 * Free tier: 50 MAU, unlimited rooms.
 * See https://liveblocks.io/pricing
 */

import { createClient } from "@liveblocks/client";

/**
 * Create a Liveblocks client using the public key.
 *
 * No auth endpoint needed — the public key grants access to all rooms
 * without server-side token generation. This eliminates the auth retry loop
 * that occurs when using `prepareSession` (access tokens) with the v3 SDK.
 *
 * Memoize this in the calling hook with useMemo to avoid recreating on every
 * render.
 */
export function createLiveblocksClient() {
  const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

  if (!publicApiKey || publicApiKey.startsWith("pk_dev_placeholder")) {
    console.warn(
      "[Liveblocks] NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is not configured. " +
        "Real-time collaboration will not work. " +
        "Get a key from liveblocks.io/dashboard"
    );
  }

  return createClient({
    publicApiKey: publicApiKey ?? "pk_dev_placeholder",
    throttle: 50,
  });
}
