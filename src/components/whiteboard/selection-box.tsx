"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import { throttle } from "@/lib/sync/cursor-manager";

interface SelectionBoxProps {
  shapesMap: Y.Map<CustomShape> | null;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function SelectionBox({ shapesMap }: SelectionBoxProps) {
  const { selectedShapeIds, shapes, pan, zoom } = useWhiteboardStore();

  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);

  const startPointerRef = useRef({ x: 0, y: 0 });
  const startShapesRef = useRef<Record<string, CustomShape>>({});
  const startBoxBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Get selected shapes
  const selectedShapes = useMemo(() => {
    return selectedShapeIds
      .map((id) => shapes[id])
      .filter((s): s is CustomShape => !!s);
  }, [selectedShapeIds, shapes]);

  // Compute union bounding box of all selected shapes
  const boxBounds = useMemo(() => {
    if (selectedShapes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedShapes.forEach((s) => {
      if (s.x < minX) minX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.x + s.width > maxX) maxX = s.x + s.width;
      if (s.y + s.height > maxY) maxY = s.y + s.height;
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedShapes]);

  // Throttled Yjs writer
  const throttledYjsWrite = useMemo(() => {
    return throttle((updated: CustomShape[]) => {
      if (!shapesMap) return;
      const doc = shapesMap.doc;
      if (doc) {
        doc.transact(() => {
          updated.forEach((s) => shapesMap.set(s.id, s));
        });
      }
    }, 50);
  }, [shapesMap]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, handle: HandleType | null) => {
      if (e.button !== 0 || !boxBounds) return;

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      // Record starting coordinates and current shapes states
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startBoxBoundsRef.current = { ...boxBounds };
      
      const currentShapesSnapshot: Record<string, CustomShape> = {};
      selectedShapes.forEach((s) => {
        currentShapesSnapshot[s.id] = { ...s };
      });
      startShapesRef.current = currentShapesSnapshot;

      if (handle) {
        setActiveHandle(handle);
      } else {
        setIsDragging(true);
      }
    },
    [boxBounds, selectedShapes]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!shapesMap || !boxBounds) return;

      const { snapToGrid } = useWhiteboardStore.getState();
      let deltaX = (e.clientX - startPointerRef.current.x) / zoom;
      let deltaY = (e.clientY - startPointerRef.current.y) / zoom;

      if (isDragging) {
        // Drag-move all selected shapes
        const updatedShapes: CustomShape[] = [];
        
        Object.entries(startShapesRef.current).forEach(([id, startShape]) => {
          let targetX = startShape.x + deltaX;
          let targetY = startShape.y + deltaY;

          if (snapToGrid) {
            targetX = Math.round(targetX / 10) * 10;
            targetY = Math.round(targetY / 10) * 10;
          }

          const actualDeltaX = targetX - startShape.x;
          const actualDeltaY = targetY - startShape.y;

          const updated = {
            ...startShape,
            x: targetX,
            y: targetY,
          } as CustomShape;

          // For pencil shapes, we also shift all vector points
          if (updated.type === "draw" && startShape.type === "draw") {
            updated.points = startShape.points.map(([px, py, pr]) => [
              px + actualDeltaX,
              py + actualDeltaY,
              pr,
            ]);
          }

          updatedShapes.push(updated);
        });

        // Update local Zustand store mirror instantly
        const store = useWhiteboardStore.getState();
        const nextShapes = { ...store.shapes };
        updatedShapes.forEach((s) => {
          nextShapes[s.id] = s;
        });
        store.setShapes(nextShapes);

        // Push throttled updates to Yjs Room
        throttledYjsWrite(updatedShapes);
      } else if (activeHandle) {
        // Resize all selected shapes based on handle movement
        const bounds = startBoxBoundsRef.current;
        const updatedShapes: CustomShape[] = [];

        // Compute next overall bounding box bounds
        let newX = bounds.x;
        let newY = bounds.y;
        let newWidth = bounds.width;
        let newHeight = bounds.height;

        if (activeHandle.includes("e")) newWidth = Math.max(10, bounds.width + deltaX);
        if (activeHandle.includes("s")) newHeight = Math.max(10, bounds.height + deltaY);
        
        if (activeHandle.includes("w")) {
          const possibleWidth = bounds.width - deltaX;
          if (possibleWidth > 10) {
            newWidth = possibleWidth;
            newX = bounds.x + deltaX;
          }
        }
        if (activeHandle.includes("n")) {
          const possibleHeight = bounds.height - deltaY;
          if (possibleHeight > 10) {
            newHeight = possibleHeight;
            newY = bounds.y + deltaY;
          }
        }

        // Calculate scaling ratios
        const scaleX = newWidth / bounds.width;
        const scaleY = newHeight / bounds.height;

        Object.entries(startShapesRef.current).forEach(([id, startShape]) => {
          // Translate shape coordinates into normalized ratios of starting bounding box safely
          const relativeX = bounds.width === 0 ? 0 : (startShape.x - bounds.x) / bounds.width;
          const relativeY = bounds.height === 0 ? 0 : (startShape.y - bounds.y) / bounds.height;
          const relativeWidth = bounds.width === 0 ? 1 : startShape.width / bounds.width;
          const relativeHeight = bounds.height === 0 ? 1 : startShape.height / bounds.height;

          const updated = {
            ...startShape,
            x: newX + relativeX * newWidth,
            y: newY + relativeY * newHeight,
            width: relativeWidth * newWidth,
            height: relativeHeight * newHeight,
          } as CustomShape;

          // For pencil shapes, scale all individual draw coordinates safely
          if (updated.type === "draw" && startShape.type === "draw") {
            updated.points = startShape.points.map(([px, py, pr]) => {
              const relPx = bounds.width === 0 ? 0 : (px - bounds.x) / bounds.width;
              const relPy = bounds.height === 0 ? 0 : (py - bounds.y) / bounds.height;
              return [
                newX + relPx * newWidth,
                newY + relPy * newHeight,
                pr,
              ];
            });
          }

          updatedShapes.push(updated);
        });

        // Update local Zustand store mirror instantly
        const store = useWhiteboardStore.getState();
        const nextShapes = { ...store.shapes };
        updatedShapes.forEach((s) => {
          nextShapes[s.id] = s;
        });
        store.setShapes(nextShapes);

        // Push throttled updates to Yjs Room
        throttledYjsWrite(updatedShapes);
      }
    },
    [boxBounds, isDragging, activeHandle, zoom, shapesMap, throttledYjsWrite]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging && !activeHandle) return;

      e.currentTarget.releasePointerCapture(e.pointerId);

      // Cancel any remaining throttled updates
      throttledYjsWrite.cancel();

      // Commit final positions firmly to Yjs Room in one single transaction
      if (shapesMap) {
        const store = useWhiteboardStore.getState();
        const currentShapes = store.shapes;
        const doc = shapesMap.doc;
        
        if (doc) {
          doc.transact(() => {
            selectedShapeIds.forEach((id) => {
              const shape = currentShapes[id];
              if (shape) {
                shapesMap.set(id, shape);
              }
            });
          });
        }
      }

      setIsDragging(false);
      setActiveHandle(null);
    },
    [isDragging, activeHandle, selectedShapeIds, shapesMap, throttledYjsWrite]
  );

  if (!boxBounds) return null;

  const handleSize = 8 / zoom;
  const handleOffset = -handleSize / 2;
  const borderWidth = 1.5 / zoom;

  const handles: { type: HandleType; style: React.CSSProperties }[] = [
    { type: "nw", style: { top: handleOffset, left: handleOffset, width: handleSize, height: handleSize, cursor: "nwse-resize" } },
    { type: "n", style: { top: handleOffset, left: "50%", transform: "translate(-50%)", width: handleSize, height: handleSize, cursor: "ns-resize" } },
    { type: "ne", style: { top: handleOffset, right: handleOffset, width: handleSize, height: handleSize, cursor: "nesw-resize" } },
    { type: "e", style: { top: "50%", right: handleOffset, transform: "translateY(-50%)", width: handleSize, height: handleSize, cursor: "ew-resize" } },
    { type: "se", style: { bottom: handleOffset, right: handleOffset, width: handleSize, height: handleSize, cursor: "nwse-resize" } },
    { type: "s", style: { bottom: handleOffset, left: "50%", transform: "translate(-50%)", width: handleSize, height: handleSize, cursor: "ns-resize" } },
    { type: "sw", style: { bottom: handleOffset, left: handleOffset, width: handleSize, height: handleSize, cursor: "nesw-resize" } },
    { type: "w", style: { top: "50%", left: handleOffset, transform: "translateY(-50%)", width: handleSize, height: handleSize, cursor: "ew-resize" } },
  ];

  return (
    <div
      className="absolute border border-primary pointer-events-auto"
      style={{
        left: boxBounds.x,
        top: boxBounds.y,
        width: boxBounds.width,
        height: boxBounds.height,
        cursor: isDragging ? "grabbing" : "grab",
        borderWidth: `${borderWidth}px`,
        backgroundColor: "rgba(0, 0, 0, 0)",
        zIndex: 500,
      }}
      onPointerDown={(e) => handlePointerDown(e, null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 8 Resize Handles */}
      {handles.map((h) => (
        <div
          key={h.type}
          onPointerDown={(e) => handlePointerDown(e, h.type)}
          className="absolute rounded-full border border-primary bg-panel-bg shadow-sm transition hover:scale-125 pointer-events-auto"
          style={{
            ...h.style,
            borderWidth: `${1 / zoom}px`,
          }}
        />
      ))}
    </div>
  );
}
