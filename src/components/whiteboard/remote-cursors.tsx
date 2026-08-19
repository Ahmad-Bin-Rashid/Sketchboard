"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { AwarenessManager } from "@/lib/sync/awareness";
import type { CursorPresence } from "@/types";
import {
  updateSmoothedCursor,
  type SmoothedCursor,
} from "@/lib/sync/cursor-manager";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { canvasToScreen } from "@/lib/coordinate-helpers";
import { CursorAvatar } from "./cursor-avatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemoteCursorsProps {
  /** Awareness manager providing remote user data */
  awarenessManager: AwarenessManager;
}

/** Internal state for each remote cursor with smoothing */
interface CursorState {
  presence: CursorPresence;
  smoothed: SmoothedCursor;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RemoteCursors({ awarenessManager }: RemoteCursorsProps) {
  const [cursors, setCursors] = useState<Map<number, CursorState>>(new Map());
  const cursorsRef = useRef<Map<number, CursorState>>(new Map());
  const rafRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  /**
   * Update cursor targets from awareness data.
   * Called when awareness fires a change event.
   */
  const syncFromAwareness = useCallback(() => {
    const { cursors: remoteCursors } = awarenessManager.getRemoteUsers();
    const currentMap = cursorsRef.current;
    const newMap = new Map<number, CursorState>();
    const { pan, zoom } = useWhiteboardStore.getState();

    for (const presence of remoteCursors) {
      const existing = currentMap.get(presence.clientId);

      if (existing) {
        // Update target position and presence info
        const screenPos = canvasToScreen(presence.x, presence.y, pan, zoom);
        existing.presence = presence;
        existing.smoothed.targetX = screenPos.x;
        existing.smoothed.targetY = screenPos.y;
        newMap.set(presence.clientId, existing);
      } else {
        // New cursor — start at target position (no initial lerp)
        const screenPos = canvasToScreen(presence.x, presence.y, pan, zoom);
        newMap.set(presence.clientId, {
          presence,
          smoothed: {
            currentX: screenPos.x,
            currentY: screenPos.y,
            targetX: screenPos.x,
            targetY: screenPos.y,
          },
        });
      }
    }

    // Sync local cursor state if a laser trail path is active
    const localPresence = awarenessManager.getLocalPresence();
    if (localPresence && localPresence.laserPath && localPresence.laserPath.length > 0) {
      const existing = currentMap.get(localPresence.clientId);
      if (existing) {
        existing.presence = localPresence;
        newMap.set(localPresence.clientId, existing);
      } else {
        const screenPos = canvasToScreen(localPresence.x, localPresence.y, pan, zoom);
        newMap.set(localPresence.clientId, {
          presence: localPresence,
          smoothed: {
            currentX: screenPos.x,
            currentY: screenPos.y,
            targetX: screenPos.x,
            targetY: screenPos.y,
          },
        });
      }
    }

    cursorsRef.current = newMap;

    // Start animation loop if not already running
    if (!isAnimatingRef.current && newMap.size > 0) {
      startAnimationLoop();
    }

    // If no cursors, stop animation and update state
    if (newMap.size === 0) {
      stopAnimationLoop();
      setCursors(new Map());
    }
  }, [awarenessManager]);

  /**
   * Animation loop — interpolates all cursors toward their targets
   * and triggers React re-render with updated positions.
   */
  const animate = useCallback(() => {
    const map = cursorsRef.current;

    map.forEach((state) => {
      updateSmoothedCursor(state.smoothed, 0.4);
    });

    // Update React state for re-render
    setCursors(new Map(map));

    // Keep looping while there are any cursors
    if (map.size > 0) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      isAnimatingRef.current = false;
    }
  }, []);

  const startAnimationLoop = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const stopAnimationLoop = useCallback(() => {
    isAnimatingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * Also update screen positions when the camera changes (zoom/pan).
   */
  const updateScreenPositions = useCallback(() => {
    const map = cursorsRef.current;
    if (map.size === 0) return;

    const { pan, zoom } = useWhiteboardStore.getState();

    map.forEach((state) => {
      const screenPos = canvasToScreen(
        state.presence.x,
        state.presence.y,
        pan,
        zoom
      );
      state.smoothed.targetX = screenPos.x;
      state.smoothed.targetY = screenPos.y;
      // Snap current to target on camera change for instant repositioning
      state.smoothed.currentX = screenPos.x;
      state.smoothed.currentY = screenPos.y;
    });

    setCursors(new Map(map));
  }, []);

  // Subscribe to awareness changes
  useEffect(() => {
    const unsub = awarenessManager.onRemoteChange(syncFromAwareness);
    // Initial sync
    syncFromAwareness();
    return unsub;
  }, [awarenessManager, syncFromAwareness]);

  // Subscribe to camera changes for coordinate re-projection
  useEffect(() => {
    let lastPan = useWhiteboardStore.getState().pan;
    let lastZoom = useWhiteboardStore.getState().zoom;

    const unsubscribe = useWhiteboardStore.subscribe((state) => {
      if (state.pan !== lastPan || state.zoom !== lastZoom) {
        lastPan = state.pan;
        lastZoom = state.zoom;
        updateScreenPositions();
      }
    });
    return unsubscribe;
  }, [updateScreenPositions]);

  // Cleanup animation loop on unmount
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  // ─── Render ─────────────────────────────────────────────────────────

  const { pan, zoom } = useWhiteboardStore();
  const localClientId = awarenessManager.clientId;

  if (cursors.size === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-250 overflow-hidden"
      aria-hidden="true"
    >
      {/* Laser Trails Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {Array.from(cursors.values()).map(({ presence }) => {
          if (!presence.laserPath || presence.laserPath.length < 2) return null;

          // Convert all path points from canvas space to screen space
          const screenPoints = presence.laserPath.map(([cx, cy]) =>
            canvasToScreen(cx, cy, pan, zoom)
          );

          return (
            <g key={`laser-trail-${presence.clientId}`}>
              {/* Render fading trail line segments */}
              {screenPoints.slice(0, -1).map((p1, idx) => {
                const p2 = screenPoints[idx + 1];
                const opacity = (idx / (screenPoints.length - 1)) * 0.8;
                const width = 2 + (idx / (screenPoints.length - 1)) * 4;
                return (
                  <line
                    key={`laser-seg-${idx}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={presence.color}
                    strokeWidth={width}
                    opacity={opacity}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Render glowing pulse highlight at the tip of the trail */}
              {screenPoints.length > 0 && (
                <>
                  <circle
                    cx={screenPoints[screenPoints.length - 1].x}
                    cy={screenPoints[screenPoints.length - 1].y}
                    r={5}
                    fill={presence.color}
                    opacity={0.9}
                  />
                  <circle
                    cx={screenPoints[screenPoints.length - 1].x}
                    cy={screenPoints[screenPoints.length - 1].y}
                    r={10}
                    fill={presence.color}
                    opacity={0.35}
                    className="animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Cursor Avatars (excluding self) */}
      {Array.from(cursors.values())
        .filter(({ presence }) => presence.clientId !== localClientId)
        .map(({ presence, smoothed }) => (
          <CursorAvatar
            key={presence.clientId}
            name={presence.name}
            color={presence.color}
            isActive={true}
            x={smoothed.currentX}
            y={smoothed.currentY}
          />
        ))}
    </div>
  );
}
