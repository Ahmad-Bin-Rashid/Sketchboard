/**
 * Guest identity management.
 *
 * Guest users get a persistent anonymous identity stored in localStorage.
 * This identity is used for:
 * - Display name shown to other collaborators
 * - Cursor color in the collaborative canvas
 * - Unique ID used in awareness protocol (not tied to any DB user)
 *
 * Storage key: "sketchboard:guest"
 *
 * Guest IDs are prefixed with "guest_" so the server/app can distinguish
 * them from real auth user IDs (UUIDs from Clerk).
 */

import { nanoid } from "nanoid";
import { CURSOR_COLORS } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuestIdentity {
  /** Stable guest ID, e.g. "guest_xK7mP2qR" */
  guestId: string;
  /** User-chosen display name */
  guestName: string;
  /** Assigned cursor color from CURSOR_COLORS palette */
  guestColor: string;
}

// ─── Storage key ─────────────────────────────────────────────────────────────

const GUEST_STORAGE_KEY = "sketchboard:guest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomColor(): string {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

function randomGuestName(): string {
  const adjectives = [
    "Swift", "Calm", "Bold", "Kind", "Wise",
    "Bright", "Quiet", "Eager", "Loyal", "Witty",
  ];
  const nouns = [
    "Panda", "Falcon", "Otter", "Bison", "Crane",
    "Finch", "Moose", "Raven", "Viper", "Gecko",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the current guest identity from localStorage.
 * Creates a new identity if none exists.
 *
 * Safe to call during SSR — returns a default identity when localStorage
 * is not available (will be replaced on first client render).
 */
export function getGuestIdentity(): GuestIdentity {
  if (typeof window === "undefined") {
    // SSR fallback — never persisted
    return {
      guestId: "guest_ssr",
      guestName: "Guest",
      guestColor: CURSOR_COLORS[0],
    };
  }

  const raw = localStorage.getItem(GUEST_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GuestIdentity;
      if (parsed.guestId && parsed.guestName && parsed.guestColor) {
        return parsed;
      }
    } catch {
      // Corrupted — fall through to create new
    }
  }

  return createGuestIdentity();
}

/**
 * Create and persist a brand-new guest identity.
 * Overwrites any existing identity in localStorage.
 */
export function createGuestIdentity(): GuestIdentity {
  const identity: GuestIdentity = {
    guestId: `guest_${nanoid(8)}`,
    guestName: randomGuestName(),
    guestColor: randomColor(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(identity));
  }

  return identity;
}

/**
 * Update the guest's display name.
 * Preserves existing guestId and guestColor.
 */
export function setGuestName(name: string): GuestIdentity {
  const current = getGuestIdentity();
  const updated: GuestIdentity = { ...current, guestName: name.trim() || current.guestName };

  if (typeof window !== "undefined") {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
  }

  return updated;
}

/**
 * Check if the user has explicitly set their name
 * (i.e., has seen and submitted the name prompt).
 */
export function hasSetGuestName(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(GUEST_STORAGE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as GuestIdentity & { nameSet?: boolean };
    return parsed.nameSet === true;
  } catch {
    return false;
  }
}

/**
 * Mark that the user has explicitly set their name
 * (called after submitting the GuestNameModal).
 */
export function markGuestNameSet(): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(GUEST_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...parsed, nameSet: true }));
  } catch {
    // ignore
  }
}
