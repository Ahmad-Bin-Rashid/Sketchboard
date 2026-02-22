/**
 * Board page — renders the tldraw whiteboard canvas.
 * Full-screen, no sidebar or header — the canvas is the entire viewport.
 *
 * Future enhancements (Phase 3-4):
 * - Load board data from database
 * - Connect Yjs sync provider for real-time collaboration
 * - Verify user has access to this board
 */

import { BoardCanvas } from "./board-canvas";
import { BOARD_DEFAULTS } from "@/lib/constants";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  // TODO (Phase 7): Fetch board from DB, verify access
  const boardName = BOARD_DEFAULTS.NAME;

  return <BoardCanvas boardId={boardId} boardName={boardName} />;
}
