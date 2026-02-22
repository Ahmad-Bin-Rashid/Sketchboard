"use client";

/**
 * CursorAvatar — renders a single remote user's cursor on the canvas.
 *
 * Visual elements:
 * ┌──────────────────────────┐
 * │  ↗ (SVG pointer arrow)   │  ← Colored cursor arrow
 * │    ┌──────────────┐      │
 * │    │  User Name   │      │  ← Name label (fades when idle)
 * │    └──────────────┘      │
 * └──────────────────────────┘
 *
 * The cursor is positioned via CSS transform at viewport coordinates.
 * Coordinate conversion (page → viewport) happens in the parent overlay.
 *
 * States:
 * - Active: full opacity, name label visible
 * - Idle:   40% opacity, name label hidden (after 30s inactivity)
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

interface CursorAvatarProps {
  /** User display name */
  name: string;
  /** Cursor color (from CURSOR_COLORS palette) */
  color: string;
  /** Whether the user is actively interacting */
  isActive: boolean;
  /** Screen X position (viewport coords) */
  x: number;
  /** Screen Y position (viewport coords) */
  y: number;
}

/**
 * Individual remote cursor with pointer arrow and name label.
 * Memoized to prevent unnecessary re-renders during animation.
 */
export const CursorAvatar = memo(function CursorAvatar({
  name,
  color,
  isActive,
  x,
  y,
}: CursorAvatarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 top-0 transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-40"
      )}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        // GPU-accelerated positioning
        willChange: "transform",
      }}
    >
      {/* Cursor arrow SVG */}
      <svg
        width="18"
        height="22"
        viewBox="0 0 18 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Arrow body */}
        <path
          d="M1.5 1L16 11.5L9.5 12.5L6.5 20.5L1.5 1Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label — positioned below and to the right of the arrow tip */}
      <div
        className={cn(
          "absolute left-4 top-4 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium text-white shadow-sm transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
});
