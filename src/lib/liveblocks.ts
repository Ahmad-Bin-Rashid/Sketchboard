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
import { useConnectionStore } from "@/lib/sync/connection";

/**
 * Create a Liveblocks client using backend authentication.
 *
 * Uses /api/liveblocks-auth to authorize users and guests.
 * Restricts connection if room is full.
 */
export function createLiveblocksClient() {
  return createClient({
    authEndpoint: async (room) => {
      let guestId: string | undefined;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("sketchboard:guest");
          if (raw) {
            const parsed = JSON.parse(raw);
            guestId = parsed.guestId;
          }
        } catch {}
      }

      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room, guestId }),
      });

      if (response.status === 403) {
        useConnectionStore.getState().setStatus("full");
        throw new Error("Room connection limit reached (max 10 users)");
      }

      if (!response.ok) {
        throw new Error("Failed to authenticate with Liveblocks");
      }

      return await response.json();
    },
    throttle: 50,
  });
}
