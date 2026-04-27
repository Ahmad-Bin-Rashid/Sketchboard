"use client";

/**
 * Board header — floating top bar on the canvas.
 *
 * Guest mode shows:
 * - Home button (→ landing page)
 * - Board name (double-click to rename inline)
 * - Guest identity chip: "Playing as [Name]" with pencil icon → opens rename modal
 * - Export (.whiteboard file download)
 * - Import (.whiteboard file)
 * - Share (copy URL)
 * - Active collaborators + connection status
 *
 * Auth mode shows:
 * - Back button (→ dashboard)
 * - Board name
 * - Share button
 * - Active collaborators + connection status
 */

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Home,
  Pencil,
  Share2,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { type ConnectionStatus, getConnectionDotColor } from "@/lib/sync/connection";
import { cn } from "@/lib/utils";
import { ActiveUsersPanel } from "./active-users-panel";
import type { CollaboratorInfo, UserRole } from "@/types";
import type { WhiteboardMode } from "@/hooks/use-yjs-sync";
import type { Editor } from "tldraw";
import { exportBoardAsFile, openImportFilePicker, type ImportResult } from "@/lib/board-export";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BoardHeaderProps {
  boardId: string;
  boardName: string;
  peerCount: number;
  connectionStatus: ConnectionStatus;
  collaborators?: CollaboratorInfo[];
  mode?: WhiteboardMode;
  /** Auth mode: user's role on this board */
  role?: UserRole;
  /** tldraw editor — needed for export/import (guest mode) */
  editor?: Editor | null;
  /** Guest mode: the current guest's display name, shown in identity chip */
  guestName?: string;
  /** Called when the user changes the board name (guest mode inline rename) */
  onRename?: (newName: string) => void;
  /** Called when user clicks the identity chip to open the rename-name modal */
  onChangeName?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BoardHeader({
  boardId,
  boardName,
  peerCount,
  connectionStatus,
  collaborators = [],
  mode = "guest",
  role,
  editor,
  guestName,
  onRename,
  onChangeName,
}: BoardHeaderProps) {
  const isConnected = connectionStatus === "connected";
  const isGuest = mode === "guest";
  const canRename = isGuest || (mode === "auth" && role !== "viewer");

  // Inline board name editing state (guest mode)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(boardName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Share copy feedback
  const [copied, setCopied] = useState(false);

  // Import feedback toast
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [boardId]);

  const handleExport = useCallback(() => {
    if (!editor) return;
    exportBoardAsFile(editor, boardId, boardName);
  }, [editor, boardId, boardName]);

  const handleImport = useCallback(() => {
    if (!editor) return;
    openImportFilePicker(editor, (result: ImportResult) => {
      if (result.ok) {
        setImportMsg("Board imported!");
        if (result.boardName && onRename) {
          onRename(result.boardName);
        }
      } else {
        setImportMsg(result.error ?? "Import failed");
      }
      setTimeout(() => setImportMsg(null), 3000);
    });
  }, [editor, onRename]);

  const handleNameDoubleClick = () => {
    if (!canRename) return;
    setEditedName(boardName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 50);
  };

  const commitNameEdit = () => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== boardName) {
      onRename?.(trimmed);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitNameEdit();
    if (e.key === "Escape") setIsEditingName(false);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-200 flex items-start justify-between p-2">
      {/* ─── Left: Nav + Board Name ───────────────────────────── */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Back / Home button */}
        <Link
          href={ROUTES.HOME}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-panel-bg text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover"
          style={{ border: "1px solid var(--panel-border)" }}
          aria-label={isGuest ? "Go to home" : "Back to home"}
        >
          {isGuest ? <Home className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </Link>

        {/* Board name pill */}
        <div
          className="flex items-center gap-2 rounded-lg bg-panel-bg px-3 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={commitNameEdit}
              onKeyDown={handleNameKeyDown}
              maxLength={64}
              className="w-40 bg-transparent text-sm font-medium focus:outline-none"
              autoFocus
            />
          ) : (
            <h1
              className={cn(
                "max-w-50 truncate text-sm font-medium",
                canRename && "cursor-text select-none"
              )}
              onDoubleClick={handleNameDoubleClick}
              title={canRename ? "Double-click to rename board" : boardName}
            >
              {boardName}
            </h1>
          )}
        </div>

        {/* Guest identity chip — shows the user's name with edit option */}
        {isGuest && onChangeName && (
          <button
            onClick={onChangeName}
            className="flex items-center gap-1.5 rounded-lg bg-panel-bg px-2.5 py-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover"
            style={{ border: "1px solid var(--panel-border)" }}
            title="Click to change your display name"
            aria-label="Change your display name"
          >
            <span className="max-w-25 truncate text-xs text-muted-foreground">
              {guestName ?? "Guest"}
            </span>
            <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/70" />
          </button>
        )}
      </div>

      {/* ─── Right: Actions + Collaborators + Status ─────────── */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Import feedback toast */}
        {importMsg && (
          <div
            className="rounded-lg bg-card px-3 py-1.5 text-xs text-foreground shadow-sm"
            style={{ border: "1px solid var(--panel-border)" }}
          >
            {importMsg}
          </div>
        )}

        {/* Guest: Import + Export */}
        {isGuest && editor && (
          <>
            <button
              onClick={handleImport}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-panel-bg px-3 text-xs text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover"
              style={{ border: "1px solid var(--panel-border)" }}
              title="Import .whiteboard file"
              aria-label="Import board"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-panel-bg px-3 text-xs text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover"
              style={{ border: "1px solid var(--panel-border)" }}
              title="Export as .whiteboard file"
              aria-label="Export board"
            >
              <Download className="h-3.5 w-3.5" />
              Save
            </button>
          </>
        )}

        {/* Connection status pill */}
        <div
          className="flex items-center gap-2 rounded-lg bg-panel-bg px-3 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              getConnectionDotColor(connectionStatus),
              connectionStatus === "connecting" && "animate-pulse"
            )}
          />
          {isConnected ? (
            <Wifi className="h-3 w-3 text-muted-foreground" />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
          {peerCount > 1 && (
            <span className="text-xs text-muted-foreground">{peerCount}</span>
          )}
        </div>

        {/* Active collaborator avatars */}
        {collaborators.length > 0 && (
          <div
            className="rounded-lg bg-panel-bg px-2 py-1 shadow-sm backdrop-blur-sm"
            style={{ border: "1px solid var(--panel-border)" }}
          >
            <ActiveUsersPanel collaborators={collaborators} maxVisible={5} />
          </div>
        )}

        {/* Share button */}
        <button
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          onClick={handleShare}
          aria-label="Copy board link"
        >
          <Share2 className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
    </div>
  );
}
