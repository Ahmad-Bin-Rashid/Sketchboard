"use client";

/**
 * Board header — floating top bar on the canvas.
 *
 * Shows:
 * - Back button to dashboard
 * - Board name (editable in Phase 6)
 * - Live collaborator count (from Yjs awareness)
 * - Connection status dot
 * - Share button (Phase 7)
 */

import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { type ConnectionStatus, getConnectionDotColor } from "@/lib/sync/connection";
import { cn } from "@/lib/utils";

interface BoardHeaderProps {
  boardId: string;
  boardName: string;
  /** Number of connected peers (including self) */
  peerCount: number;
  /** Current WebSocket connection status */
  connectionStatus: ConnectionStatus;
}

export function BoardHeader({
  boardId,
  boardName,
  peerCount,
  connectionStatus,
}: BoardHeaderProps) {
  const isConnected = connectionStatus === "connected";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[300] flex items-start justify-between p-3">
      {/* Left: Back + board name */}
      <div className="pointer-events-auto flex items-center gap-2">
        <Link
          href={ROUTES.DASHBOARD}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-panel-bg text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div
          className="flex items-center gap-2 rounded-lg bg-panel-bg px-3 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          <h1 className="text-sm font-medium">{boardName}</h1>
        </div>
      </div>

      {/* Right: Connection + Collaborators + Share */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Connection + Collaborator count */}
        <div
          className="flex items-center gap-2 rounded-lg bg-panel-bg px-3 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          {/* Connection dot */}
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              getConnectionDotColor(connectionStatus),
              connectionStatus === "connecting" && "animate-pulse"
            )}
          />

          {/* Peer count */}
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-muted-foreground" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>

          <div className="h-3.5 w-px bg-border" />

          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {Math.max(1, peerCount)}
          </span>
        </div>

        {/* Share button — placeholder for Phase 7 */}
        <button
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}/board/${boardId}`
            );
          }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}
