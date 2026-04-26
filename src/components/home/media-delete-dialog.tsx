"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface MediaDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;
  description?: string;
}

export function MediaDeleteDialog({
  open,
  onClose,
  onConfirm,
  isPending = false,
  title = "Delete Media",
  description = "Are you sure you want to delete this media? This action is permanent and cannot be undone.",
}: MediaDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

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

      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {description}
      </p>

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
          onClick={onConfirm}
          disabled={isPending}
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-40"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
