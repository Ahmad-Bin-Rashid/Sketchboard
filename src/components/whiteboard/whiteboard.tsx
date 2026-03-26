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
 *
 * Auth mode ("auth"):
 * - Real userId/userName/avatarUrl from Clerk session (passed via props)
 * - Board state persisted to DB via PartyKit (Phase 8)
 * - Full dashboard access
 *
 * Architecture:
 * ┌───────────────────────────────────────────────────────┐
 * │  Whiteboard (this component)                          │
 * │  ├── GuestNameModal (guest, first visit only)         │
 * │  ├── Tldraw (full screen canvas, z-0)                 │
 * │  ├── RemoteCursors (overlay, z-250)                   │
 * │  │    └── CursorAvatar × N (per remote user)          │
 * │  ├── BoardHeader (floating, z-200)                    │
 * │  │    └── ActiveUsersPanel (stacked avatars)          │
 * │  └── ConnectionIndicator (floating, z-200)            │
 * └───────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";

import { useYjsSync, type WhiteboardMode } from "@/hooks/use-yjs-sync";
import { useCursorBroadcast } from "@/hooks/use-cursor-broadcast";
import { useActiveUsers } from "@/hooks/use-active-users";
import { getGuestIdentity, hasSetGuestName } from "@/lib/guest";
import { renameGuestBoard, getGuestBoardMeta } from "@/lib/local-board-store";
import { BoardHeader } from "./board-header";
import { ConnectionIndicator } from "./connection-indicator";
import { RemoteCursors } from "./remote-cursors";
import { GuestNameModal } from "./guest-name-modal";

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

  // Load guest identity on client mount
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

  // Resolve effective user identity for the sync hook
  const effectiveUserId = mode === "auth" ? (userId ?? "anonymous") : guestId;
  const effectiveUserName = mode === "auth" ? (userName ?? "Anonymous") : guestName;
  const effectiveAvatarUrl = mode === "auth" ? avatarUrl : null;
  const effectiveColor = mode === "guest" ? guestColor : undefined;

  // Real-time collaboration sync
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

  // Broadcast local cursor position to remote peers
  useCursorBroadcast({ editor, awarenessManager });

  // Get list of active collaborators for the header
  const { collaborators } = useActiveUsers(awarenessManager);

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

  // Guest: when user confirms name in modal
  const handleNameConfirmed = useCallback((name: string, color: string) => {
    setGuestName(name);
    setGuestColor(color);
    setShowNameModal(false);
    // Awareness will pick up the new name on the next cursor broadcast
    // (it re-reads from state on the next render cycle)
  }, []);

  // Guest: inline board name rename
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

  return (
    <div className="relative h-screen w-screen">
      {/* Guest name modal — shown on first visit before canvas interaction */}
      {showNameModal && mode === "guest" && (
        <GuestNameModal onConfirm={handleNameConfirmed} />
      )}

      {/* tldraw canvas — full screen */}
      <div className="absolute inset-0 z-0">
        <Tldraw onMount={handleMount} autoFocus />
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

      {/* Connection indicator — bottom-left */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-200">
        <div className="pointer-events-auto">
          <ConnectionIndicator />
        </div>
      </div>
    </div>
  );
}
