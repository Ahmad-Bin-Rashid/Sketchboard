/**
 * useYjsSync — real-time collaboration hook using Liveblocks + Yjs.
 *
 * Replaces the previous PartyKit (y-partykit) transport with Liveblocks.
 * The CRDT layer (TldrawYjsSync) and awareness layer (AwarenessManager)
 * are completely unchanged — only the WebSocket provider changes.
 *
 * Architecture:
 * - Liveblocks Room → getYjsProviderForRoom → Y.Doc → TldrawYjsSync → tldraw
 * - Liveblocks Room → getYjsProviderForRoom → awareness → AwarenessManager
 *
 * Liveblocks v3 API (recommended pattern):
 * - `client.enterRoom(roomId, opts)` → `{ room, leave }`
 * - `getYjsProviderForRoom(room)` — the recommended way to get the Yjs provider.
 *   It manages the provider lifecycle automatically and avoids issues with
 *   dynamically switching between rooms (unlike `new LiveblocksYjsProvider()`).
 * - `yProvider.getYDoc()` — get the internally managed Y.Doc
 * - `yProvider.awareness` — the awareness instance
 *
 * Lifecycle:
 * - On mount: enter Liveblocks room, get Yjs provider via getYjsProviderForRoom
 * - Guest mode: restore saved snapshot into tldraw on first sync
 * - Guest mode: auto-save to localStorage on store changes (debounced 2s)
 * - On unmount: call leave(), clean up
 */

"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import type { Editor } from "tldraw";

import { createLiveblocksClient } from "@/lib/liveblocks";
import { TldrawYjsSync } from "@/lib/sync/tldraw-yjs-sync";
import { AwarenessManager } from "@/lib/sync/awareness";
import { useConnectionStore, type ConnectionStatus } from "@/lib/sync/connection";
import { loadGuestBoard, saveGuestBoard, deleteGuestBoard } from "@/lib/local-board-store";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WhiteboardMode = "guest" | "auth";

export interface UseYjsSyncOptions {
  /** Board ID — used as the Liveblocks room name */
  boardId: string;
  /** tldraw Editor instance (available after onMount) */
  editor: Editor | null;
  /** Current user's ID */
  userId: string;
  /** Current user's display name */
  userName: string;
  /** Current user's avatar URL */
  avatarUrl?: string | null;
  /** Current user's cursor color */
  userColor?: string;
  /** Whether to enable collaboration (false = local-only mode) */
  enabled?: boolean;
  /**
   * "guest": localStorage persistence, no DB
   * "auth":  DB persistence (handled separately)
   */
  mode?: WhiteboardMode;
  /** Current board name (used for localStorage save label in guest mode) */
  boardName?: string;
}

export interface UseYjsSyncReturn {
  /** Awareness manager for cursor/presence APIs */
  awarenessManager: AwarenessManager | null;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Number of connected peers (including self) */
  peerCount: number;
  /** Whether initial sync is complete */
  isSynced: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useYjsSync({
  boardId,
  editor,
  userId,
  userName,
  avatarUrl,
  userColor,
  enabled = true,
  mode = "guest",
  boardName = "Untitled Board",
}: UseYjsSyncOptions): UseYjsSyncReturn {
  // Refs for cleanup-safe access to mutable objects
  const syncRef = useRef<TldrawYjsSync | null>(null);
  const awarenessManagerRef = useRef<AwarenessManager | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `leave` function returned by client.enterRoom — called on cleanup
  const leaveRoomRef = useRef<(() => void) | null>(null);

  // Local state
  const [awarenessManager, setAwarenessManager] =
    useState<AwarenessManager | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  // Connection store
  const connectionStatus = useConnectionStore((s) => s.status);
  const peerCount = useConnectionStore((s) => s.peerCount);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setPeerCount = useConnectionStore((s) => s.setPeerCount);
  const reset = useConnectionStore((s) => s.reset);

  /**
   * Liveblocks client — memoized so the same instance is reused across
   * re-renders. Creating a new client on every render would open duplicate
   * WebSocket connections.
   */
  const liveblocksClient = useMemo(() => createLiveblocksClient(), []);

  /**
   * Clean up all collaboration resources.
   * Called on unmount or when key deps change.
   */
  const cleanup = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    syncRef.current?.dispose();
    syncRef.current = null;

    awarenessManagerRef.current?.dispose();
    awarenessManagerRef.current = null;
    setAwarenessManager(null);

    // Leave the Liveblocks room (frees WebSocket connection).
    // getYjsProviderForRoom automatically cleans up the provider when the room
    // is destroyed, so we only need to call leave() here.
    leaveRoomRef.current?.();
    leaveRoomRef.current = null;

    setIsSynced(false);
    reset();
  }, [reset]);

  /**
   * Main effect: set up the full collaboration stack.
   *
   * Dependencies: boardId, editor, enabled
   * When any of these change, we tear down and rebuild.
   */
  useEffect(() => {
    if (!editor || !enabled) {
      cleanup();
      return;
    }

    // ── 1. Enter the Liveblocks room ──────────────────────────────────────
    // One room per board ID. Uses the memoized client so we don't create
    // duplicate connections on re-renders.
    //
    // Liveblocks v3 API: enterRoom returns { room, leave }
    const { room, leave } = liveblocksClient.enterRoom(boardId, {
      initialPresence: {},
    });
    leaveRoomRef.current = leave;

    // Track connection status via room events
    setStatus("connecting");

    const unsubStatus = room.subscribe("status", (status) => {
      switch (status) {
        case "connected":
          setStatus("connected");
          break;
        case "reconnecting":
          setStatus("connecting");
          break;
        case "disconnected":
          setStatus("disconnected");
          break;
      }
    });

    // ── 2. Get the Yjs provider via getYjsProviderForRoom ─────────────────
    // This is the recommended Liveblocks v3 approach. It:
    // - Creates or returns an existing LiveblocksYjsProvider for this room
    // - Internally manages the Y.Doc (setting clientID = room connectionId)
    // - Automatically destroys the provider when the room is destroyed
    //   (so we don't need to call provider.destroy() ourselves)
    //
    // NOTE: Do NOT pass an external Y.Doc — let the provider manage it via
    // getYjsProviderForRoom, then retrieve the doc with yProvider.getYDoc().
    const yProvider = getYjsProviderForRoom(room);

    // Get the internally-managed Y.Doc (clientID is already set correctly)
    const doc = yProvider.getYDoc();

    // ── 3. Handle initial sync ────────────────────────────────────────────
    const handleSync = (synced: boolean) => {
      if (!synced) return;
      console.log("[useYjsSync] Sync event fired. yProvider.awareness:", !!yProvider.awareness, "doc.clientID:", doc?.clientID);
      setIsSynced(true);

      try {
        // 3a. Restore guest localStorage snapshot BEFORE wiring tldraw sync
        if (mode === "guest") {
          const saved = loadGuestBoard(boardId);
          if (saved) {
            try {
              editor.loadSnapshot(saved);
            } catch (err) {
              console.error("[useYjsSync] Failed to load snapshot:", err);
            }
          }
        } else if (mode === "auth") {
          // Check if we need to seed the board from a guest local storage board
          const params = new URLSearchParams(window.location.search);
          const importLocalId = params.get("importLocal");
          if (importLocalId) {
            const saved = loadGuestBoard(importLocalId);
            if (saved) {
              try {
                editor.loadSnapshot(saved);
                console.log("[useYjsSync] Imported local storage board:", importLocalId);
                // Clean up the local storage board and clear query params
                deleteGuestBoard(importLocalId);
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
              } catch (err) {
                console.error("[useYjsSync] Failed to import local board snapshot:", err);
              }
            }
          }
        }

        // 3b. Wire tldraw ↔ Yjs sync bridge (unchanged from PartyKit version)
        if (!syncRef.current) {
          console.log("[useYjsSync] Instantiating TldrawYjsSync");
          syncRef.current = new TldrawYjsSync({ doc, editor });
        }

        // 3c. Create awareness manager (unchanged — same awareness API)
        if (!awarenessManagerRef.current) {
          if (!yProvider.awareness) {
            console.error("[useYjsSync] yProvider.awareness is missing!");
          }
          console.log("[useYjsSync] Instantiating AwarenessManager with clientID:", doc.clientID);
          const manager = new AwarenessManager({
            awareness: yProvider.awareness as unknown as import("@/lib/sync/awareness").AwarenessLike,
            clientID: doc.clientID,
            userId,
            userName,
            avatarUrl,
            ...(userColor ? { color: userColor } : {}),
          });
          awarenessManagerRef.current = manager;
          setAwarenessManager(manager);

          // Track peer count changes
          const unsubPeers = manager.onRemoteChange(() => {
            setPeerCount(manager.getPeerCount());
          });
          setPeerCount(manager.getPeerCount());
          (manager as unknown as Record<string, unknown>).__unsubPeers = unsubPeers;
        }
      } catch (err) {
        console.error("[useYjsSync] Uncaught error inside handleSync:", err);
      }
    };

      // 3d. Guest mode: auto-save to localStorage on store changes (debounced 2s)
      if (mode === "guest") {
        const unsubStore = editor.store.listen(
          () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
              const snapshot = editor.getSnapshot();
              saveGuestBoard(boardId, snapshot, boardName);
            }, 2000);
          },
          { source: "all", scope: "document" }
        );
        (yProvider as unknown as Record<string, unknown>).__unsubStore = unsubStore;
      }

    // LiveblocksYjsProvider fires "sync" just like y-partykit
    yProvider.on("sync", handleSync);

    // If already synced (e.g., reconnection), trigger immediately
    if (yProvider.synced) {
      handleSync(true);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      unsubStatus();
      yProvider.off("sync", handleSync);

      const unsubStore = (yProvider as unknown as Record<string, unknown>)
        .__unsubStore as (() => void) | undefined;
      unsubStore?.();

      const unsubPeers = (
        awarenessManagerRef.current as unknown as Record<string, unknown>
      )?.__unsubPeers as (() => void) | undefined;
      unsubPeers?.();

      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, editor, enabled]);

  return {
    awarenessManager,
    connectionStatus,
    peerCount,
    isSynced,
  };
}
