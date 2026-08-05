"use client";

/**
 * Main Whiteboard component — wraps custom canvas with real-time collaboration.
 *
 * Supports two modes:
 *
 * Guest mode ("guest"):
 * - Guest identity loaded from localStorage (guestId, guestName, guestColor)
 * - Board state auto-saved to localStorage on changes (debounced 2s)
 * - GuestNameModal shown on first visit
 * - Export/import via BoardHeader
 * - Images: stored as base64 data URLs inline (no CDN)
 *
 * Auth mode ("auth"):
 * - Real userId/userName/avatarUrl from Clerk session (passed via props)
 * - Board state persisted to DB via PartyKit (Phase 8)
 * - Full dashboard access
 * - Images: uploaded to Uploadthing CDN, recorded in DB
 */

import { useCallback, useEffect, useState, useRef } from "react";

import { useYjsSync, useUndoRedo, useCursorBroadcast, useActiveUsers, type WhiteboardMode } from "@/hooks";
import { getGuestIdentity, hasSetGuestName } from "@/lib/guest";
import { renameGuestBoard, getGuestBoardMeta } from "@/lib/local-board-store";
import { renameBoard } from "@/actions/board";
import type { UserRole } from "@/types";
import { useAssetStore } from "@/lib/assets";
import { useWhiteboardKeyboard } from "@/hooks/use-whiteboard-keyboard";
import { BoardHeader } from "./board-header";
import { ConnectionIndicator } from "./connection-indicator";
import { RemoteCursors } from "./remote-cursors";
import { GuestNameModal } from "./guest-name-modal";
import { UploadToastManager, type ToastEntry } from "./upload-toast";
import { Canvas } from "./canvas";
import { Toolbar } from "./toolbar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhiteboardProps {
  boardId: string;
  boardName: string;
  /** "guest" | "auth" — controls persistence and identity source */
  mode?: WhiteboardMode;
  /** Auth mode: Clerk user ID */
  userId?: string;
  /** Auth mode: Clerk user display name */
  userName?: string;
  /** Auth mode: Clerk avatar URL */
  avatarUrl?: string | null;
  /** Auth mode: user's role on this board */
  role?: UserRole;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Whiteboard({
  boardId,
  boardName: initialBoardName,
  mode = "guest",
  userId,
  userName,
  avatarUrl,
  role,
}: WhiteboardProps) {
  const [boardName, setBoardName] = useState(initialBoardName);

  // Guest identity — loaded from localStorage (client-side only)
  const [guestId, setGuestId] = useState<string>("guest_loading");
  const [guestName, setGuestName] = useState<string>("Guest");
  const [guestColor, setGuestColor] = useState<string>("#5b8a72");

  // Show name modal for guests who haven't set a name yet
  const [showNameModal, setShowNameModal] = useState(false);

  // Upload toasts — shown in auth mode when images are uploaded
  const [uploadToasts, setUploadToasts] = useState<ToastEntry[]>([]);

  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "guest") return;
    const identity = getGuestIdentity();
    setGuestId(identity.guestId);
    setGuestName(identity.guestName);
    setGuestColor(identity.guestColor);

    // Restore board name from localStorage (survives page reload)
    const meta = getGuestBoardMeta(boardId);
    if (meta?.name) {
      setBoardName(meta.name);
    }

    // Show modal if they haven't explicitly set a name before
    if (!hasSetGuestName()) {
      setShowNameModal(true);
    }
  }, [mode, boardId]);

  // ─── Upload toast helpers ────────────────────────────────────────────

  const addToast = useCallback((id: string, fileName: string) => {
    setUploadToasts((prev) => [
      ...prev,
      { id, fileName, status: "uploading", progress: 0 },
    ]);
  }, []);

  const updateToastProgress = useCallback((id: string, progress: number) => {
    setUploadToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress } : t))
    );
  }, []);

  const updateToastSuccess = useCallback((id: string) => {
    setUploadToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "success" as const, progress: 100 } : t))
    );
  }, []);

  const updateToastError = useCallback((id: string, error: string) => {
    setUploadToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "error" as const, error } : t))
    );
  }, []);

  const dismissToast = useCallback((id: string) => {
    setUploadToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Asset store — image upload backend ────────────────────────

  const { uploadMedia } = useAssetStore({
    mode,
    boardId,
    onUploadStart: (id, fileName) => {
      if (mode === "auth") addToast(id, fileName);
    },
    onUploadProgress: (id, progress) => {
      if (mode === "auth") updateToastProgress(id, progress);
    },
    onUploadComplete: (id) => {
      if (mode === "auth") updateToastSuccess(id);
    },
    onUploadError: (id, error) => {
      setUploadToasts((prev) => {
        const exists = prev.find((t) => t.id === id);
        if (exists) {
          return prev.map((t) => (t.id === id ? { ...t, status: "error" as const, error } : t));
        }
        return [...prev, { id, fileName: "Image", status: "error" as const, error }];
      });
    },
  });

  // ─── Resolve effective user identity ─────────────────────────────────

  const effectiveUserId = mode === "auth" ? (userId ?? "anonymous") : guestId;
  const effectiveUserName = mode === "auth" ? (userName ?? "Anonymous") : guestName;
  const effectiveAvatarUrl = mode === "auth" ? avatarUrl : null;
  const effectiveColor = mode === "guest" ? guestColor : undefined;

  // ─── Real-time collaboration sync ────────────────────────────────────

  const { shapesMap, undoManager, awarenessManager, connectionStatus, peerCount } = useYjsSync({
    boardId,
    userId: effectiveUserId,
    userName: effectiveUserName,
    avatarUrl: effectiveAvatarUrl,
    userColor: effectiveColor,
    enabled: true,
    mode,
    boardName,
  });

  // Keyboard Shortcuts Hook
  useWhiteboardKeyboard(shapesMap);
  useUndoRedo(undoManager);

  // Cursor Broadcast Hook
  useCursorBroadcast({ viewportRef, awarenessManager });

  const { collaborators } = useActiveUsers(awarenessManager);

  const handleNameConfirmed = useCallback((name: string, color: string) => {
    setGuestName(name);
    setGuestColor(color);
    setShowNameModal(false);
  }, []);

  const handleBoardRename = useCallback(
    async (newName: string) => {
      const prevName = boardName;
      setBoardName(newName);
      if (mode === "guest") {
        renameGuestBoard(boardId, newName);
      } else {
        try {
          const result = await renameBoard(boardId, newName);
          if (!result.success) {
            console.error("[Whiteboard] Failed to rename board:", result.error);
            setBoardName(prevName);
          }
        } catch (err) {
          console.error("[Whiteboard] Error renaming board:", err);
          setBoardName(prevName);
        }
      }
    },
    [boardId, mode, boardName]
  );

  return (
    <div className="relative h-screen w-screen">
      {/* Screen rotation prompt overlay for mobile portrait */}
      <div className="portrait-rotate-overlay select-none flex-col gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary animate-bounce">
          <svg viewBox="0 0 24 24" className="h-8 w-8 rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <h2 className="text-lg font-bold">Rotate your device</h2>
        <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
          This sketch canvas is optimized for landscape viewing. Please rotate your device to start drawing.
        </p>
      </div>

      {/* Guest name modal — shown on first visit before canvas interaction */}
      {showNameModal && mode === "guest" && (
        <GuestNameModal onConfirm={handleNameConfirmed} />
      )}

      {/* Custom DOM canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shapesMap={shapesMap}
          undoManager={undoManager}
          viewportRef={viewportRef}
          uploadMedia={uploadMedia}
        />
      </div>

      {/* Remote cursors overlay */}
      {awarenessManager && (
        <RemoteCursors awarenessManager={awarenessManager} />
      )}

      {/* Board header */}
      <BoardHeader
        boardId={boardId}
        boardName={boardName}
        peerCount={peerCount}
        connectionStatus={connectionStatus}
        collaborators={collaborators}
        mode={mode}
        role={role}
        shapesMap={shapesMap}
        guestName={mode === "guest" ? guestName : undefined}
        onRename={handleBoardRename}
        onChangeName={mode === "guest" ? () => setShowNameModal(true) : undefined}
      />

      {/* Main floating pill toolbar */}
      <Toolbar shapesMap={shapesMap} />

      {/* Upload progress toasts — bottom-right, above toolbar */}
      <UploadToastManager toasts={uploadToasts} onDismiss={dismissToast} />

      {/* Connection indicator — bottom-left */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[200]">
        <div className="pointer-events-auto">
          <ConnectionIndicator />
        </div>
      </div>
    </div>
  );
}
