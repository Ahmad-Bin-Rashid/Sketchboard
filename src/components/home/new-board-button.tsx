"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertTriangle, LogIn, UserPlus } from "lucide-react";
import { createBoard } from "@/actions/board";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@clerk/nextjs";
import { getGuestStorageUsage } from "@/lib/local-board-store";

export function NewBoardButton() {
  const router = useRouter();
  const { userId } = useAuth();
  const isAuthenticated = !!userId;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (showLimitModal) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showLimitModal]);

  const handleCreate = () => {
    setError(null);

    if (!isAuthenticated) {
      // Guest limits check
      const usage = getGuestStorageUsage();
      const limit = 4.5 * 1024 * 1024; // 4.5MB limit
      if (usage >= limit) {
        setShowLimitModal(true);
        return;
      }
      // Redirect to fresh guest board nanoid
      router.push("/board/new");
      return;
    }

    // Authenticated flow
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
    <>
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

        {error && (
          <p className="mt-1.5 text-center text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Guest limit modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setShowLimitModal(false)}
        className="fixed inset-0 z-50 m-auto h-fit w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop:bg-foreground/20 backdrop:backdrop-blur-sm focus:outline-none"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
          <AlertTriangle className="h-5 w-5 text-primary" />
        </div>

        <h2 className="mb-1 text-base font-semibold">Local Storage Limit Reached</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You have reached the local browser storage limit of 4.5 MB. Sign up or log in to back up your boards to the cloud and create more boards!
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowLimitModal(false)}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLimitModal(false);
              router.push(ROUTES.SIGN_IN);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            <LogIn className="h-4 w-4" />
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLimitModal(false);
              router.push(ROUTES.SIGN_UP);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <UserPlus className="h-4 w-4" />
            Sign Up
          </button>
        </div>
      </dialog>
    </>
  );
}
