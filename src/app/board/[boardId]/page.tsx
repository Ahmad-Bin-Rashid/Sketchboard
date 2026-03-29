/**
 * Board page — server component that determines guest vs auth mode.
 *
 * Flow:
 * 1. Check Clerk auth session
 * 2. If authenticated:
 *    - Call getOrCreateBoard() to verify access + get the real board name
 *    - If the URL contains a guest nanoid, redirect to the new DB board URL
 *    - Render in auth mode with real user identity + board name
 * 3. If no session → guest mode (all state lives in browser localStorage)
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BoardCanvas } from "./board-canvas";
import { BOARD_DEFAULTS, ROUTES } from "@/lib/constants";
import { getOrCreateBoard } from "@/actions/board";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  // Check if user is authenticated
  const { userId: clerkId } = await auth();

  if (clerkId) {
    // ─── Auth mode ────────────────────────────────────────────
    // Fetch board from DB, verify access, and handle URL slug bridge
    const [user, boardResult] = await Promise.all([
      currentUser(),
      getOrCreateBoard(boardId),
    ]);

    if (!boardResult.success) {
      // Board not found or access denied — redirect to dashboard
      redirect(ROUTES.DASHBOARD);
    }

    // If getOrCreateBoard created a new board (guest URL → DB UUID),
    // redirect to the canonical UUID URL
    if (boardResult.data.boardId !== boardId) {
      redirect(ROUTES.BOARD(boardResult.data.boardId));
    }

    return (
      <BoardCanvas
        boardId={boardResult.data.boardId}
        boardName={boardResult.data.boardName}
        mode="auth"
        userId={clerkId}
        userName={user?.fullName ?? user?.username ?? "User"}
        avatarUrl={user?.imageUrl ?? null}
      />
    );
  }

  // ─── Guest mode ─────────────────────────────────────────────
  // No session — all state lives in browser localStorage.
  // Identity (name, color) is managed client-side via guest.ts.
  return (
    <BoardCanvas
      boardId={boardId}
      boardName={BOARD_DEFAULTS.NAME}
      mode="guest"
    />
  );
}
