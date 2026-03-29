"use client";

/**
 * DashboardContent — client component rendering the board grid with search.
 *
 * Handles:
 * - Search input with debounced URL param update (no page reload)
 * - Filter tabs (All / Favorites / Recent) via URL params
 * - Board grid with BoardCard components
 * - Empty states per filter and search result
 *
 * The initial boards list is fetched on the server and passed as props.
 * Client-side filtering is done via URL params → triggers server re-fetch
 * through Next.js server component re-render.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, LayoutGrid, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardCard, NewBoardButton } from "@/components/dashboard";
import { useDebounce } from "@/hooks/use-debounce";
import type { BoardWithDetails } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = "all" | "favorites" | "recent";

interface DashboardContentProps {
  boards: BoardWithDetails[];
  /** Currently active filter from URL params */
  filter: FilterTab;
  /** Current search query from URL params */
  search: string;
}

// ─── Filter tabs config ───────────────────────────────────────────────────────

const FILTER_TABS: { id: FilterTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "all", label: "All Boards", icon: LayoutGrid },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "recent", label: "Recent", icon: Clock },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardContent({
  boards,
  filter,
  search: initialSearch,
}: DashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local search state — debounced before pushing to URL
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Push debounced search to URL params → triggers server re-fetch
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    // Reset to page 1 when search changes
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, router, searchParams]);

  const handleFilterChange = useCallback(
    (newFilter: FilterTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newFilter === "all") {
        params.delete("filter");
      } else {
        params.set("filter", newFilter);
      }
      params.delete("search");
      setSearchInput("");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleClearSearch = () => {
    setSearchInput("");
  };

  return (
    <div className="flex min-h-full flex-col px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {filter === "all" && "My Boards"}
          {filter === "favorites" && "Favorites"}
          {filter === "recent" && "Recent"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {filter === "all" && "All your collaborative whiteboards"}
          {filter === "favorites" && "Boards you've starred"}
          {filter === "recent" && "Boards updated in the last 7 days"}
        </p>
      </div>

      {/* Filter tabs + search bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search boards…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Board count badge */}
        <span className="ml-auto text-xs text-muted-foreground">
          {boards.length} {boards.length === 1 ? "board" : "boards"}
        </span>
      </div>

      {/* Board grid */}
      {boards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filter === "all" && !searchInput && <NewBoardButton />}
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      ) : (
        <EmptyState filter={filter} hasSearch={!!searchInput} />
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  filter,
  hasSearch,
}: {
  filter: FilterTab;
  hasSearch: boolean;
}) {
  if (hasSearch) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
          <Search className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="mt-4 text-base font-semibold">No boards found</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          No boards match your search. Try a different name.
        </p>
      </div>
    );
  }

  if (filter === "favorites") {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
          <Star className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="mt-4 text-base font-semibold">No favorites yet</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Star boards to quickly find them here.
        </p>
      </div>
    );
  }

  if (filter === "recent") {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
          <Clock className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="mt-4 text-base font-semibold">No recent activity</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Boards edited in the last 7 days will appear here.
        </p>
      </div>
    );
  }

  // All boards empty
  return (
    <div className="mt-16 flex flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light">
        <svg
          className="h-7 w-7 text-primary"
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
      <h3 className="mt-4 text-base font-semibold">No boards yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Create your first collaborative whiteboard and start brainstorming.
      </p>
      <div className="mt-5">
        <NewBoardButton />
      </div>
    </div>
  );
}
