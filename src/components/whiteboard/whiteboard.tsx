"use client";

/**
 * Main Whiteboard component — wraps tldraw with real-time collaboration.
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
 *
 * Architecture:
 * ┌───────────────────────────────────────────────────────┐
 * │  Whiteboard (this component)                          │
 * │  ├── GuestNameModal (guest, first visit only)         │
 * │  ├── Tldraw (full screen canvas, z-0)                 │
 * │  │    └── assetStore (guest=base64 / auth=CDN)        │
 * │  ├── RemoteCursors (overlay, z-250)                   │
 * │  │    └── CursorAvatar × N (per remote user)          │
 * │  ├── BoardHeader (floating, z-200)                    │
 * │  │    └── ActiveUsersPanel (stacked avatars)          │
 * │  ├── UploadToastManager (bottom-right, z-300)         │
 * │  └── ConnectionIndicator (floating, z-200)            │
 * └───────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { nanoid } from "nanoid";

import { useYjsSync, type WhiteboardMode } from "@/hooks/use-yjs-sync";
import { useCursorBroadcast } from "@/hooks/use-cursor-broadcast";
import { useActiveUsers } from "@/hooks/use-active-users";
import { getGuestIdentity, hasSetGuestName } from "@/lib/guest";
import { renameGuestBoard, getGuestBoardMeta } from "@/lib/local-board-store";
import { useAssetStore } from "@/lib/assets";
import { BoardHeader } from "./board-header";
import { ConnectionIndicator } from "./connection-indicator";
import { RemoteCursors } from "./remote-cursors";
import { GuestNameModal } from "./guest-name-modal";
import { UploadToastManager, type ToastEntry } from "./upload-toast";

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
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Whiteboard({
  boardId,
  boardName: initialBoardName,
  mode = "guest",
  userId,
  userName,
  avatarUrl,
}: WhiteboardProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  // Board name can be changed inline by guests
  const [boardName, setBoardName] = useState(initialBoardName);

  // Guest identity — loaded from localStorage (client-side only)
  const [guestId, setGuestId] = useState<string>("guest_loading");
  const [guestName, setGuestName] = useState<string>("Guest");
  const [guestColor, setGuestColor] = useState<string>("#5b8a72");

  // Show name modal for guests who haven't set a name yet
  const [showNameModal, setShowNameModal] = useState(false);

  // Upload toasts — shown in auth mode when images are uploaded
  const [uploadToasts, setUploadToasts] = useState<ToastEntry[]>([]);

  // Load guest identity on client mount
  useEffect(() => {
    console.log("[Whiteboard] Component MOUNTED. boardId:", boardId, "mode:", mode);
    return () => {
      console.log("[Whiteboard] Component UNMOUNTED. boardId:", boardId, "mode:", mode);
    };
  }, [boardId, mode]);

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

  // ─── Asset store — tldraw image upload backend ────────────────────────

  const assetStore = useAssetStore({
    mode,
    boardId,
    editor,
    onUploadStart: (id, fileName) => {
      // Only show toasts in auth mode (guest mode is instant base64)
      if (mode === "auth") addToast(id, fileName);
    },
    onUploadProgress: (id, progress) => {
      if (mode === "auth") updateToastProgress(id, progress);
    },
    onUploadComplete: (id) => {
      if (mode === "auth") updateToastSuccess(id);
    },
    onUploadError: (id, error) => {
      // Show error toast in both modes
      setUploadToasts((prev) => {
        const exists = prev.find((t) => t.id === id);
        if (exists) {
          return prev.map((t) => (t.id === id ? { ...t, status: "error" as const, error } : t));
        }
        // Guest mode: add a new error toast
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

  const { awarenessManager, connectionStatus, peerCount } = useYjsSync({
    boardId,
    editor,
    userId: effectiveUserId,
    userName: effectiveUserName,
    avatarUrl: effectiveAvatarUrl,
    userColor: effectiveColor,
    enabled: true,
    mode,
    boardName,
  });

  useCursorBroadcast({ editor, awarenessManager });

  const { collaborators } = useActiveUsers(awarenessManager);

  // ─── Editor mount ────────────────────────────────────────────────────

  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      setEditor(mountedEditor);
      mountedEditor.updateInstanceState({ isFocused: true });

      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__tldraw_editor = mountedEditor;
        console.log(`[Whiteboard] Mounted — board: ${boardId}, mode: ${mode}`);
      }
    },
    [boardId, mode]
  );

  // Migrate any local storage assets that have been uploaded to Uploadthing
  useEffect(() => {
    if (!editor || mode !== "auth") return;

    const migrateAssets = () => {
      try {
        const mappingsStr = localStorage.getItem("sketchboard-media-mappings");
        if (!mappingsStr) return;
        const mappings = JSON.parse(mappingsStr) as Record<string, string>;

        const assets = editor.getAssets();
        const assetsToUpdate: any[] = [];

        for (const asset of assets) {
          const cloudUrl = mappings[asset.id];
          if (cloudUrl && asset.props && "src" in asset.props && typeof asset.props.src === "string" && asset.props.src.startsWith("data:")) {
            assetsToUpdate.push({
              id: asset.id,
              type: asset.type,
              props: {
                ...asset.props,
                src: cloudUrl,
              },
            });
          }
        }

        if (assetsToUpdate.length > 0) {
          console.log("[Whiteboard] Migrating local assets to cloud URLs:", assetsToUpdate);
          editor.updateAssets(assetsToUpdate);
        }
      } catch (err) {
        console.warn("[Whiteboard] Failed to migrate local assets:", err);
      }
    };

    // Run after a short delay to allow collaborative synchronization to load
    const timeoutId = setTimeout(migrateAssets, 2000);
    return () => clearTimeout(timeoutId);
  }, [editor, mode]);

  // ─── Event handlers ──────────────────────────────────────────────────

  const handleNameConfirmed = useCallback((name: string, color: string) => {
    setGuestName(name);
    setGuestColor(color);
    setShowNameModal(false);
  }, []);

  const handleBoardRename = useCallback(
    (newName: string) => {
      setBoardName(newName);
      if (mode === "guest") {
        renameGuestBoard(boardId, newName);
      }
      // Auth mode: server action will be called here in Phase 7
    },
    [boardId, mode]
  );

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="relative h-screen w-screen">
      {/* Guest name modal — shown on first visit before canvas interaction */}
      {showNameModal && mode === "guest" && (
        <GuestNameModal onConfirm={handleNameConfirmed} />
      )}

      {/* tldraw canvas — full screen */}
      <div className="absolute inset-0 z-0">
        <Tldraw
          onMount={handleMount}
          autoFocus
          assets={assetStore}
        />
      </div>

      {/* Remote cursors overlay */}
      {editor && awarenessManager && (
        <RemoteCursors editor={editor} awarenessManager={awarenessManager} />
      )}

      {/* Board header */}
      <BoardHeader
        boardId={boardId}
        boardName={boardName}
        peerCount={peerCount}
        connectionStatus={connectionStatus}
        collaborators={collaborators}
        mode={mode}
        editor={editor}
        guestName={mode === "guest" ? guestName : undefined}
        onRename={handleBoardRename}
        onChangeName={mode === "guest" ? () => setShowNameModal(true) : undefined}
      />

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
