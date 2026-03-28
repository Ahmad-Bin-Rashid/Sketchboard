"use client";

/**
 * UploadToast — floating progress notification for image uploads.
 *
 * Shown in auth mode when the user drops/pastes an image onto the canvas.
 * Displays per-file upload progress with file name.
 * Auto-dismisses 2 seconds after the upload completes.
 * Shows an error state if the upload fails or quota is exceeded.
 *
 * Positioning: bottom-right, above the tldraw toolbar.
 */

import { useEffect } from "react";
import { CheckCircle2, ImageIcon, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UploadStatus = "uploading" | "success" | "error";

export interface UploadToastProps {
  /** File name being uploaded */
  fileName: string;
  /** Current upload status */
  status: UploadStatus;
  /** Upload progress (0–100). Only shown when status is "uploading". */
  progress?: number;
  /** Error message if status is "error" */
  error?: string;
  /** Called when the toast is dismissed (auto or manual) */
  onDismiss: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UploadToast({
  fileName,
  status,
  progress = 0,
  error,
  onDismiss,
}: UploadToastProps) {
  // Auto-dismiss on success after 2s, on error after 4s
  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(onDismiss, 2000);
      return () => clearTimeout(t);
    }
    if (status === "error") {
      const t = setTimeout(onDismiss, 4000);
      return () => clearTimeout(t);
    }
  }, [status, onDismiss]);

  const isUploading = status === "uploading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div
      className={cn(
        "flex w-72 items-start gap-3 rounded-xl border bg-card p-3 shadow-lg",
        "animate-in slide-in-from-bottom-2 duration-200",
        isError ? "border-destructive/30" : "border-border"
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">
        {isUploading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {isSuccess && (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
        {isError && (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* File name */}
        <div className="mb-1 flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{fileName}</span>
        </div>

        {/* Status text */}
        <p className="text-xs text-muted-foreground">
          {isUploading && `Uploading… ${progress > 0 ? `${progress}%` : ""}`}
          {isSuccess && "Upload complete"}
          {isError && (error ?? "Upload failed")}
        </p>

        {/* Progress bar — only during upload */}
        {isUploading && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upload Toast Manager ─────────────────────────────────────────────────────

/**
 * UploadToastManager — renders a stack of upload toasts in the bottom-right corner.
 *
 * The parent component manages the `toasts` array via useState.
 * Each toast auto-removes itself via onDismiss.
 */

export interface ToastEntry {
  id: string;
  fileName: string;
  status: UploadStatus;
  progress?: number;
  error?: string;
}

interface UploadToastManagerProps {
  toasts: ToastEntry[];
  onDismiss: (id: string) => void;
}

export function UploadToastManager({ toasts, onDismiss }: UploadToastManagerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-14 right-3 z-[300] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <UploadToast
            fileName={toast.fileName}
            status={toast.status}
            progress={toast.progress}
            error={toast.error}
            onDismiss={() => onDismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
