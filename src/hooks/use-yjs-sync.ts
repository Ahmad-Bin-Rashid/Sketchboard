"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import * as Y from "yjs";
import { getYjsProviderForRoom } from "@liveblocks/yjs";

import { createLiveblocksClient } from "@/lib/liveblocks";
import { AwarenessManager } from "@/lib/sync/awareness";
import { useConnectionStore, type ConnectionStatus } from "@/lib/sync/connection";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { loadGuestBoard, saveGuestBoard, deleteGuestBoard } from "@/lib/local-board-store";
import { getLocalMediaShapes } from "@/lib/board-actions";
import type { CustomShape } from "@/types/whiteboard";

export type WhiteboardMode = "guest" | "auth";

export interface UseYjsSyncOptions {
  boardId: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  userColor?: string;
  enabled?: boolean;
  mode?: WhiteboardMode;
  boardName?: string;
  editor?: any; // Temporary field for phase transition compilation
}

export interface UseYjsSyncReturn {
  shapesMap: Y.Map<CustomShape> | null;
  undoManager: Y.UndoManager | null;
  awarenessManager: AwarenessManager | null;
  connectionStatus: ConnectionStatus;
  peerCount: number;
  isSynced: boolean;
}

export function useYjsSync({
  boardId,
  userId,
  userName,
  avatarUrl,
  userColor,
  enabled = true,
  mode = "guest",
  boardName = "Untitled Board",
}: UseYjsSyncOptions): UseYjsSyncReturn {
  const awarenessManagerRef = useRef<AwarenessManager | null>(null);
  const leaveRoomRef = useRef<(() => void) | null>(null);

  const [shapesMap, setShapesMap] = useState<Y.Map<CustomShape> | null>(null);
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null);
  const [awarenessManager, setAwarenessManager] = useState<AwarenessManager | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  const connectionStatus = useConnectionStore((s) => s.status);
  const peerCount = useConnectionStore((s) => s.peerCount);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setPeerCount = useConnectionStore((s) => s.setPeerCount);
  const reset = useConnectionStore((s) => s.reset);

  const liveblocksClient = useMemo(() => createLiveblocksClient(), []);

  const cleanup = useCallback(() => {
    awarenessManagerRef.current?.dispose();
    awarenessManagerRef.current = null;
    setAwarenessManager(null);

    leaveRoomRef.current?.();
    leaveRoomRef.current = null;

    setShapesMap(null);
    setUndoManager(null);
    setIsSynced(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    // 1. Enter the Liveblocks room
    const { room, leave } = liveblocksClient.enterRoom(boardId, {
      initialPresence: {},
    });
    leaveRoomRef.current = leave;

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

    // 2. Get Yjs provider and doc
    const yProvider = getYjsProviderForRoom(room);
    const doc = yProvider.getYDoc();
    const map = doc.getMap<CustomShape>("shapes");
    setShapesMap(map);

    // Create UndoManager scoped to the shapes map
    const manager = new Y.UndoManager(map);
    setUndoManager(manager);

    // 3. Handle initial sync
    const handleSync = (synced: boolean) => {
      if (!synced) return;
      setIsSynced(true);

      try {
        // Hydrate Zustand with initial shapes merged with local media shapes
        const initialShapes: Record<string, CustomShape> = {};
        map.forEach((shape, id) => {
          initialShapes[id] = shape;
        });
        const localMedia = getLocalMediaShapes(boardId);
        const merged = { ...initialShapes, ...localMedia };
        useWhiteboardStore.getState().setShapes(merged);

        // Guest mode: restore local storage snapshot on initial connection if empty
        if (mode === "guest") {
          const saved = loadGuestBoard(boardId);
          if (saved && saved.length > 0 && map.size === 0) {
            doc.transact(() => {
              saved.forEach((shape) => {
                map.set(shape.id, shape);
              });
            });
            // Update Zustand immediately
            const restoredShapes: Record<string, CustomShape> = {};
            saved.forEach((shape) => {
              restoredShapes[shape.id] = shape;
            });
            useWhiteboardStore.getState().setShapes(restoredShapes);
          }
        } else if (mode === "auth") {
          const params = new URLSearchParams(window.location.search);
          const importLocalId = params.get("importLocal");
          if (importLocalId && map.size === 0) {
            const saved = loadGuestBoard(importLocalId);
            if (saved && saved.length > 0) {
              doc.transact(() => {
                saved.forEach((shape) => {
                  map.set(shape.id, shape);
                });
              });
              deleteGuestBoard(importLocalId);
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }
        }

        // Create awareness manager
        if (!awarenessManagerRef.current) {
          const am = new AwarenessManager({
            awareness: yProvider.awareness as unknown as import("@/lib/sync/awareness").AwarenessLike,
            clientID: doc.clientID,
            userId,
            userName,
            avatarUrl,
            ...(userColor ? { color: userColor } : {}),
          });
          awarenessManagerRef.current = am;
          setAwarenessManager(am);

          const unsubPeers = am.onRemoteChange(() => {
            setPeerCount(am.getPeerCount());
          });
          setPeerCount(am.getPeerCount());
          (am as any).__unsubPeers = unsubPeers;
        }
      } catch (err) {
        console.error("[useYjsSync] Error inside handleSync:", err);
      }
    };

    yProvider.on("sync", handleSync);

    // Observe changes on the shared Yjs Map to sync updates into Zustand
    const handleMapObserve = () => {
      const updatedShapes: Record<string, CustomShape> = {};
      map.forEach((shape, id) => {
        updatedShapes[id] = shape;
      });
      const localMedia = getLocalMediaShapes(boardId);
      const merged = { ...updatedShapes, ...localMedia };
      useWhiteboardStore.getState().setShapes(merged);
    };
    map.observe(handleMapObserve);

    if (yProvider.synced) {
      handleSync(true);
    }

    return () => {
      unsubStatus();
      yProvider.off("sync", handleSync);
      map.unobserve(handleMapObserve);

      const unsubPeers = (awarenessManagerRef.current as any)?.__unsubPeers;
      if (unsubPeers) unsubPeers();

      cleanup();
    };
  }, [boardId, enabled, userId, userName, avatarUrl, userColor, mode, liveblocksClient, cleanup, setStatus, setPeerCount]);

  // Guest mode auto-save to localStorage
  useEffect(() => {
    if (mode !== "guest" || !isSynced) return;

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let lastShapes = useWhiteboardStore.getState().shapes;

    // Subscribe to Zustand shapes changes
    const unsubStore = useWhiteboardStore.subscribe((state) => {
      const currentShapes = state.shapes;
      if (currentShapes === lastShapes) return;
      lastShapes = currentShapes;

      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveGuestBoard(boardId, Object.values(currentShapes), boardName);
      }, 2000);
    });

    return () => {
      unsubStore();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [boardId, boardName, mode, isSynced]);

  return {
    shapesMap,
    undoManager,
    awarenessManager,
    connectionStatus,
    peerCount,
    isSynced,
  };
}
