/**
 * User presence & awareness via Yjs awareness protocol.
 *
 * The awareness protocol is separate from document sync — it broadcasts
 * ephemeral state (cursor positions, user info, online status) that
 * doesn't need to be persisted.
 *
 * Architecture:
 * - Each user has a local awareness state that is broadcast to all peers
 * - The awareness provider (from y-partykit) handles network transport
 * - This module manages:
 *   1. Setting the local user's awareness state
 *   2. Subscribing to remote users' awareness updates
 *   3. Translating between awareness data and our app types
 *
 * Data flow:
 * Local cursor move → updateLocalCursor() → awareness.setLocalStateField()
 *   → y-partykit broadcasts → remote clients receive via awareness.on('change')
 *     → getRemoteUsers() returns updated list
 */

import type { CursorPresence, CollaboratorInfo } from "@/types";
import { CURSOR_COLORS } from "@/lib/constants";

// ─── Awareness interface ──────────────────────────────────────────────────────

/**
 * Minimal duck-typed Awareness interface.
 *
 * Both `y-protocols/awareness` (used by y-partykit) and the Liveblocks-internal
 * Awareness class (from @liveblocks/yjs) implement this surface.
 * We avoid importing from either package directly to prevent type conflicts.
 */
export interface AwarenessLike {
  getStates: () => Map<number, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLocalState: (state: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLocalStateField: (field: string, value: any) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

/**
 * Shape of the awareness state for each user.
 * This is what gets broadcast to all peers.
 */
export interface AwarenessUserState {
  /** User identity */
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    color: string;
  };
  /** Current cursor position on the canvas (null if not hovering) */
  cursor: {
    x: number;
    y: number;
  } | null;
  /** Whether the user is actively interacting */
  isActive: boolean;
  /** Timestamp of last activity */
  lastActiveAt: number;
}

export interface AwarenessManagerOptions {
  awareness: AwarenessLike;
  /** The Yjs document's clientID — used for self-identification in awareness states */
  clientID: number;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  /** Optional explicit cursor color. Falls back to deterministic color from clientId. */
  color?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Deterministically assign a cursor color based on the awareness client ID.
 * This ensures each user gets a consistent color across all peers.
 */
export function getCursorColor(clientId: number): string {
  return CURSOR_COLORS[clientId % CURSOR_COLORS.length];
}

// ─── Awareness Manager ──────────────────────────────────────────────────────

/**
 * Manages the local user's presence and provides access to remote users.
 *
 * Usage:
 * ```ts
 * const manager = new AwarenessManager({ awareness, userId, userName });
 * manager.updateCursor(100, 200);        // broadcast cursor position
 * manager.getRemoteUsers();              // get list of other users
 * manager.onRemoteChange(callback);      // subscribe to changes
 * manager.dispose();                     // cleanup
 * ```
 */
export class AwarenessManager {
  private readonly awareness: AwarenessLike;
  private readonly clientID: number;
  private readonly userId: string;
  private readonly userName: string;
  private readonly avatarUrl: string | null;
  private readonly color: string;
  private changeListeners: Set<() => void> = new Set();
  private isDisposed = false;

  constructor({ awareness, clientID, userId, userName, avatarUrl, color }: AwarenessManagerOptions) {
    this.awareness = awareness;
    this.clientID = clientID;
    this.userId = userId;
    this.userName = userName;
    this.avatarUrl = avatarUrl ?? null;
    this.color = color ?? getCursorColor(clientID);

    // Set initial local state
    this.setLocalState();

    // Forward awareness changes to our listeners
    this.awareness.on("change", this.handleAwarenessChange);
  }

  // ─── Local State ──────────────────────────────────────────────────

  /**
   * Set the full local awareness state.
   * Called on initialization and when user info changes.
   */
  private setLocalState(): void {
    const state: AwarenessUserState = {
      user: {
        id: this.userId,
        name: this.userName,
        avatarUrl: this.avatarUrl,
        color: this.color,
      },
      cursor: null,
      isActive: true,
      lastActiveAt: Date.now(),
    };
    this.awareness.setLocalState(state);
  }

  /**
   * Update the local cursor position.
   * Call this from a throttled pointermove handler on the canvas.
   *
   * @param x Canvas X coordinate
   * @param y Canvas Y coordinate
   */
  updateCursor(x: number, y: number): void {
    if (this.isDisposed) return;
    this.awareness.setLocalStateField("cursor", { x, y });
    this.awareness.setLocalStateField("lastActiveAt", Date.now());
    this.awareness.setLocalStateField("isActive", true);
  }

  /**
   * Clear the local cursor (e.g., when pointer leaves the canvas).
   */
  clearCursor(): void {
    if (this.isDisposed) return;
    this.awareness.setLocalStateField("cursor", null);
  }

  /**
   * Mark the local user as idle (no recent interaction).
   */
  markIdle(): void {
    if (this.isDisposed) return;
    this.awareness.setLocalStateField("isActive", false);
  }

  // ─── Remote State ─────────────────────────────────────────────────

  /**
   * Get all remote users' presence info (excluding self).
   * Returns CursorPresence objects for users with visible cursors,
   * and CollaboratorInfo for all connected users.
   */
  getRemoteUsers(): {
    cursors: CursorPresence[];
    collaborators: CollaboratorInfo[];
  } {
    const cursors: CursorPresence[] = [];
    const collaborators: CollaboratorInfo[] = [];

    this.awareness.getStates().forEach((state, clientId) => {
      // Skip self
      if (clientId === this.clientID) return;

      const awarenessState = state as AwarenessUserState;
      if (!awarenessState?.user) return;

      const { user, cursor, isActive } = awarenessState;

      collaborators.push({
        clientId,
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        color: user.color,
        isActive: isActive ?? true,
      });

      if (cursor) {
        cursors.push({
          clientId,
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          color: user.color,
          x: cursor.x,
          y: cursor.y,
        });
      }
    });

    return { cursors, collaborators };
  }

  /**
   * Get the total number of connected peers (including self).
   */
  getPeerCount(): number {
    return this.awareness.getStates().size;
  }

  // ─── Subscriptions ────────────────────────────────────────────────

  /**
   * Subscribe to remote awareness changes.
   * The callback fires whenever any user's presence state changes.
   *
   * @returns Unsubscribe function
   */
  onRemoteChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  private handleAwarenessChange = (): void => {
    for (const listener of this.changeListeners) {
      listener();
    }
  };

  // ─── Cleanup ──────────────────────────────────────────────────────

  /**
   * Dispose the awareness manager.
   * Removes the local state and unsubscribes from awareness events.
   */
  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.awareness.off("change", this.handleAwarenessChange);
    this.awareness.setLocalState(null);
    this.changeListeners.clear();
  }
}
