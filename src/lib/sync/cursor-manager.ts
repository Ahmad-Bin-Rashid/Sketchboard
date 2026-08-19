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

