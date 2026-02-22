"use client";

import { cn } from "@/lib/utils";

interface HintProps {
  /** Tooltip text */
  label: string;
  children: React.ReactNode;
  /** Which side to show the tooltip */
  side?: "top" | "bottom" | "left" | "right";
  /** Horizontal alignment */
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * Simple CSS-only tooltip component.
 * Wraps children with a hover tooltip — no JS overhead.
 *
 * @example
 * <Hint label="Delete board">
 *   <button>🗑️</button>
 * </Hint>
 */
export function Hint({
  label,
  children,
  side = "top",
  className,
}: HintProps) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className={cn("group relative inline-flex", className)}>
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100",
          positionClasses[side]
        )}
        role="tooltip"
      >
        {label}
      </span>
    </div>
  );
}
