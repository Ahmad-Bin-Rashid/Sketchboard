"use client";

/**
 * Connection status indicator — shows sync state on the canvas.
 *
 * Displays a small pill in the board header area that shows:
 * - Green dot + "Connected" when synced
 * - Amber dot + "Connecting…" during initial sync or reconnection
 * - Red dot + "Offline" when disconnected (local-only mode)
 *
 * Automatically hides after a few seconds when connected (non-intrusive).
 */

import { useEffect, useState } from "react";
import {
  useConnectionStore,
  getConnectionLabel,
  getConnectionDotColor,
} from "@/lib/sync/connection";
import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  className?: string;
}

export function ConnectionIndicator({ className }: ConnectionIndicatorProps) {
  const status = useConnectionStore((s) => s.status);
  const [visible, setVisible] = useState(true);

  // Auto-hide after 3 seconds when connected
  useEffect(() => {
    if (status === "connected") {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    // Show immediately when not connected
    setVisible(true);
  }, [status]);

  // Always show on hover/click area, but fade when connected
  const label = getConnectionLabel(status);
  const dotColor = getConnectionDotColor(status);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg bg-panel-bg px-2.5 py-1.5 shadow-sm backdrop-blur-sm transition-opacity duration-500",
        !visible && status === "connected" ? "opacity-0" : "opacity-100",
        className
      )}
      style={{ border: "1px solid var(--panel-border)" }}
      // Show on hover even when faded
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => {
        if (status === "connected") {
          setVisible(false);
        }
      }}
    >
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          dotColor,
          status === "connecting" && "animate-pulse"
        )}
      />
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
