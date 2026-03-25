/**
 * useYjsSync — React hook for real-time collaborative sync.
 *
 * Orchestrates the full collaboration stack:
 * 1. Creates a Yjs document (Y.Doc)
 * 2. Connects to PartyKit via y-partykit WebsocketProvider
 * 3. Wires up TldrawYjsSync (tldraw Store ↔ Y.Doc bridge)
 * 4. Manages AwarenessManager for cursor/presence broadcasting
 * 5. Tracks connection status in the global store
 *
 * Two modes:
 * - "guest": localStorage save/restore; no DB; board state survives reload
 * - "auth":  DB persistence via PartyKit; no localStorage
 *
 * Lifecycle:
 * - On mount: connect to PartyKit room, start sync
 * - Guest mode: restore saved snapshot into tldraw on first sync
 * - Guest mode: auto-save to localStorage on store changes (debounced 2s)
 * - On unmount: disconnect, dispose all managers, clean up
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import YPartyKitProvider from "y-partykit/provider";
import type { Editor } from "tldraw";

import { TldrawYjsSync } from "@/lib/sync/tldraw-yjs-sync";
import { AwarenessManager } from "@/lib/sync/awareness";
import { useConnectionStore, type ConnectionStatus } from "@/lib/sync/connection";
import { loadGuestBoard, saveGuestBoard } from "@/lib/local-board-store";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WhiteboardMode = "guest" | "auth";

export interface UseYjsSyncOptions {
  /** Board ID — used as the PartyKit room name */
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
   * "auth":  DB persistence via PartyKit server callbacks
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

// ─── Configuration ───────────────────────────────────────────────────────────

function getPartyKitHost(): string {
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";
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
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<YPartyKitProvider | null>(null);
  const syncRef = useRef<TldrawYjsSync | null>(null);
  const awarenessManagerRef = useRef<AwarenessManager | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    providerRef.current?.disconnect();
    providerRef.current?.destroy();
    providerRef.current = null;

    docRef.current?.destroy();
    docRef.current = null;

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

    const host = getPartyKitHost();

    // 1. Create Yjs document
    const doc = new Y.Doc();
    docRef.current = doc;

    // 2. Connect to PartyKit via y-partykit WebsocketProvider
    const provider = new YPartyKitProvider(host, boardId, doc, {
      connect: true,
      party: "whiteboard",
    });
    providerRef.current = provider;

    // 3. Track connection status
    const handleStatus = ({ status }: { status: string }) => {
      switch (status) {
        case "connected":
          setStatus("connected");
          break;
        case "connecting":
          setStatus("connecting");
          break;
        case "disconnected":
          setStatus("disconnected");
          break;
      }
    };
    provider.on("status", handleStatus);

    // 4. Handle initial sync
    const handleSync = (synced: boolean) => {
      if (!synced) return;
      setIsSynced(true);

      // 4a. Restore guest localStorage snapshot BEFORE wiring tldraw sync
      if (mode === "guest") {
        const saved = loadGuestBoard(boardId);
        if (saved) {
          try {
            editor.loadSnapshot(saved);
          } catch {
            // Snapshot may be incompatible (e.g., tldraw version change) — ignore
          }
        }
      }

      // 4b. Wire tldraw ↔ Yjs sync bridge
      if (!syncRef.current) {
        syncRef.current = new TldrawYjsSync({ doc, editor });
      }

      // 4c. Create awareness manager
      if (!awarenessManagerRef.current) {
        const manager = new AwarenessManager({
          awareness: provider.awareness,
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

      // 4d. Guest mode: auto-save to localStorage on store changes (debounced 2s)
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
        (provider as unknown as Record<string, unknown>).__unsubStore = unsubStore;
      }
    };

    provider.on("sync", handleSync);

    // If already synced (e.g., reconnection), trigger immediately
    if (provider.synced) {
      handleSync(true);
    }

    // Cleanup on unmount or dep change
    return () => {
      provider.off("status", handleStatus);
      provider.off("sync", handleSync);

      const unsubStore = (provider as unknown as Record<string, unknown>)
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
