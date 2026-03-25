"use client";

/**
 * Board canvas — client component wrapper for the Whiteboard.
 *
 * Separating server (page.tsx) from client (this) allows the page to:
 * - Be a server component (run auth checks, DB queries)
 * - Pass serializable props down to the client canvas
 *
 * Mode is determined by the server component and passed as a prop.
 */

import { Whiteboard } from "@/components/whiteboard";
import type { WhiteboardMode } from "@/hooks/use-yjs-sync";

interface BoardCanvasProps {
  boardId: string;
  boardName: string;
  mode: WhiteboardMode;
  userId?: string;
  userName?: string;
  avatarUrl?: string | null;
}

export function BoardCanvas({
  boardId,
  boardName,
  mode,
  userId,
  userName,
  avatarUrl,
}: BoardCanvasProps) {
  return (
    <Whiteboard
      boardId={boardId}
      boardName={boardName}
      mode={mode}
      userId={userId}
      userName={userName}
      avatarUrl={avatarUrl}
    />
  );
}
