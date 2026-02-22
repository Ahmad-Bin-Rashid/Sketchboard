"use client";

/**
 * BoardCard — displays a board preview on the dashboard.
 *
 * Shows a thumbnail placeholder (or canvas preview in Phase 7),
 * board name, last edited time, and a context menu.
 *
 * Used in the board grid on the dashboard page.
 */

import Link from "next/link";
import { MoreHorizontal, Clock, Users } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BoardCardProps {
  id: string;
  name: string;
  updatedAt: string;
  /** Number of active collaborators */
  activeUsers?: number;
  /** Thumbnail URL — if null, shows a gradient placeholder */
  thumbnailUrl?: string | null;
}

export function BoardCard({
  id,
  name,
  updatedAt,
  activeUsers = 0,
  thumbnailUrl,
}: BoardCardProps) {
  return (
    <Link
      href={ROUTES.BOARD(id)}
      className="group animate-fade-in"
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-card-border bg-card transition-all duration-200",
          "hover:border-primary/30 hover:shadow-md"
        )}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-[16/10] overflow-hidden bg-surface">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-light via-surface to-secondary-light">
              <svg
                className="h-10 w-10 text-muted/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                />
              </svg>
            </div>
          )}

          {/* Active users badge */}
          {activeUsers > 0 && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-panel-bg px-2 py-0.5 text-xs shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground">{activeUsers}</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all duration-200 group-hover:bg-foreground/5 group-hover:opacity-100">
            <span className="rounded-lg bg-panel-bg px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm">
              Open board
            </span>
          </div>
        </div>

        {/* Card footer */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{name}</h3>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{updatedAt}</span>
            </div>
          </div>

          {/* More menu button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // TODO: Open context menu (rename, delete, duplicate)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all hover:bg-surface-hover group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </Link>
  );
}
