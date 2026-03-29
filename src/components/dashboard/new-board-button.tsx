"use client";

/**
 * NewBoardButton — creates a new whiteboard for authenticated users.
 *
 * In auth mode: calls the `createBoard` server action to persist the board
 * in the user's personal team, then redirects to the new board's URL.
 *
 * Displays as a dashed card in the board grid with a hover animation.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createBoard } from "@/actions/board";
import { ROUTES } from "@/lib/constants";

export function NewBoardButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createBoard();
      if (result.success) {
        router.push(ROUTES.BOARD(result.data.boardId));
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <button
        id="new-board-btn"
        onClick={handleCreate}
        disabled={isPending}
        aria-label="Create new board"
        className="group w-full disabled:cursor-not-allowed"
      >
        <div className="flex aspect-[16/10] items-center justify-center rounded-xl border-2 border-dashed border-muted/40 bg-surface/50 transition-all duration-200 hover:border-primary/40 hover:bg-primary-light/50 disabled:opacity-50">
          <div className="flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-primary group-disabled:text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface transition-colors group-hover:bg-primary/10">
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <span className="text-sm font-medium">
              {isPending ? "Creating…" : "New Board"}
            </span>
          </div>
        </div>
      </button>

      {/* Inline error (rare — shown below the button) */}
      {error && (
        <p className="mt-1.5 text-center text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
