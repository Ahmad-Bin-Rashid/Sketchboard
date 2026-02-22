"use client";

/**
 * Dashboard content — client component rendering the board grid.
 *
 * Separated from the server page component because:
 * - Board cards have click handlers (client interactivity)
 * - NewBoardButton uses useRouter
 * - Future: real-time board status updates
 */

import { BoardCard, NewBoardButton } from "@/components/dashboard";
import { Plus } from "lucide-react";

interface Board {
  id: string;
  name: string;
  updatedAt: string;
  activeUsers?: number;
  thumbnailUrl?: string | null;
}

interface DashboardContentProps {
  boards: Board[];
}

export function DashboardContent({ boards }: DashboardContentProps) {
  return (
    <div className="px-8 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Boards</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create and manage your collaborative whiteboards
          </p>
        </div>
      </div>

      {/* Board grid */}
      {boards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <NewBoardButton />
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              id={board.id}
              name={board.name}
              updatedAt={board.updatedAt}
              activeUsers={board.activeUsers}
              thumbnailUrl={board.thumbnailUrl}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="animate-fade-in mt-12 flex flex-col items-center justify-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-light">
        <svg
          className="h-10 w-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      </div>
      <h3 className="mt-5 text-lg font-semibold">No boards yet</h3>
      <p className="mt-1.5 max-w-sm text-center text-sm text-muted-foreground">
        Create your first collaborative whiteboard to start brainstorming with
        your team.
      </p>
      <NewBoardButton />
    </div>
  );
}
