"use client";

/**
 * RemoteCursors — overlay layer that renders all connected users' cursors.
 *
 * Architecture:
 * - Sits as a full-screen overlay above the tldraw canvas
 * - pointer-events: none so it doesn't block canvas interaction
 * - Subscribes to the awareness manager for remote cursor positions
 * - Uses requestAnimationFrame for smooth cursor interpolation
 * - Converts page coordinates → viewport coordinates each frame
 *
 * Performance:
 * - Memoized CursorAvatar components prevent unnecessary child re-renders
 * - SmoothedCursor interpolation runs at display refresh rate
 * - Stale cursors (user left) are cleaned up immediately by awareness protocol
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { Editor } from "tldraw";
import type { AwarenessManager } from "@/lib/sync/awareness";
import type { CursorPresence } from "@/types";
import {
  pageToScreen,
  updateSmoothedCursor,
  type SmoothedCursor,
} from "@/lib/sync/cursor-manager";
import { CursorAvatar } from "./cursor-avatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemoteCursorsProps {
  /** tldraw editor instance for coordinate transforms */
  editor: Editor;
  /** Awareness manager providing remote user data */
  awarenessManager: AwarenessManager;
}

/** Internal state for each remote cursor with smoothing */
interface CursorState {
  presence: CursorPresence;
  smoothed: SmoothedCursor;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RemoteCursors({ editor, awarenessManager }: RemoteCursorsProps) {
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

    for (const presence of remoteCursors) {
      const existing = currentMap.get(presence.clientId);

      if (existing) {
        // Update target position and presence info
        const screenPos = pageToScreen(editor, presence.x, presence.y);
        existing.presence = presence;
        existing.smoothed.targetX = screenPos.x;
        existing.smoothed.targetY = screenPos.y;
        newMap.set(presence.clientId, existing);
      } else {
        // New cursor — start at target position (no initial lerp)
        const screenPos = pageToScreen(editor, presence.x, presence.y);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, awarenessManager]);

  /**
   * Animation loop — interpolates all cursors toward their targets
   * and triggers React re-render with updated positions.
   */
  const animate = useCallback(() => {
    const map = cursorsRef.current;
    let anyMoving = false;

    map.forEach((state) => {
      const still = !updateSmoothedCursor(state.smoothed, 0.4);
      if (!still) anyMoving = true;
    });

    // Update React state for re-render
    setCursors(new Map(map));

    if (anyMoving) {
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
   * tldraw's camera transform affects pageToScreen conversion.
   */
  const updateScreenPositions = useCallback(() => {
    const map = cursorsRef.current;
    if (map.size === 0) return;

    map.forEach((state) => {
      const screenPos = pageToScreen(
        editor,
        state.presence.x,
        state.presence.y
      );
      state.smoothed.targetX = screenPos.x;
      state.smoothed.targetY = screenPos.y;
      // Snap current to target on camera change for instant repositioning
      state.smoothed.currentX = screenPos.x;
      state.smoothed.currentY = screenPos.y;
    });

    setCursors(new Map(map));
  }, [editor]);

  // Subscribe to awareness changes
  useEffect(() => {
    const unsub = awarenessManager.onRemoteChange(syncFromAwareness);
    // Initial sync
    syncFromAwareness();
    return unsub;
  }, [awarenessManager, syncFromAwareness]);

  // Subscribe to camera changes for coordinate re-projection
  useEffect(() => {
    const unsubscribe = editor.store.listen(
      () => {
        updateScreenPositions();
      },
      {
        source: "all",
        scope: "session",
      }
    );
    return unsubscribe;
  }, [editor, updateScreenPositions]);

  // Cleanup animation loop on unmount
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  // ─── Render ─────────────────────────────────────────────────────────

  if (cursors.size === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[250] overflow-hidden"
      aria-hidden="true"
    >
      {Array.from(cursors.values()).map(({ presence, smoothed }) => (
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
