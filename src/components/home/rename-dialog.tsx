"use client";

/**
 * RenameDialog — modal for renaming a board inline from the board card context menu.
 *
 * Shows a text input pre-filled with the current name.
 * Calls renameBoard() server action on submit.
 * Uses a native <dialog> element for accessibility.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { renameBoard } from "@/actions/board";
import { renameGuestBoard } from "@/lib/local-board-store";

interface RenameDialogProps {
  boardId: string;
  currentName: string;
  open: boolean;
  onClose: () => void;
  isLocal?: boolean;
  onSuccess?: () => void;
}

export function RenameDialog({
  boardId,
  currentName,
  open,
  onClose,
  isLocal,
  onSuccess,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync input when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
      dialogRef.current?.showModal();
      setTimeout(() => inputRef.current?.select(), 50);
    } else {
      dialogRef.current?.close();
    }
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }

    if (isLocal) {
      try {
        renameGuestBoard(boardId, trimmed);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to rename local board");
      }
      return;
    }

    startTransition(async () => {
      const result = await renameBoard(boardId, trimmed);
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
      className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl backdrop:bg-foreground/20 backdrop:backdrop-blur-sm"
    >
      <h2 className="mb-4 text-base font-semibold">Rename Board</h2>
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Escape" && handleClose()}
          maxLength={100}
          placeholder="Board name"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? "Renaming…" : "Rename"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
