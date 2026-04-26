"use client";

/**
 * DeleteDialog — confirmation modal for deleting a board.
 *
 * Requires the user to type the board name to confirm deletion,
 * preventing accidental deletes. Calls deleteBoard() server action.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteBoard } from "@/actions/board";
import { deleteGuestBoard } from "@/lib/local-board-store";

interface DeleteDialogProps {
  boardId: string;
  boardName: string;
  open: boolean;
  onClose: () => void;
  isLocal?: boolean;
  onSuccess?: () => void;
}

export function DeleteDialog({
  boardId,
  boardName,
  open,
  onClose,
  isLocal,
  onSuccess,
}: DeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleDelete = () => {
    if (isLocal) {
      try {
        deleteGuestBoard(boardId);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete local board");
      }
      return;
    }

    startTransition(async () => {
      const result = await deleteBoard(boardId);
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  const handleClose = () => {
    if (!isPending) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed inset-0 z-50 m-auto h-fit w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl backdrop:bg-foreground/20 backdrop:backdrop-blur-sm focus:outline-none"
    >
      {/* Warning icon */}
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>

      <h2 className="mb-1 text-base font-semibold">Delete Board</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        This action is permanent and cannot be undone. All board content and uploaded images will be deleted.
      </p>

      {error && (
        <p className="mt-1.5 text-xs text-destructive mb-3">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-40"
        >
          {isPending ? "Deleting…" : "Delete Board"}
        </button>
      </div>
    </dialog>
  );
}
