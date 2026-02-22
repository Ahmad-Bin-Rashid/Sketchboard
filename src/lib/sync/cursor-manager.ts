/**
 * Cursor position manager — handles coordinate transforms and smoothing.
 *
 * Responsibilities:
 * 1. Convert between canvas (page) coordinates and screen (viewport) coordinates
 *    using tldraw's editor camera transforms
 * 2. Throttle cursor position broadcasts to avoid flooding the network
 * 3. Smooth remote cursor movement via linear interpolation (lerp)
 *
 * Coordinate systems:
 * - Page coordinates: Infinite canvas space where shapes live (stable across zoom/pan)
 * - Viewport coordinates: Screen pixel positions (change when user zooms or pans)
 *
 * Data flow for LOCAL cursor:
 *   pointermove (screen coords) → screenToPage() → awarenessManager.updateCursor()
 *
 * Data flow for REMOTE cursor:
 *   awareness state (page coords) → pageToScreen() → CSS transform on cursor element
 */

import type { Editor } from "tldraw";
import { COLLABORATION } from "@/lib/constants";

// ─── Throttle ────────────────────────────────────────────────────────────────

/**
 * Create a throttled version of a function.
 * Uses trailing-edge throttle — the last call within the window always fires.
 */
export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  ms: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime = 0;

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - lastCallTime);

    if (remaining <= 0) {
      // Enough time has passed — call immediately
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCallTime = now;
      fn(...(args as Parameters<T>));
    } else {
      // Schedule trailing call
      lastArgs = args;
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now();
          timeoutId = null;
          if (lastArgs) {
            fn(...(lastArgs as Parameters<T>));
            lastArgs = null;
          }
        }, remaining);
      }
    }
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  return throttled;
}

// ─── Coordinate Transforms ──────────────────────────────────────────────────

/**
 * Convert screen (viewport) coordinates to page (canvas) coordinates.
 *
 * Used when broadcasting local cursor position: the pointermove event
 * gives us screen coords, but we need to store page coords so remote
 * users see the cursor at the correct position regardless of their zoom/pan.
 */
export function screenToPage(
  editor: Editor,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  const point = editor.screenToPage({ x: screenX, y: screenY });
  return { x: point.x, y: point.y };
}

/**
 * Convert page (canvas) coordinates to screen (viewport) coordinates.
 *
 * Used when rendering remote cursors: their positions are stored in
 * page coords, but we need screen coords for CSS positioning.
 */
export function pageToScreen(
  editor: Editor,
  pageX: number,
  pageY: number
): { x: number; y: number } {
  const point = editor.pageToViewport({ x: pageX, y: pageY });
  return { x: point.x, y: point.y };
}

// ─── Interpolation ──────────────────────────────────────────────────────────

/**
 * Linearly interpolate between two values.
 * @param start Starting value
 * @param end   Target value
 * @param t     Progress (0 = start, 1 = end)
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Smoothed cursor position — stores current and target positions
 * and interpolates between them per animation frame.
 */
export interface SmoothedCursor {
  /** Current interpolated position (for rendering) */
  currentX: number;
  currentY: number;
  /** Target position (latest from awareness) */
  targetX: number;
  targetY: number;
}

/**
 * Update a smoothed cursor toward its target position.
 * Call this in a requestAnimationFrame loop.
 *
 * @param cursor The cursor state to update in place
 * @param factor Interpolation speed (0-1, higher = faster). 0.3 = smooth, 0.6 = snappy
 * @returns Whether the cursor is still moving (needs another frame)
 */
export function updateSmoothedCursor(
  cursor: SmoothedCursor,
  factor: number = 0.4
): boolean {
  const dx = cursor.targetX - cursor.currentX;
  const dy = cursor.targetY - cursor.currentY;

  // Stop animating when close enough (< 0.5px)
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
    cursor.currentX = cursor.targetX;
    cursor.currentY = cursor.targetY;
    return false;
  }

  cursor.currentX = lerp(cursor.currentX, cursor.targetX, factor);
  cursor.currentY = lerp(cursor.currentY, cursor.targetY, factor);
  return true;
}

// ─── Cursor Broadcast ───────────────────────────────────────────────────────

/**
 * Create a throttled cursor broadcast function.
 *
 * Binds to a tldraw editor and an awareness manager to:
 * 1. Convert screen coordinates to page coordinates
 * 2. Throttle broadcasts at ~15fps
 * 3. Handle pointer leave (clear cursor)
 *
 * Usage:
 * ```ts
 * const broadcast = createCursorBroadcast(editor, awarenessManager);
 * canvas.addEventListener("pointermove", broadcast.onPointerMove);
 * canvas.addEventListener("pointerleave", broadcast.onPointerLeave);
 * // on cleanup:
 * broadcast.dispose();
 * ```
 */
export function createCursorBroadcast(
  editor: Editor,
  awarenessManager: { updateCursor: (x: number, y: number) => void; clearCursor: () => void }
) {
  const throttledUpdate = throttle((x: number, y: number) => {
    const pagePoint = screenToPage(editor, x, y);
    awarenessManager.updateCursor(pagePoint.x, pagePoint.y);
  }, COLLABORATION.CURSOR_THROTTLE_MS);

  return {
    onPointerMove: (e: PointerEvent | { clientX: number; clientY: number }) => {
      throttledUpdate(e.clientX, e.clientY);
    },

    onPointerLeave: () => {
      throttledUpdate.cancel();
      awarenessManager.clearCursor();
    },

    dispose: () => {
      throttledUpdate.cancel();
    },
  };
}
