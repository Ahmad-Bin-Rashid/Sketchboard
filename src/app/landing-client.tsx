"use client";

/**
 * Client-side portions of the guest landing page.
 *
 * - "Open a board" input (paste URL or ID)
 * - Recent boards list (from localStorage)
 *
 * Split from page.tsx (server component) because it reads localStorage.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock, FolderOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { listGuestBoards, deleteGuestBoard, type LocalBoardMeta } from "@/lib/local-board-store";
import { ROUTES } from "@/lib/constants";

// ─── Open board input ─────────────────────────────────────────────────────────

export function GuestLandingClient() {
  const router = useRouter();
  const [boardInput, setBoardInput] = useState("");
  const [recentBoards, setRecentBoards] = useState<LocalBoardMeta[]>([]);
  const [error, setError] = useState("");

  // Load recent boards from localStorage on mount
  useEffect(() => {
    setRecentBoards(listGuestBoards());
  }, []);

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

  const handleDelete = (id: string) => {
    deleteGuestBoard(id);
    setRecentBoards(listGuestBoards());
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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

      {/* Recent boards */}
      {recentBoards.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            Recent boards (this browser)
          </h2>
          <div className="space-y-1">
            {recentBoards.slice(0, 6).map((board) => (
              <div
                key={board.id}
                className="group flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-border"
              >
                <a
                  href={ROUTES.BOARD(board.id)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-surface">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-muted-foreground" fill="currentColor">
                      <path d="M3 2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V3a1 1 0 00-1-1H3zm0 7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H3zm6-7a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1V3a1 1 0 00-1-1H9z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{board.name}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(board.savedAt)}</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(board.id);
                  }}
                  className="ml-2 flex-shrink-0 rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete local board"
                  title="Remove from local history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
