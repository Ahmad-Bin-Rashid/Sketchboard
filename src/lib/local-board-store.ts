/**
 * Local board persistence for guest mode.
 *
 * Guest boards are saved as tldraw store snapshots in localStorage.
 * Each board gets its own key: "sketchboard:board:{boardId}".
 *
 * On reload: snapshot is loaded back into the tldraw editor.
 * On export: snapshot is the source data for the .whiteboard file.
 *
 * Storage limits:
 * - Soft warning: 3MB total guest board storage
 * - Hard block: 4.5MB (prevents hitting browser quota errors)
 * - Max single board snapshot: ~2MB recommended
 */

import type { TLEditorSnapshot } from "tldraw";

// ─── Constants ───────────────────────────────────────────────────────────────

const BOARD_KEY_PREFIX = "sketchboard:board:";
const BOARD_INDEX_KEY = "sketchboard:board-index";
const STORAGE_WARN_BYTES = 3 * 1024 * 1024;  // 3MB
const STORAGE_BLOCK_BYTES = 4.5 * 1024 * 1024; // 4.5MB

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocalBoardMeta {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
}

export interface SaveResult {
  ok: boolean;
  /** "warn" if approaching limit, "blocked" if over limit */
  status: "ok" | "warn" | "blocked";
  usedBytes: number;
}

// ─── Index management ────────────────────────────────────────────────────────
// We maintain a lightweight index so we can list boards without scanning all keys.

function readIndex(): LocalBoardMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOARD_INDEX_KEY);
    return raw ? (JSON.parse(raw) as LocalBoardMeta[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(index: LocalBoardMeta[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOARD_INDEX_KEY, JSON.stringify(index));
}

function upsertIndex(id: string, name: string): void {
  const index = readIndex();
  const existing = index.findIndex((b) => b.id === id);
  const meta: LocalBoardMeta = { id, name, savedAt: new Date().toISOString() };
  if (existing >= 0) {
    index[existing] = meta;
  } else {
    index.push(meta);
  }
  writeIndex(index);
}

function removeFromIndex(id: string): void {
  const index = readIndex().filter((b) => b.id !== id);
  writeIndex(index);
}

// ─── Storage usage ───────────────────────────────────────────────────────────

/**
 * Estimate total localStorage bytes used by guest boards.
 * Walks all sketchboard:board:* keys.
 */
export function getGuestStorageUsage(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BOARD_KEY_PREFIX)) {
      total += (localStorage.getItem(key) ?? "").length * 2; // UTF-16 → bytes approx
    }
  }
  return total;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Save a tldraw store snapshot for a guest board.
 * Returns a SaveResult indicating whether the operation succeeded
 * and whether the user is approaching or over storage limits.
 */
export function saveGuestBoard(
  boardId: string,
  snapshot: TLEditorSnapshot,
  boardName = "Untitled Board"
): SaveResult {
  if (typeof window === "undefined") {
    return { ok: false, status: "blocked", usedBytes: 0 };
  }

  const serialized = JSON.stringify(snapshot);
  const serializedBytes = serialized.length * 2;

  const currentUsage = getGuestStorageUsage();
  const existingKey = localStorage.getItem(BOARD_KEY_PREFIX + boardId);
  const existingBytes = existingKey ? existingKey.length * 2 : 0;
  const newTotal = currentUsage - existingBytes + serializedBytes;

  if (newTotal > STORAGE_BLOCK_BYTES) {
    return { ok: false, status: "blocked", usedBytes: newTotal };
  }

  try {
    localStorage.setItem(BOARD_KEY_PREFIX + boardId, serialized);
    upsertIndex(boardId, boardName);

    return {
      ok: true,
      status: newTotal > STORAGE_WARN_BYTES ? "warn" : "ok",
      usedBytes: newTotal,
    };
  } catch {
    // Quota exceeded at browser level
    return { ok: false, status: "blocked", usedBytes: newTotal };
  }
}

/**
 * Load a tldraw store snapshot from localStorage.
 * Returns null if no saved state exists for this board.
 */
export function loadGuestBoard(boardId: string): TLEditorSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOARD_KEY_PREFIX + boardId);
    if (!raw) return null;
    return JSON.parse(raw) as TLEditorSnapshot;
  } catch {
    return null;
  }
}

/**
 * Update only the board's display name in the index (not the snapshot).
 */
export function renameGuestBoard(boardId: string, name: string): void {
  upsertIndex(boardId, name);
}

/**
 * Delete a guest board from localStorage and the index.
 */
export function deleteGuestBoard(boardId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BOARD_KEY_PREFIX + boardId);
  removeFromIndex(boardId);
}

/**
 * List all locally saved boards (for the guest landing page).
 * Returns boards sorted by most recently saved first.
 */
export function listGuestBoards(): LocalBoardMeta[] {
  return readIndex().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

/**
 * Get metadata (name, savedAt) for a specific board by ID.
 * Returns null if the board has never been saved locally.
 */
export function getGuestBoardMeta(boardId: string): LocalBoardMeta | null {
  return readIndex().find((b) => b.id === boardId) ?? null;
}

