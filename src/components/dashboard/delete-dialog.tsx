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

interface DeleteDialogProps {
  boardId: string;
  boardName: string;
  open: boolean;
  onClose: () => void;
}

export function DeleteDialog({
  boardId,
  boardName,
  open,
  onClose,
}: DeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setError(null);
      dialogRef.current?.showModal();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleDelete = () => {
    if (confirmText !== boardName) {
      setError("Board name doesn't match");
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
      className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl backdrop:bg-foreground/20 backdrop:backdrop-blur-sm"
    >
      {/* Warning icon */}
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>

      <h2 className="mb-1 text-base font-semibold">Delete Board</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        This action is permanent and cannot be undone. All content, collaborators,
        and uploaded images will be deleted.
      </p>

      <p className="mb-2 text-xs text-muted-foreground">
        Type{" "}
        <span className="select-none rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
          {boardName}
        </span>{" "}
        to confirm:
      </p>

      <input
        ref={inputRef}
        type="text"
        value={confirmText}
        onChange={(e) => {
          setConfirmText(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleDelete();
          if (e.key === "Escape") handleClose();
        }}
        placeholder={boardName}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
        disabled={isPending}
      />

      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}

      <div className="mt-4 flex justify-end gap-2">
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
          disabled={isPending || confirmText !== boardName}
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-40"
        >
          {isPending ? "Deleting…" : "Delete Board"}
        </button>
      </div>
    </dialog>
  );
}
