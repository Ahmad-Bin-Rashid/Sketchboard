"use client";

/**
 * Main Whiteboard component — wraps tldraw with real-time collaboration.
 *
 * This is the primary canvas experience. It renders the tldraw editor
 * and orchestrates:
 * - tldraw canvas rendering
 * - Yjs real-time sync (via useYjsSync hook)
 * - Remote cursor rendering (via RemoteCursors overlay)
 * - Local cursor broadcasting (via useCursorBroadcast hook)
 * - Active users panel (via useActiveUsers hook)
 * - Connection status indicator
 * - Board header with collaborator avatars
 *
 * Architecture:
 * ┌───────────────────────────────────────────────────────┐
 * │  Whiteboard (this component)                          │
 * │  ├── Tldraw (full screen canvas, z-0)                 │
 * │  ├── RemoteCursors (overlay, z-250)                   │
 * │  │    └── CursorAvatar × N (per remote user)          │
 * │  ├── BoardHeader (floating, z-300)                    │
 * │  │    └── ActiveUsersPanel (stacked avatars)          │
 * │  └── ConnectionIndicator (floating, z-300)            │
 * └───────────────────────────────────────────────────────┘
 *
 * Cursor broadcasting reads editor.inputs.currentPagePoint directly
 * via a tldraw store listener, avoiding DOM event bubbling issues.
 *
 * Local-only mode:
 * When PartyKit is not available, the whiteboard still works locally.
 * Remote cursors and presence simply don't appear.
 *
 * Testing cursors:
 * Remote cursors only appear for OTHER users. To test locally, open
 * two browser tabs to the same board URL with PartyKit running
 * (npm run dev:all).
 */

import { useCallback, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";

import { useYjsSync } from "@/hooks/use-yjs-sync";
import { useCursorBroadcast } from "@/hooks/use-cursor-broadcast";
import { useActiveUsers } from "@/hooks/use-active-users";
import { BoardHeader } from "./board-header";
import { ConnectionIndicator } from "./connection-indicator";
import { RemoteCursors } from "./remote-cursors";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhiteboardProps {
  /** Unique board identifier — maps to a PartyKit room */
  boardId: string;
  /** Board display name */
  boardName: string;
  /** Current user ID (from auth). Falls back to anonymous. */
  userId?: string;
  /** Current user display name */
  userName?: string;
  /** Current user avatar URL */
  avatarUrl?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Whiteboard({
  boardId,
  boardName,
  userId = "anonymous",
  userName = "Anonymous",
  avatarUrl,
}: WhiteboardProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  // Real-time collaboration sync
  const { awarenessManager, connectionStatus, peerCount } = useYjsSync({
    boardId,
    editor,
    userId,
    userName,
    avatarUrl,
    enabled: true,
  });

  // Broadcast local cursor position to remote peers
  // Uses editor.store.listen + editor.inputs.currentPagePoint (no DOM ref needed)
  useCursorBroadcast({ editor, awarenessManager });

  // Get list of active collaborators for the header panel
  const { collaborators } = useActiveUsers(awarenessManager);

  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      // Store editor reference — triggers useYjsSync to connect
      setEditor(mountedEditor);

      // Focus the canvas on mount
      mountedEditor.updateInstanceState({ isFocused: true });

      // Development helpers
      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__tldraw_editor =
          mountedEditor;
        console.log(
          `[Whiteboard] Mounted for board: ${boardId}`,
          mountedEditor
        );
      }
    },
    [boardId]
  );

  return (
    <div className="relative h-screen w-screen">
      {/* tldraw canvas — full screen. z-0 establishes a base but lets tldraw
          menus (z-index 300-600 internally) render above our header. */}
      <div className="absolute inset-0 z-0">
        <Tldraw
          onMount={handleMount}
          autoFocus
        />
      </div>

      {/* Remote cursors overlay — above canvas shapes, below tldraw menus */}
      {editor && awarenessManager && (
        <RemoteCursors
          editor={editor}
          awarenessManager={awarenessManager}
        />
      )}

      {/* Board header — floating, but below tldraw menus so dropdowns aren't blocked */}
      <BoardHeader
        boardId={boardId}
        boardName={boardName}
        peerCount={peerCount}
        connectionStatus={connectionStatus}
        collaborators={collaborators}
      />

      {/* Connection indicator — bottom-left */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[200]">
        <div className="pointer-events-auto">
          <ConnectionIndicator />
        </div>
      </div>
    </div>
  );
}
