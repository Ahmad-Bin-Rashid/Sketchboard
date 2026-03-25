/**
 * /board/new — generates a fresh board ID and redirects.
 *
 * Works for both guests and auth users. The board ID becomes the
 * PartyKit room name. For guests, state lives in localStorage.
 * For auth users, the board is auto-created in the DB on the
 * first load of /board/[boardId] (Phase 7: getOrCreateBoard).
 */

import { redirect } from "next/navigation";
import { nanoid } from "nanoid";

export default function NewBoardPage() {
  // 10-char base-62 ID → ~839 trillion combinations, collision-safe
  const boardId = nanoid(10);
  redirect(`/board/${boardId}`);
}
