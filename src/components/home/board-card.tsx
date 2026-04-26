"use client";

/**
 * BoardCard — grid item representing a single board in the dashboard.
 *
 * Displays:
 * - Thumbnail or placeholder icon
 * - Board name + relative last-updated timestamp
 * - Favorite star (toggle on click, no navigation)
 * - Context menu (⋯) with: Rename, Duplicate, Favorite/Unfavorite, Delete
 *
 * Clicking the card navigates to the board.
 * All actions use server actions with optimistic UI patterns.
 */

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Clock,
  Copy,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { toggleFavorite, duplicateBoard, createBoard } from "@/actions/board";
import { RenameDialog } from "./rename-dialog";
import { DeleteDialog } from "./delete-dialog";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BoardCardProps {
  board: any;
  isLocal?: boolean;
  onRefresh?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BoardCard({ board, isLocal, onRefresh }: BoardCardProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const isAuthenticated = !!userId;

  const [isFavorite, setIsFavorite] = useState<boolean>(board.isFavorite || false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // ─── Context menu ────────────────────────────────────────────────────

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  // Close menu on outside click
  const handleMenuBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        closeMenu();
      }
    },
    []
  );

  // ─── Actions ─────────────────────────────────────────────────────────

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocal) return; // local boards don't have favorite DB action

    // Optimistic update
    setIsFavorite((prev) => !prev);
    startTransition(async () => {
      const result = await toggleFavorite(board.id);
      if (!result.success) {
        // Revert on error
        setIsFavorite(board.isFavorite);
      }
    });
  };

  const handleDuplicate = () => {
    closeMenu();
    if (isLocal) return;
    startTransition(async () => {
      await duplicateBoard(board.id);
    });
  };

  const handleRename = () => {
    closeMenu();
    setRenameOpen(true);
  };

  const handleDelete = () => {
    closeMenu();
    setDeleteOpen(true);
  };

  const handleUploadToCloud = () => {
    closeMenu();
    startTransition(async () => {
      const result = await createBoard(board.name);
      if (result.success) {
        // Redirect to new board page with importLocal parameter!
        router.push(ROUTES.BOARD(result.data.boardId) + `?importLocal=${board.id}`);
      } else {
        alert(result.error || "Failed to create board in cloud");
      }
    });
  };

  const canDelete = isLocal || board.userRole === "owner" || board.userRole === "admin";
  const canRename = isLocal || board.userRole !== "viewer";

  return (
    <>
      {/* Card */}
      <div className="group relative">
        <Link
          href={ROUTES.BOARD(board.id)}
          className="block rounded-xl border border-card-border bg-card transition-all duration-200 hover:border-border hover:shadow-md"
        >
          {/* Thumbnail area */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-surface">
            {board.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={board.thumbnailUrl}
                alt={`Preview of ${board.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg
                  className="h-10 w-10 text-muted/40"
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

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all duration-200 group-hover:bg-foreground/5 group-hover:opacity-100">
              <span className="rounded-lg bg-panel-bg px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm">
                Open board
              </span>
            </div>

            {/* Favorite star — top-left (hidden for local boards) */}
            {!isLocal && (
              <button
                onClick={handleToggleFavorite}
                disabled={isPending}
                className={cn(
                  "absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md transition-all",
                  isFavorite
                    ? "opacity-100 text-amber-500 bg-panel-bg shadow-sm backdrop-blur-sm"
                    : "opacity-0 text-muted-foreground bg-panel-bg shadow-sm backdrop-blur-sm group-hover:opacity-100"
                )}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  className="h-3.5 w-3.5"
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>
            )}
          </div>

          {/* Card footer */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">{board.name}</h3>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{formatRelativeTime(board.updatedAt || board.savedAt)}</span>
              </div>
            </div>

            {/* Context menu trigger */}
            <button
              onClick={openMenu}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md opacity-0 transition-all hover:bg-surface-hover group-hover:opacity-100"
              aria-label="Board options"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </Link>

        {/* Context menu dropdown */}
        {menuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[400]"
              onClick={handleMenuBackdropClick}
            />
            {/* Menu */}
            <div
              ref={menuRef}
              className="absolute bottom-9 right-9 z-[401] mb-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
            >
              {isLocal && isAuthenticated && (
                <MenuButton icon={<Upload className="h-3.5 w-3.5" />} onClick={handleUploadToCloud}>
                  Upload to Cloud
                </MenuButton>
              )}
              {canRename && (
                <MenuButton icon={<Pencil className="h-3.5 w-3.5" />} onClick={handleRename}>
                  Rename
                </MenuButton>
              )}
              {!isLocal && (
                <>
                  <MenuButton icon={<Copy className="h-3.5 w-3.5" />} onClick={handleDuplicate}>
                    Duplicate
                  </MenuButton>
                  <MenuButton
                    icon={
                      <Star
                        className="h-3.5 w-3.5"
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    }
                    onClick={() => {
                      closeMenu();
                      handleToggleFavorite({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
                    }}
                  >
                    {isFavorite ? "Unfavorite" : "Favorite"}
                  </MenuButton>
                </>
              )}
              {canDelete && (
                <>
                  <div className="my-1 h-px bg-border" />
                  <MenuButton
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={handleDelete}
                    variant="destructive"
                  >
                    Delete
                  </MenuButton>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <RenameDialog
        boardId={board.id}
        currentName={board.name}
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        isLocal={isLocal}
        onSuccess={onRefresh}
      />
      <DeleteDialog
        boardId={board.id}
        boardName={board.name}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        isLocal={isLocal}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ─── MenuButton ───────────────────────────────────────────────────────────────

interface MenuButtonProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

function MenuButton({ icon, children, onClick, variant = "default" }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-surface-hover"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
