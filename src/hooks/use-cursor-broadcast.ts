"use client";

import { useEffect, useRef } from "react";
import type { AwarenessManager } from "@/lib/sync/awareness";
import { throttle } from "@/lib/sync/cursor-manager";
import { COLLABORATION } from "@/lib/constants";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { screenToCanvas } from "@/lib/coordinate-helpers";

export interface UseCursorBroadcastOptions {
  /** Outer viewport element ref */
  viewportRef: React.RefObject<HTMLDivElement | null>;
  /** Awareness manager for broadcasting cursor state */
  awarenessManager: AwarenessManager | null;
}

export function useCursorBroadcast({
  viewportRef,
  awarenessManager,
}: UseCursorBroadcastOptions): void {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTool = useWhiteboardStore((s) => s.activeTool);

  const laserPointsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container || !awarenessManager) return;

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

    const tickLaser = () => {
      const now = Date.now();
      // Keep points from the last 800ms to draw a trailing laser line
      laserPointsRef.current = laserPointsRef.current.filter(
        (p) => now - p.time < 800
      );

      const pathData = laserPointsRef.current.map((p) => [p.x, p.y] as [number, number]);
      awarenessManager.updateLaserPath(pathData);

      if (laserPointsRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(tickLaser);
      } else {
        animationFrameRef.current = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const { pan, zoom } = useWhiteboardStore.getState();
      const rect = container.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);

      // Only broadcast if position actually changed in canvas space
      if (canvasPos.x === lastX && canvasPos.y === lastY) return;
      lastX = canvasPos.x;
      lastY = canvasPos.y;

      throttledBroadcast(canvasPos.x, canvasPos.y);
      resetIdleTimer();

      if (activeTool === "laser") {
        laserPointsRef.current.push({ x: canvasPos.x, y: canvasPos.y, time: Date.now() });
        if (!animationFrameRef.current) {
          tickLaser();
        }
      }
    };

    const handlePointerLeave = () => {
      throttledBroadcast.cancel();
      awarenessManager.clearCursor();
      lastX = -Infinity;
      lastY = -Infinity;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      laserPointsRef.current = [];
      awarenessManager.updateLaserPath([]);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    // Cleanup
    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      throttledBroadcast.cancel();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      awarenessManager.updateLaserPath([]);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [viewportRef, awarenessManager, activeTool]);
}
