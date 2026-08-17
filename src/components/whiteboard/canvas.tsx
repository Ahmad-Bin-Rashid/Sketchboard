"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { screenToCanvas, pointsToBoundingBox, simplifyPath } from "@/lib/coordinate-helpers";
import type { CustomShape } from "@/types/whiteboard";
import { ShapeRenderer } from "./shapes/shape-renderer";
import { SelectionBox } from "./selection-box";
import { nanoid } from "nanoid";
import { generateNewTopIndex } from "@/lib/fractional-index";
import { SHAPE_DEFAULTS } from "@/lib/constants";
import { addImageShapes } from "@/lib/board-actions";
import { useTheme } from "@/components/theme-provider";



interface CanvasProps {
  shapesMap: Y.Map<CustomShape> | null;
  undoManager: Y.UndoManager | null;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  uploadMedia: (file: File) => Promise<string>;
}

export function Canvas({ shapesMap, undoManager, viewportRef, uploadMedia }: CanvasProps) {
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
    setRubberBandRect,
    showGrid,
  } = useWhiteboardStore();

  const { resolvedTheme } = useTheme();
  const defaultStrokeColor = resolvedTheme === "dark" ? "#ffffff" : "#1c1917";

  console.log("[Canvas] Rendered. Zoom:", zoom, "Pan:", pan);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Touch tracking — snapshot captured at gesture start to avoid per-frame zoom accumulation
  const touchStartRef = useRef<{
    distance: number;
    zoom: number;
    pan: { x: number; y: number };
    midpoint: { x: number; y: number };
  } | null>(null);

  // Monitor Spacebar key state globally for panning mode toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }
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

      // 2. Select tool rubber-band selection on empty background
      if (activeTool === "select" && isCanvasBackground) {
        setSelectedShapeIds([]);
        
        const rect = viewportRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);
        dragStartRef.current = canvasPos;
        setRubberBandRect({ x: canvasPos.x, y: canvasPos.y, width: 0, height: 0 });
        
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
            stroke: defaultStrokeColor, // default theme color
            strokeWidth: 4,
            opacity: 1.0,
            index,
            points: [[canvasPos.x, canvasPos.y, e.pressure || 0.5]],
          };
        } else {
          const defaultFill = activeTool === "sticky" ? SHAPE_DEFAULTS.STICKY_FILL : "transparent";
          const defaultStroke = activeTool === "sticky" ? SHAPE_DEFAULTS.STICKY_STROKE : defaultStrokeColor;
          const isLineOrArrow = activeTool === "line" || activeTool === "arrow";
          
          newShape = {
            id,
            type: activeTool,
            x: canvasPos.x,
            y: canvasPos.y,
            width: 0,
            height: 0,
            fill: defaultFill,
            stroke: defaultStroke,
            strokeWidth: activeTool === "sticky" ? 1 : 2,
            opacity: 1.0,
            index,
            ...(activeTool === "text" || activeTool === "sticky" ? { text: "", fontSize: SHAPE_DEFAULTS.FONT_SIZE, fontFamily: SHAPE_DEFAULTS.FONT_FAMILY } : {}),
            ...(isLineOrArrow ? { x1n: 0, y1n: 0, x2n: 0, y2n: 0 } : {}),
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

      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);

        if (rubberBandRect) {
          const start = dragStartRef.current;
          const x = Math.min(start.x, canvasPos.x);
          const y = Math.min(start.y, canvasPos.y);
          const width = Math.abs(canvasPos.x - start.x);
          const height = Math.abs(canvasPos.y - start.y);

          setRubberBandRect({ x, y, width, height });
          e.stopPropagation();
          return;
        }

        if (draftShape) {
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
            const { snapToGrid } = useWhiteboardStore.getState();

            let startX = start.x;
            let startY = start.y;
            let currentX = canvasPos.x;
            let currentY = canvasPos.y;

            if (snapToGrid) {
              startX = Math.round(startX / SHAPE_DEFAULTS.GRID_SIZE) * SHAPE_DEFAULTS.GRID_SIZE;
              startY = Math.round(startY / SHAPE_DEFAULTS.GRID_SIZE) * SHAPE_DEFAULTS.GRID_SIZE;
              currentX = Math.round(currentX / SHAPE_DEFAULTS.GRID_SIZE) * SHAPE_DEFAULTS.GRID_SIZE;
              currentY = Math.round(currentY / SHAPE_DEFAULTS.GRID_SIZE) * SHAPE_DEFAULTS.GRID_SIZE;
            }

            const isLineOrArrow = draftShape.type === "line" || draftShape.type === "arrow";

            if (isLineOrArrow && e.shiftKey) {
              const dx = currentX - startX;
              const dy = currentY - startY;
              const angle = Math.atan2(dy, dx);
              const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
              const distance = Math.hypot(dx, dy);
              currentX = startX + distance * Math.cos(snappedAngle);
              currentY = startY + distance * Math.sin(snappedAngle);
            }

            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            if (isLineOrArrow) {
              const x1n = width === 0 ? 0 : (startX - x) / width;
              const y1n = height === 0 ? 0 : (startY - y) / height;
              const x2n = width === 0 ? 0 : (currentX - x) / width;
              const y2n = height === 0 ? 0 : (currentY - y) / height;

              setDraftShape({
                ...draftShape,
                x,
                y,
                width,
                height,
                x1n,
                y1n,
                x2n,
                y2n,
              } as CustomShape);
            } else {
              setDraftShape({
                ...draftShape,
                x,
                y,
                width,
                height,
              });
            }
          }
          e.stopPropagation();
        }
      }
    },
    [isPanning, draftShape, rubberBandRect, pan, zoom, setPan, setDraftShape, setRubberBandRect, viewportRef]
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

      if (rubberBandRect) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.stopPropagation();

        const intersectingIds: string[] = [];
        const r = rubberBandRect;

        Object.values(shapes).forEach((shape) => {
          // Check AABB intersection between shape bounding box and rubber-band drag box
          if (
            shape.x < r.x + r.width &&
            shape.x + shape.width > r.x &&
            shape.y < r.y + r.height &&
            shape.y + shape.height > r.y
          ) {
            intersectingIds.push(shape.id);
          }
        });

        setSelectedShapeIds(intersectingIds);
        setRubberBandRect(null);
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
          const isLineOrArrow = finalShape.type === "line" || finalShape.type === "arrow";
          const tooSmall = isLineOrArrow
            ? Math.hypot(finalShape.width, finalShape.height) < 5
            : (finalShape.width < 5 || finalShape.height < 5);

          if (tooSmall) {
            if (finalShape.type === "text" || finalShape.type === "sticky") {
              finalShape.width = SHAPE_DEFAULTS.DEFAULT_TEXT_WIDTH;
              finalShape.height = finalShape.type === "text" ? SHAPE_DEFAULTS.DEFAULT_TEXT_HEIGHT : SHAPE_DEFAULTS.DEFAULT_STICKY_HEIGHT;
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
    [isPanning, rubberBandRect, shapes, setSelectedShapeIds, setRubberBandRect, draftShape, shapesMap, setDraftShape, setActiveTool]
  );


  // Register non-passive wheel and touch listeners directly on the viewport DOM node.
  // This successfully prevents the browser's default webpage-zoom and swipe-navigation gestures.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onTouchStartDOM = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        setDraftShape(null);
        setRubberBandRect(null);

        // Capture the gesture baseline once — all subsequent frames diff against this
        touchStartRef.current = {
          distance: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
          zoom: useWhiteboardStore.getState().zoom,
          pan: { ...useWhiteboardStore.getState().pan },
          midpoint: {
            x: (t1.clientX + t2.clientX) / 2 - rect.left,
            y: (t1.clientY + t2.clientY) / 2 - rect.top,
          },
        };
      } else if (e.touches.length === 1 && touchStartRef.current) {
        // One finger lifted — reset so the remaining finger can re-anchor
        touchStartRef.current = null;
      }
    };

    const onTouchMoveDOM = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartRef.current) {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const start = touchStartRef.current;
        const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentMidpoint = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        const deltaDistance = currentDistance - start.distance;
        const zoomThreshold = 30; // 30px dead-zone to trigger zoom
        const isZooming = Math.abs(deltaDistance) > zoomThreshold;

        let newZoom = start.zoom;
        if (isZooming) {
          const zoomSensitivity = 0.005;
          // Subtract the threshold for a smooth transition from the boundary
          const activeDelta = deltaDistance - Math.sign(deltaDistance) * zoomThreshold;
          // Standard: activeDelta > 0 (apart) -> zoomFactor > 1 (zoom in)
          //           activeDelta < 0 (close) -> zoomFactor < 1 (zoom out)
          const zoomFactor = 1 + activeDelta * zoomSensitivity;
          newZoom = Math.max(0.1, Math.min(20, start.zoom * zoomFactor));
        }

        // Unified pan+zoom formula mapping start midpoint canvas coordinate to current midpoint
        const newPanX = currentMidpoint.x - (start.midpoint.x - start.pan.x) * (newZoom / start.zoom);
        const newPanY = currentMidpoint.y - (start.midpoint.y - start.pan.y) * (newZoom / start.zoom);

        if (isZooming) setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    };

    const onTouchEndDOM = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStartRef.current = null;
      }
    };

    const onWheelDOM = (e: WheelEvent) => {
      e.preventDefault();

      const currentZoom = useWhiteboardStore.getState().zoom;
      const currentPan = useWhiteboardStore.getState().pan;

      // 1. Trackpad Pinch-to-Zoom (ctrlKey is true for pinch gestures on trackpad)
      if (e.ctrlKey) {
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Standard zoom:
        //   pinch-out/apart (deltaY < 0) -> zoomFactor > 1 (zoom in)
        //   pinch-in/close (deltaY > 0) -> zoomFactor < 1 (zoom out)
        const zoomFactor = 1 - e.deltaY * 0.005; 
        const clampedZoom = Math.max(0.1, Math.min(20, currentZoom * zoomFactor));

        const newPanX = mouseX - (mouseX - currentPan.x) * (clampedZoom / currentZoom);
        const newPanY = mouseY - (mouseY - currentPan.y) * (clampedZoom / currentZoom);

        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // 2. Trackpad 2-finger panning (or mouse wheel scrolling)
        // If Shift is pressed, map vertical wheel scrolls (deltaY) to horizontal panning
        const dx = e.shiftKey ? e.deltaY : e.deltaX;
        const dy = e.shiftKey ? 0 : e.deltaY;
        setPan({
          x: currentPan.x - dx,
          y: currentPan.y - dy,
        });
      }
    };

    viewport.addEventListener("touchstart", onTouchStartDOM, { passive: false });
    viewport.addEventListener("touchmove", onTouchMoveDOM, { passive: false });
    viewport.addEventListener("touchend", onTouchEndDOM);
    viewport.addEventListener("wheel", onWheelDOM, { passive: false });

    return () => {
      viewport.removeEventListener("touchstart", onTouchStartDOM);
      viewport.removeEventListener("touchmove", onTouchMoveDOM);
      viewport.removeEventListener("touchend", onTouchEndDOM);
      viewport.removeEventListener("wheel", onWheelDOM);
    };
  }, [setPan, setZoom, setDraftShape, setRubberBandRect, viewportRef]);

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
          x: canvasPos.x - SHAPE_DEFAULTS.DEFAULT_TEXT_WIDTH / 2, // Center on double click coordinate
          y: canvasPos.y - SHAPE_DEFAULTS.DEFAULT_TEXT_HEIGHT / 2,
          width: SHAPE_DEFAULTS.DEFAULT_TEXT_WIDTH,
          height: SHAPE_DEFAULTS.DEFAULT_TEXT_HEIGHT,
          fill: "transparent",
          stroke: defaultStrokeColor, // default theme color
          strokeWidth: 2,
          opacity: 1.0,
          index,
          text: "",
          fontSize: SHAPE_DEFAULTS.FONT_SIZE,
          fontFamily: SHAPE_DEFAULTS.FONT_FAMILY,
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!shapesMap || !viewportRef.current) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      const rect = viewportRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, pan, zoom, rect);

      await addImageShapes(imageFiles, canvasPos, Object.values(shapes), shapesMap, uploadMedia, setSelectedShapeIds);
    },
    [shapesMap, pan, zoom, shapes, uploadMedia, setSelectedShapeIds, viewportRef]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!shapesMap || !viewportRef.current) return;

      const files = Array.from(e.clipboardData.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      e.preventDefault();

      const rect = viewportRef.current.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      const canvasPos = screenToCanvas(clientX, clientY, pan, zoom, rect);

      await addImageShapes(imageFiles, canvasPos, Object.values(shapes), shapesMap, uploadMedia, setSelectedShapeIds);
    },
    [shapesMap, pan, zoom, shapes, uploadMedia, setSelectedShapeIds, viewportRef]
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
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Decorative Canvas Background Grid Pattern */}
      {showGrid && (
        <div
          className="canvas-bg-grid absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(var(--canvas-grid) 1.5px, transparent 1.5px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />
      )}

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
        {rubberBandRect && (
          <div
            className="absolute border border-dashed border-primary pointer-events-none"
            style={{
              left: rubberBandRect.x,
              top: rubberBandRect.y,
              width: rubberBandRect.width,
              height: rubberBandRect.height,
              backgroundColor: "rgba(96, 103, 86, 0.08)",
            }}
          />
        )}
        <SelectionBox shapesMap={shapesMap} />
      </div>
    </div>
  );
}
