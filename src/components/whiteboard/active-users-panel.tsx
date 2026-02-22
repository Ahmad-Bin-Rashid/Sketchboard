"use client";

/**
 * ActiveUsersPanel — floating panel showing connected collaborators.
 *
 * Positioned in the board header area, this shows:
 * - Stacked avatar circles for each connected user
 * - Green/amber dot indicating active/idle status
 * - Tooltip with user name on hover
 * - Expandable list on click (when > 3 users)
 *
 * This replaces the simple peer count number in the board header
 * with a richer visual indicator of who's on the board.
 */

import { memo, useState } from "react";
import type { CollaboratorInfo } from "@/types";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveUsersPanelProps {
  /** List of connected collaborators (excluding self) */
  collaborators: CollaboratorInfo[];
  /** Maximum avatars to show before "+N" overflow */
  maxVisible?: number;
  className?: string;
}

interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  color: string;
  isActive: boolean;
  /** Negative margin offset for stacking */
  stackIndex: number;
}

// ─── User Avatar ─────────────────────────────────────────────────────────────

const UserAvatar = memo(function UserAvatar({
  name,
  color,
  isActive,
  stackIndex,
}: UserAvatarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="group relative"
      style={{
        marginLeft: stackIndex > 0 ? "-6px" : "0",
        zIndex: 10 - stackIndex,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Avatar circle */}
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-panel-bg text-[10px] font-semibold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>

      {/* Activity indicator dot */}
      <div
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-panel-bg",
          isActive ? "bg-emerald-500" : "bg-amber-400"
        )}
      />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-md">
          {name}
          {!isActive && " (idle)"}
        </div>
      )}
    </div>
  );
});

// ─── Overflow Badge ──────────────────────────────────────────────────────────

function OverflowBadge({
  count,
  stackIndex,
}: {
  count: number;
  stackIndex: number;
}) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-panel-bg bg-surface-hover text-[10px] font-semibold text-muted-foreground shadow-sm"
      style={{
        marginLeft: stackIndex > 0 ? "-6px" : "0",
        zIndex: 10 - stackIndex,
      }}
    >
      +{count}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export const ActiveUsersPanel = memo(function ActiveUsersPanel({
  collaborators,
  maxVisible = 4,
  className,
}: ActiveUsersPanelProps) {
  if (collaborators.length === 0) return null;

  const visible = collaborators.slice(0, maxVisible);
  const overflowCount = collaborators.length - maxVisible;

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((user, i) => (
        <UserAvatar
          key={user.clientId}
          name={user.name}
          avatarUrl={user.avatarUrl}
          color={user.color}
          isActive={user.isActive}
          stackIndex={i}
        />
      ))}
      {overflowCount > 0 && (
        <OverflowBadge count={overflowCount} stackIndex={visible.length} />
      )}
    </div>
  );
});
