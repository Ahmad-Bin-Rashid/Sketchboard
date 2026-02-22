"use client";

/**
 * Main Whiteboard component — wraps tldraw with real-time collaboration.
 *
 * This is the primary canvas experience. It renders the tldraw editor
 * and orchestrates:
 * - tldraw canvas rendering
 * - Yjs real-time sync (via useYjsSync hook)
 * - Connection status indicator
 * - Board header with collaborator info
 *
 * Architecture:
 * ┌───────────────────────────────────────────────────────┐
 * │  Whiteboard (this component)                          │
 * │  ├── BoardHeader (floating, z-300)                    │
 * │  ├── ConnectionIndicator (floating, z-300)            │
 * │  └── Tldraw (full screen canvas)                      │
 * │       └── useYjsSync hook (connects to PartyKit)      │
 * │            ├── TldrawYjsSync (Store ↔ Yjs bridge)     │
 * │            ├── AwarenessManager (cursors/presence)     │
 * │            └── ConnectionStore (status tracking)       │
 * └───────────────────────────────────────────────────────┘
 *
 * Local-only mode:
 * When PartyKit is not available, the whiteboard still works locally.
 * The sync hook gracefully handles connection failures.
 */

import { useCallback, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";

import { useYjsSync } from "@/hooks/use-yjs-sync";
import { BoardHeader } from "./board-header";
import { ConnectionIndicator } from "./connection-indicator";

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
  const { connectionStatus, peerCount } = useYjsSync({
    boardId,
    editor,
    userId,
    userName,
    avatarUrl,
    enabled: true,
  });

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
      {/* Board header — floating above the canvas */}
      <BoardHeader
        boardId={boardId}
        boardName={boardName}
        peerCount={peerCount}
        connectionStatus={connectionStatus}
      />

      {/* Connection indicator — bottom-left */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[300]">
        <div className="pointer-events-auto">
          <ConnectionIndicator />
        </div>
      </div>

      {/* tldraw canvas — full screen */}
      <div className="absolute inset-0">
        <Tldraw
          onMount={handleMount}
          autoFocus
        />
      </div>
    </div>
  );
}
