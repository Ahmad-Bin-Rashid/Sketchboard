"use client";

/**
 * useCursorBroadcast — broadcasts local cursor position to remote peers.
 *
 * Instead of relying on DOM events (which may not bubble through tldraw's
 * internal canvas), this hook reads the pointer position directly from
 * tldraw's `editor.inputs.currentPagePoint` via the store listener API.
 *
 * Architecture:
 * 1. editor.store.listen (session scope) fires when pointer record changes
 * 2. We read editor.inputs.currentPagePoint (already in page coords!)
 * 3. Throttled broadcast via awarenessManager.updateCursor()
 * 4. pointerleave on editor.getContainer() clears the cursor
 * 5. Idle timer marks user as inactive after IDLE_TIMEOUT_MS
 *
 * All updates are throttled at ~15fps (66ms) to avoid flooding the network.
 *
 * Usage:
 * ```tsx
 * useCursorBroadcast({ editor, awarenessManager });
 * ```
 */

import { useEffect, useRef } from "react";
import type { Editor } from "tldraw";
import type { AwarenessManager } from "@/lib/sync/awareness";
import { throttle } from "@/lib/sync/cursor-manager";
import { COLLABORATION } from "@/lib/constants";

export interface UseCursorBroadcastOptions {
  /** tldraw Editor instance */
  editor: Editor | null;
  /** Awareness manager for broadcasting cursor state */
  awarenessManager: AwarenessManager | null;
}

export function useCursorBroadcast({
  editor,
  awarenessManager,
}: UseCursorBroadcastOptions): void {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor || !awarenessManager) return;

    let lastX = -Infinity;
    let lastY = -Infinity;

    // Throttled awareness broadcast
    const throttledBroadcast = throttle((x: number, y: number) => {
      awarenessManager.updateCursor(x, y);
    }, COLLABORATION.CURSOR_THROTTLE_MS);

    // Reset idle timer on movement
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        awarenessManager.markIdle();
      }, COLLABORATION.IDLE_TIMEOUT_MS);
    };

    // ─── Store listener: fires on session-scope changes (pointer, camera, etc.) ──

    const unsubStore = editor.store.listen(
      () => {
        const point = editor.inputs.currentPagePoint;
        if (point.x !== lastX || point.y !== lastY) {
          lastX = point.x;
          lastY = point.y;
          throttledBroadcast(point.x, point.y);
          resetIdleTimer();
        }
      },
      { source: "user", scope: "session" }
    );

    // ─── Pointer leave: clear cursor when mouse exits the canvas ──

    const container = editor.getContainer();

    const handlePointerLeave = () => {
      throttledBroadcast.cancel();
      awarenessManager.clearCursor();
      lastX = -Infinity;
      lastY = -Infinity;

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    container.addEventListener("pointerleave", handlePointerLeave);

    // ─── Cleanup ─────────────────────────────────────────────────

    return () => {
      unsubStore();
      container.removeEventListener("pointerleave", handlePointerLeave);
      throttledBroadcast.cancel();

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [editor, awarenessManager]);
}
