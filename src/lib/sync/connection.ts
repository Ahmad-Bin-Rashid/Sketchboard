/**
 * WebSocket connection status management.
 *
 * Provides a reactive connection state that components can subscribe to
 * for showing connection indicators (connected, connecting, disconnected).
 *
 * Architecture:
 * - Uses zustand for minimal reactive state
 * - Updated by the useYjsSync hook when the WebSocket provider status changes
 * - Consumed by UI components (connection indicator, board header, etc.)
 */

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface ConnectionState {
  /** Current WebSocket connection status */
  status: ConnectionStatus;
  /** Number of connected peers (other users in the same room) */
  peerCount: number;
  /** Timestamp of last successful sync */
  lastSyncedAt: number | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setPeerCount: (count: number) => void;
  markSynced: () => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  reset: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const initialState = {
  status: "disconnected" as ConnectionStatus,
  peerCount: 0,
  lastSyncedAt: null as number | null,
  reconnectAttempts: 0,
};

/**
 * Global connection state store.
 *
 * Usage in components:
 * ```ts
 * const status = useConnectionStore((s) => s.status);
 * const peerCount = useConnectionStore((s) => s.peerCount);
 * ```
 */
export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,

  setStatus: (status) =>
    set((state) => {
      // Reset reconnect attempts on successful connection
      if (status === "connected" && state.status !== "connected") {
        return { status, reconnectAttempts: 0, lastSyncedAt: Date.now() };
      }
      return { status };
    }),

  setPeerCount: (peerCount) => set({ peerCount }),

  markSynced: () => set({ lastSyncedAt: Date.now() }),

  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  reset: () => set(initialState),
}));

// ─── Derived Helpers ─────────────────────────────────────────────────────────

/**
 * Get a human-readable label for the connection status.
 * Used in UI components like the connection indicator.
 */
export function getConnectionLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "disconnected":
      return "Offline";
  }
}

/**
 * Get the CSS color class for a connection status.
 * Maps to our calm/natural design tokens.
 */
export function getConnectionColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "text-emerald-600";
    case "connecting":
      return "text-amber-500";
    case "disconnected":
      return "text-red-400";
  }
}

/**
 * Get the dot indicator color for the connection status badge.
 */
export function getConnectionDotColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-amber-400";
    case "disconnected":
      return "bg-red-400";
  }
}
