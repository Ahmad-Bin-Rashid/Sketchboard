"use client";

/**
 * useCursorBroadcast — broadcasts local cursor position to remote peers.
 *
 * Uses tldraw's editor event system (`editor.on("event", ...)`) instead of
 * a store listener. The editor event API fires on every pointer interaction
 * including during active drawing, unlike the session-scope store listener
 * which only fires on camera/selection changes.
 *
 * Architecture:
 * 1. editor.on("event") catches ALL tldraw pointer events (move, drag, draw, etc.)
 * 2. We extract the current page point from editor.inputs.currentPagePoint
 * 3. Throttled broadcast via awarenessManager.updateCursor() at ~30fps
 * 4. pointerleave on the container clears the cursor
 * 5. Idle timer marks user inactive after IDLE_TIMEOUT_MS with no movement
 *
 * Why editor.on("event") works during drawing:
 * - tldraw's tools handle pointer events internally and update editor.inputs
 * - The "event" callback fires after the tool processes each input event
 * - editor.inputs.currentPagePoint is always the latest position in page coords
 * - This runs even when the draw/pencil/arrow tool is active
 */

import { useEffect, useRef } from "react";
import type { Editor, TLEventInfo } from "tldraw";
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

    // Throttled broadcast at 30fps (33ms) — responsive enough to feel live
    const throttledBroadcast = throttle((x: number, y: number) => {
      awarenessManager.updateCursor(x, y);
    }, Math.min(COLLABORATION.CURSOR_THROTTLE_MS, 33));

    // Reset idle timer on any movement
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        awarenessManager.markIdle();
      }, COLLABORATION.IDLE_TIMEOUT_MS);
    };

    /**
     * tldraw editor event handler.
     *
     * Fires after every input event processed by the active tool,
     * including during freehand drawing, dragging shapes, etc.
     * `editor.inputs.currentPagePoint` is always up to date at this point.
     */
    const handleEditorEvent = (_event: TLEventInfo) => {
      const point = editor.inputs.currentPagePoint;

      // Only broadcast if position actually changed (avoids redundant broadcasts
      // for keyboard events, focus events, etc. that don't move the cursor)
      if (point.x === lastX && point.y === lastY) return;
      lastX = point.x;
      lastY = point.y;

      throttledBroadcast(point.x, point.y);
      resetIdleTimer();
    };

    // Subscribe to all tldraw editor events
    editor.on("event", handleEditorEvent);

    // ─── Pointer leave: clear cursor when mouse exits the canvas ──────

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

    // ─── Cleanup ───────────────────────────────────────────────────────

    return () => {
      editor.off("event", handleEditorEvent);
      container.removeEventListener("pointerleave", handlePointerLeave);
      throttledBroadcast.cancel();

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [editor, awarenessManager]);
}
