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
 * Lifecycle:
 * - On mount: connect to PartyKit room, start sync
 * - During use: changes flow bidirectionally in real-time
 * - On unmount: disconnect, dispose all managers, clean up
 *
 * Usage:
 * ```tsx
 * function WhiteboardCanvas({ boardId }: { boardId: string }) {
 *   const { awareness, connectionStatus } = useYjsSync({
 *     boardId,
 *     editor,
 *     userId: "user_123",
 *     userName: "Alice",
 *   });
 *   // awareness and connectionStatus are available for UI
 * }
 * ```
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import YPartyKitProvider from "y-partykit/provider";
import type { Editor } from "tldraw";

import { TldrawYjsSync } from "@/lib/sync/tldraw-yjs-sync";
import { AwarenessManager } from "@/lib/sync/awareness";
import { useConnectionStore, type ConnectionStatus } from "@/lib/sync/connection";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  /** Whether to enable collaboration (false = local-only mode) */
  enabled?: boolean;
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

/**
 * Get the PartyKit host URL from environment variables.
 * Falls back to localhost:1999 for development.
 */
function getPartyKitHost(): string {
  return (
    process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999"
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useYjsSync({
  boardId,
  editor,
  userId,
  userName,
  avatarUrl,
  enabled = true,
}: UseYjsSyncOptions): UseYjsSyncReturn {
  // Refs for cleanup-safe access to mutable objects
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<YPartyKitProvider | null>(null);
  const syncRef = useRef<TldrawYjsSync | null>(null);
  const awarenessManagerRef = useRef<AwarenessManager | null>(null);

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
    // Dispose in reverse order of creation
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
    // Don't connect until we have an editor instance
    if (!editor || !enabled) {
      cleanup();
      return;
    }

    const host = getPartyKitHost();

    // 1. Create Yjs document
    const doc = new Y.Doc();
    docRef.current = doc;

    // 2. Connect to PartyKit via y-partykit WebsocketProvider
    //    The provider handles: WebSocket connection, Yjs sync protocol,
    //    reconnection with exponential backoff, awareness transport
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

    // Track sync completion
    const handleSync = (synced: boolean) => {
      if (synced) {
        setIsSynced(true);

        // 4. Create the tldraw ↔ Yjs sync bridge AFTER initial sync
        if (!syncRef.current) {
          syncRef.current = new TldrawYjsSync({ doc, editor });
        }

        // 5. Create awareness manager AFTER initial sync
        if (!awarenessManagerRef.current) {
          const manager = new AwarenessManager({
            awareness: provider.awareness,
            userId,
            userName,
            avatarUrl,
          });
          awarenessManagerRef.current = manager;
          setAwarenessManager(manager);

          // Track peer count changes
          const unsubPeers = manager.onRemoteChange(() => {
            setPeerCount(manager.getPeerCount());
          });

          // Set initial peer count
          setPeerCount(manager.getPeerCount());

          // Store unsubscribe for cleanup
          (manager as unknown as Record<string, unknown>).__unsubPeers =
            unsubPeers;
        }
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

      // Unsubscribe peer count listener
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
