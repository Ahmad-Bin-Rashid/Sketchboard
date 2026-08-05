"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { screenToCanvas, pointsToBoundingBox, simplifyPath } from "@/lib/coordinate-helpers";
import type { CustomShape } from "@/types/whiteboard";
import { ShapeRenderer } from "./shapes/shape-renderer";
import { nanoid } from "nanoid";
import { generateNewTopIndex } from "@/lib/fractional-index";



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
    setActiveTool,
    shapes,
    draftShape,
    setDraftShape,
    setSelectedShapeIds,
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

  // Pointer Down handler
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return;
      
      const isMiddleClick = e.button === 1;
      const isSpacePan = e.button === 0 && isSpacePressed;

      // 1. Check if panning is triggered
      if (isMiddleClick || isSpacePan) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }

      const target = e.target as HTMLElement;
      const isCanvasBackground =
        target.classList.contains("canvas-bg-grid") ||
        target.classList.contains("canvas-viewport") ||
        target.classList.contains("board-container");

      // 2. Select tool click panning on empty background
      if (activeTool === "select" && isCanvasBackground) {
        // Deselect when clicking empty background
        setSelectedShapeIds([]);
        
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }

      // 3. Shape Creation Mode
      if (activeTool !== "select" && e.button === 0 && isCanvasBackground) {
        const rect = viewportRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);
        dragStartRef.current = canvasPos;

        const id = nanoid();
        const index = generateNewTopIndex(Object.values(shapes));

        let newShape: CustomShape;

        if (activeTool === "draw") {
          newShape = {
            id,
            type: "draw",
            x: canvasPos.x,
            y: canvasPos.y,
            width: 0,
            height: 0,
            fill: "transparent",
            stroke: "#78716c", // default Stone color
            strokeWidth: 4,
            opacity: 1.0,
            index,
            points: [[canvasPos.x, canvasPos.y, e.pressure || 0.5]],
          };
        } else {
          const defaultFill = activeTool === "sticky" ? "#fef9c3" : "transparent";
          const defaultStroke = activeTool === "sticky" ? "#1e293b" : "#78716c";
          
          newShape = {
            id,
            type: activeTool,
            x: canvasPos.x,
            y: canvasPos.y,
            width: 0,
            height: 0,
            fill: defaultFill,
            stroke: defaultStroke,
            strokeWidth: 2,
            opacity: 1.0,
            index,
            ...(activeTool === "text" || activeTool === "sticky" ? { text: "", fontSize: 16 } : {}),
            ...(activeTool === "text" ? { fontFamily: "sans-serif" } : {}),
          } as CustomShape;
        }

        setDraftShape(newShape);
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
      }
    },
    [activeTool, isSpacePressed, pan, zoom, shapes, setDraftShape, setSelectedShapeIds, viewportRef]
  );

  // Pointer Move handler
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanning) {
        const newX = e.clientX - panStartRef.current.x;
        const newY = e.clientY - panStartRef.current.y;
        setPan({ x: newX, y: newY });
        e.stopPropagation();
        return;
      }

      if (draftShape && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);

        if (draftShape.type === "draw") {
          const nextPoints = [
            ...draftShape.points,
            [canvasPos.x, canvasPos.y, e.pressure || 0.5] as [number, number, number],
          ];
          const bounds = pointsToBoundingBox(nextPoints);

          setDraftShape({
            ...draftShape,
            points: nextPoints,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          });
        } else {
          const start = dragStartRef.current;
          const x = Math.min(start.x, canvasPos.x);
          const y = Math.min(start.y, canvasPos.y);
          const width = Math.abs(canvasPos.x - start.x);
          const height = Math.abs(canvasPos.y - start.y);

          setDraftShape({
            ...draftShape,
            x,
            y,
            width,
            height,
          });
        }
        e.stopPropagation();
      }
    },
    [isPanning, draftShape, pan, zoom, setPan, setDraftShape, viewportRef]
  );

  // Pointer Up handler
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanning) {
        setIsPanning(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }

      if (draftShape) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.stopPropagation();

        let finalShape = { ...draftShape };
        let isValid = true;

        if (finalShape.type === "draw") {
          // Simplify freehand path using Douglas-Peucker
          const simplified = simplifyPath(finalShape.points, 1.5);
          const bounds = pointsToBoundingBox(simplified);
          
          if (simplified.length < 2 || (bounds.width < 5 && bounds.height < 5)) {
            isValid = false;
          } else {
            finalShape.points = simplified;
            finalShape.x = bounds.x;
            finalShape.y = bounds.y;
            finalShape.width = bounds.width;
            finalShape.height = bounds.height;
          }
        } else {
          // If shape has no size (single click-create), apply defaults for text/sticky
          if (finalShape.width < 5 || finalShape.height < 5) {
            if (finalShape.type === "text" || finalShape.type === "sticky") {
              finalShape.width = 160;
              finalShape.height = finalShape.type === "text" ? 40 : 120;
              // Center the clicked coordinate as the shape's center
              finalShape.x = finalShape.x - finalShape.width / 2;
              finalShape.y = finalShape.y - finalShape.height / 2;
            } else {
              isValid = false;
            }
          }
        }

        if (isValid && shapesMap) {
          const doc = shapesMap.doc;
          if (doc) {
            doc.transact(() => {
              shapesMap.set(finalShape.id, finalShape);
            });
          }
          // Focus selection on the newly created shape
          setSelectedShapeIds([finalShape.id]);
        }

        setDraftShape(null);
        setActiveTool("select");
      }
    },
    [isPanning, draftShape, shapesMap, setDraftShape, setActiveTool, setSelectedShapeIds]
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

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const isCanvasBackground =
        target.classList.contains("canvas-bg-grid") ||
        target.classList.contains("canvas-viewport") ||
        target.classList.contains("board-container");

      if (isCanvasBackground && shapesMap && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);

        const id = nanoid();
        const index = generateNewTopIndex(Object.values(shapes));
        
        const newShape: CustomShape = {
          id,
          type: "text",
          x: canvasPos.x - 80, // Center on double click coordinate
          y: canvasPos.y - 20,
          width: 160,
          height: 40,
          fill: "transparent",
          stroke: "#78716c", // default Stone
          strokeWidth: 2,
          opacity: 1.0,
          index,
          text: "",
          fontSize: 16,
          fontFamily: "sans-serif",
        };

        const doc = shapesMap.doc;
        if (doc) {
          doc.transact(() => {
            shapesMap.set(id, newShape);
          });
        }
        
        setActiveTool("select");
        setSelectedShapeIds([id]);
      }
    },
    [shapesMap, pan, zoom, shapes, setActiveTool, setSelectedShapeIds, viewportRef]
  );

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
      onDoubleClick={handleDoubleClick}
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
