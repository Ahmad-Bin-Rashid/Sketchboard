"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { screenToCanvas } from "@/lib/coordinate-helpers";
import type { CustomShape } from "@/types/whiteboard";
import { ShapeRenderer } from "./shapes/shape-renderer";


interface CanvasProps {
  shapesMap: Y.Map<CustomShape> | null;
  undoManager: Y.UndoManager | null;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

export function Canvas({ shapesMap, undoManager, viewportRef }: CanvasProps) {
  const {
    pan,
    zoom,
    setPan,
    setZoom,
    activeTool,
    shapes,
    draftShape,
    rubberBandRect,
  } = useWhiteboardStore();

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Touch tracking state
  const touchStartRef = useRef<{
    distance: number;
    zoom: number;
    pan: { x: number; y: number };
    midpoint: { x: number; y: number };
  } | null>(null);

  // Monitor Spacebar key state globally for panning mode toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // Prevent default spacebar page scrolling
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Pan action triggers: pointerdown
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const isMiddleClick = e.button === 1;
      const isSpacePan = e.button === 0 && isSpacePressed;

      if (isMiddleClick || isSpacePan || activeTool === "select") {
        // Check if clicked directly on blank canvas area (or selection box background)
        const target = e.target as HTMLElement;
        const isCanvasBackground =
          target.classList.contains("canvas-bg-grid") ||
          target.classList.contains("canvas-viewport") ||
          target.classList.contains("board-container");

        // Middle-click and Spacebar-click can always pan.
        // Left-click with select tool can only pan if clicking on empty background.
        if (isMiddleClick || isSpacePan || isCanvasBackground) {
          setIsPanning(true);
          panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.stopPropagation();
          return;
        }
      }
    },
    [activeTool, isSpacePressed, pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanning) {
        const newX = e.clientX - panStartRef.current.x;
        const newY = e.clientY - panStartRef.current.y;
        setPan({ x: newX, y: newY });
        e.stopPropagation();
        return;
      }
    },
    [isPanning, setPan]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanning) {
        setIsPanning(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }
    },
    [isPanning]
  );

  // Zoom centered under pointer: wheel scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!viewportRef.current) return;

      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom factor calculation
      const zoomFactor = 1.1;
      const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
      const clampedZoom = Math.max(0.1, Math.min(20, nextZoom));

      // Keep the coordinate under the mouse cursor fixed in space
      const newPanX = mouseX - (mouseX - pan.x) * (clampedZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (clampedZoom / zoom);

      setZoom(clampedZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [pan, zoom, setPan, setZoom, viewportRef]
  );

  // Helper: compute distance between two touches
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  // Helper: compute midpoint between two touches
  const getTouchMidpoint = (t1: React.Touch, t2: React.Touch, rect: DOMRect) => {
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top,
    };
  };

  // Touch handlers for mobile pinch-to-zoom & pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        touchStartRef.current = {
          distance: getTouchDistance(t1, t2),
          zoom,
          pan: { ...pan },
          midpoint: getTouchMidpoint(t1, t2, rect),
        };
      }
    },
    [pan, zoom, viewportRef]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && touchStartRef.current && viewportRef.current) {
        e.preventDefault();
        const rect = viewportRef.current.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const start = touchStartRef.current;
        const currentDistance = getTouchDistance(t1, t2);
        const currentMidpoint = getTouchMidpoint(t1, t2, rect);

        // Calculate new zoom factor
        const scale = currentDistance / start.distance;
        const nextZoom = start.zoom * scale;
        const clampedZoom = Math.max(0.1, Math.min(20, nextZoom));

        // Pan displacement due to midpoint movement
        const dx = currentMidpoint.x - start.midpoint.x;
        const dy = currentMidpoint.y - start.midpoint.y;

        // Combine midpoint shift and zoom-pinning transform adjustments
        const newPanX =
          currentMidpoint.x -
          (currentMidpoint.x - start.pan.x - dx) * (clampedZoom / start.zoom);
        const newPanY =
          currentMidpoint.y -
          (currentMidpoint.y - start.pan.y - dy) * (clampedZoom / start.zoom);

        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    },
    [setPan, setZoom, viewportRef]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport relative h-full w-full overflow-hidden select-none"
      style={{
        touchAction: "none",
        cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : "default",
        background: "var(--background)",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative Canvas Background Grid Pattern */}
      <div
        className="canvas-bg-grid absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(var(--panel-border) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          opacity: 0.4,
        }}
      />

      {/* Inner transformation layer */}
      <div
        className="board-container absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: "100%",
          height: "100%",
        }}
      >
        {Object.values(shapes)
          .sort((a, b) => a.index.localeCompare(b.index))
          .map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              shapesMap={shapesMap}
            />
          ))}
        {draftShape && (
          <ShapeRenderer
            shape={draftShape}
            shapesMap={shapesMap}
            isDraft
          />
        )}
      </div>
    </div>
  );
}
