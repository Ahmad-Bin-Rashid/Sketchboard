"use client";

/**
 * Client-side portions of the landing page.
 *
 * - "Open a board" input (paste URL or ID)
 *
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

// ─── Open board input ─────────────────────────────────────────────────────────

export function BoardUrlInput() {
  const router = useRouter();
  const [boardInput, setBoardInput] = useState("");
  const [error, setError] = useState("");

  const handleOpen = () => {
    const raw = boardInput.trim();
    if (!raw) return;

    // Accept full URL or just an ID
    let boardId = raw;
    try {
      const url = new URL(raw);
      const match = url.pathname.match(/\/board\/([^/]+)/);
      if (match) boardId = match[1];
    } catch {
      // Not a URL — treat as raw ID
    }

    if (!boardId || boardId.length < 3) {
      setError("Please enter a valid board link or ID.");
      return;
    }

    router.push(ROUTES.BOARD(boardId));
  };



  return (
    <div className="mt-4 w-full">
      {/* Open board input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={boardInput}
          onChange={(e) => {
            setBoardInput(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleOpen()}
          placeholder="Paste board link or ID…"
          className={cn(
            "flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm",
            "placeholder:text-muted-foreground/50",
            "focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "transition-colors",
            error && "border-destructive/60"
          )}
        />
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-hover"
        >
          <FolderOpen className="h-4 w-4" />
          Open
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-left text-xs text-destructive">{error}</p>
      )}

    </div>
  );
}
