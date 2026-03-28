/**
 * Application-wide constants.
 * Centralized here to avoid magic strings/numbers scattered across the codebase.
 */

// ─── App Metadata ────────────────────────────────────────────────────────────

export const APP_NAME = "SketchBoard" as const;
export const APP_DESCRIPTION = "Real-time collaborative whiteboard — no sign-up required" as const;

// ─── Route Paths ─────────────────────────────────────────────────────────────
// Single source of truth for all routes. Use these instead of raw strings.

export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  DASHBOARD: "/dashboard",
  BOARD: (boardId: string) => `/board/${boardId}` as const,
  SETTINGS: "/settings",
  API: {
    BOARDS: "/api/boards",
    BOARD: (boardId: string) => `/api/boards/${boardId}` as const,
    UPLOAD: "/api/uploadthing",
    WEBHOOKS: {
      CLERK: "/api/webhooks/clerk",
      STRIPE: "/api/webhooks/stripe",
    },
  },
} as const;

// ─── Board Defaults ──────────────────────────────────────────────────────────

export const BOARD_DEFAULTS = {
  NAME: "Untitled Board",
  /** Canvas background color */
  BACKGROUND_COLOR: "#f8f9fa",
  /** Min zoom level (10%) */
  MIN_ZOOM: 0.1,
  /** Max zoom level (500%) */
  MAX_ZOOM: 5,
  /** Default zoom (100%) */
  DEFAULT_ZOOM: 1,
} as const;

// ─── Collaboration ───────────────────────────────────────────────────────────

export const COLLABORATION = {
  /** Debounce ms for persisting Yjs doc state to database */
  PERSISTENCE_DEBOUNCE_MS: 5000,
  /** Interval for saving board thumbnails */
  THUMBNAIL_SAVE_INTERVAL_MS: 30000,
  /** Max concurrent collaborators per board (free tier) */
  MAX_FREE_COLLABORATORS: 5,
  /** Throttle ms for cursor position broadcasts */
  CURSOR_THROTTLE_MS: 66, // ~15fps
  /** Idle timeout — dim cursor after this duration of no activity */
  IDLE_TIMEOUT_MS: 30000,
  /** Yjs Y.Map key name for tldraw records */
  RECORDS_MAP_KEY: "tl_records",
  /** PartyKit party name (must match partykit.json) */
  PARTY_NAME: "whiteboard",
} as const;

// ─── Tiers & Limits ─────────────────────────────────────────────────────────

export const TIERS = {
  FREE: {
    name: "Free",
    maxBoards: 3,
    maxTeamMembers: 5,
    maxStorageMB: 100,
  },
  PRO: {
    name: "Pro",
    maxBoards: -1, // unlimited
    maxTeamMembers: 20,
    maxStorageMB: 5120,
  },
  TEAM: {
    name: "Team",
    maxBoards: -1,
    maxTeamMembers: -1,
    maxStorageMB: -1,
  },
} as const;

// ─── Upload ──────────────────────────────────────────────────────────────────

export const UPLOAD = {
  /** Max file size per image upload (must match Uploadthing router maxFileSize) */
  MAX_FILE_SIZE_MB: 8,
  ACCEPTED_IMAGE_TYPES: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
} as const;

// ─── UI ──────────────────────────────────────────────────────────────────────

export const CURSOR_COLORS = [
  "#5b8a72", // sage
  "#b8860b", // amber
  "#7c6d8e", // lavender
  "#c47d5e", // terracotta
  "#5e8c9e", // teal
  "#9e7c5e", // sienna
  "#6b8f71", // moss
  "#8a6b7e", // mauve
] as const;
