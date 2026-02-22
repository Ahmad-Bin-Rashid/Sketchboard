"use client";

/**
 * NewBoardButton — creates a new whiteboard.
 *
 * Displays as a dashed card in the board grid.
 * On click, generates a new board ID and navigates to it.
 *
 * Phase 7 will add:
 * - Server action to create board in DB
 * - Tier limit checks
 * - Template selection
 */

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { ROUTES } from "@/lib/constants";

export function NewBoardButton() {
  const router = useRouter();

  const handleCreate = () => {
    // Generate a temporary ID — Phase 7 will create in DB first
    const boardId = nanoid(12);
    router.push(ROUTES.BOARD(boardId));
  };

  return (
    <button
      onClick={handleCreate}
      className="group animate-fade-in"
    >
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border-2 border-dashed border-muted/40 bg-surface/50 transition-all duration-200 hover:border-primary/40 hover:bg-primary-light/50">
        <div className="flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface transition-colors group-hover:bg-primary/10">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">New Board</span>
        </div>
      </div>
    </button>
  );
}
