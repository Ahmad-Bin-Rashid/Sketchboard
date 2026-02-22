"use client";

/**
 * Board canvas — client component wrapper for the Whiteboard.
 *
 * This separation exists because:
 * 1. The board page is a server component (can fetch data, check auth)
 * 2. tldraw requires client-side rendering (canvas, events, etc.)
 *
 * The server component fetches board data and passes it down.
 * This client component renders the interactive canvas.
 */

import { Whiteboard } from "@/components/whiteboard";

interface BoardCanvasProps {
  boardId: string;
  boardName: string;
}

export function BoardCanvas({ boardId, boardName }: BoardCanvasProps) {
  return <Whiteboard boardId={boardId} boardName={boardName} />;
}
