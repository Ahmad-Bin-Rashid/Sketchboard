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
  LANDING: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  HOME: "/home",
  BOARD: (boardId: string) => `/board/${boardId}` as const,
  SETTINGS: "/settings",
  MEDIA: "/media",
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
    maxStorageMB: 20,
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
  ACCEPTED_IMAGE_TYPES: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "video/ogg"
  ],
  /** Max storage space in bytes/MB for local browser fallback */
  MAX_LOCAL_STORAGE_MB: 5,
} as const;

export const UPLOAD_LIMITS = {
  GUEST: 5 * 1024 * 1024, // 5MB limit for guest users
  AUTH: 20 * 1024 * 1024, // 20MB cloud limit for auth users
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

// ─── Shape Defaults ──────────────────────────────────────────────────────────

export const SHAPE_DEFAULTS = {
  STROKE: "#78716c", // default warm stone color
  STICKY_FILL: "#fef9c3", // default yellow sticky note
  STICKY_STROKE: "#1e293b",
  GRID_SIZE: 10,
  DEFAULT_TEXT_WIDTH: 160,
  DEFAULT_TEXT_HEIGHT: 40,
  DEFAULT_STICKY_HEIGHT: 120,
  DEFAULT_IMAGE_SIZE: 200,
  FONT_SIZE: 20,
  FONT_FAMILY: 'var(--font-shantell-sans), "Shantell Sans", cursive',
  BORDER_RADIUS: 4,
  SHADOW_BLUR: 8,
  SHADOW_SPREAD: 4,
} as const;

export const PRESET_COLORS = [
  // Row 1: Blacks/Whites
  "#ffffff", "#e7e5e4", "#78716c", "#1c1917",
  // Row 2: Reds/Pinks
  "#fca5a5", "#ef4444", "#b91c1c", "#ec4899",
  // Row 3: Oranges/Yellows
  "#fed7aa", "#f97316", "#f59e0b", "#eab308",
  // Row 4: Greens
  "#84cc16", "#829c87", "#15803d", "#0d9488",
  // Row 5: Blues/Purples
  "#38bdf8", "#2563eb", "#4f46e5", "#7c3aed",
] as const;

export const FONT_FAMILIES = [
  { name: "Handwriting", value: 'var(--font-shantell-sans), "Shantell Sans", cursive' },
  { name: "Sans Serif", value: 'var(--font-inter), "Inter", sans-serif' },
  { name: "Serif", value: 'Georgia, serif' },
  { name: "Monospace", value: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace' },
] as const;


