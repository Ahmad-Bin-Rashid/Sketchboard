/**
 * Board page — server component that determines guest vs auth mode.
 *
 * Flow:
 * 1. Try to get Clerk auth session
 * 2. If authenticated → auth mode (Phase 7 will add DB fetch + access check)
 * 3. If no session → guest mode (all state lives in client localStorage)
 *
 * Both modes render the same Whiteboard canvas client component.
 * The difference is in which props are passed (userId/userName vs none).
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { BoardCanvas } from "./board-canvas";
import { BOARD_DEFAULTS } from "@/lib/constants";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  // Check if user is authenticated
  const { userId: clerkId } = await auth();

  if (clerkId) {
    // ─── Auth mode ───────────────────────────────────────────
    // User is logged in. In Phase 7 we'll fetch the board from DB
    // and verify access. For now, use defaults + real user identity.
    const user = await currentUser();

    return (
      <BoardCanvas
        boardId={boardId}
        boardName={BOARD_DEFAULTS.NAME} // Phase 7: fetch from DB
        mode="auth"
        userId={clerkId}
        userName={user?.fullName ?? user?.username ?? "User"}
        avatarUrl={user?.imageUrl ?? null}
      />
    );
  }

  // ─── Guest mode ─────────────────────────────────────────────
  // No session. Board state lives in browser localStorage.
  // Identity (name, color) is managed client-side via guest.ts.
  return (
    <BoardCanvas
      boardId={boardId}
      boardName={BOARD_DEFAULTS.NAME}
      mode="guest"
    />
  );
}
