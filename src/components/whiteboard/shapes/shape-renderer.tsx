import React from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import { RectangleShape } from "./rectangle-shape";
import { EllipseShape } from "./ellipse-shape";
import { DrawShape } from "./draw-shape";
import { TextShape } from "./text-shape";
import { StickyShape } from "./sticky-shape";
import { ImageShape } from "./image-shape";
import { EmbedShape } from "./embed-shape";
import { cn } from "@/lib/utils";

interface ShapeRendererProps {
  shape: CustomShape;
  shapesMap: Y.Map<CustomShape> | null;
  isDraft?: boolean;
}

export function ShapeRenderer({ shape, shapesMap, isDraft = false }: ShapeRendererProps) {
  const { activeTool, selectedShapeIds, setSelectedShapeIds, addToSelection, shapes } =
    useWhiteboardStore();

  const isSelected = selectedShapeIds.includes(shape.id) && !isDraft;

  // Handler to push updates from text/sticky edits back to Yjs Map
  const handleUpdate = (id: string, updates: Partial<CustomShape>) => {
    if (!shapesMap) return;
    const current = shapesMap.get(id);
    if (current) {
      shapesMap.set(id, { ...current, ...updates } as CustomShape);
    }
  };

  const [isDragging, setIsDragging] = React.useState(false);
  const startPointerRef = React.useRef({ x: 0, y: 0 });
  const startShapesRef = React.useRef<Record<string, CustomShape>>({});

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraft || activeTool !== "select") return;
    if (e.button !== 0) return; // Left click only

    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const isAlreadySelected = selectedShapeIds.includes(shape.id);
    let currentSelection = selectedShapeIds;

    if (e.shiftKey) {
      addToSelection(shape.id);
      if (isAlreadySelected) {
        currentSelection = selectedShapeIds.filter(id => id !== shape.id);
      } else {
        currentSelection = [...selectedShapeIds, shape.id];
      }
    } else if (!isAlreadySelected) {
      setSelectedShapeIds([shape.id]);
      currentSelection = [shape.id];
    }

    startPointerRef.current = { x: e.clientX, y: e.clientY };

    const snapshot: Record<string, CustomShape> = {};
    currentSelection.forEach((id) => {
      const s = shapes[id];
      if (s) {
        snapshot[id] = { ...s };
      }
    });
    startShapesRef.current = snapshot;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !shapesMap) return;
    e.stopPropagation();

    const { zoom, snapToGrid } = useWhiteboardStore.getState();
    let deltaX = (e.clientX - startPointerRef.current.x) / zoom;
    let deltaY = (e.clientY - startPointerRef.current.y) / zoom;

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

      if (updated.type === "draw" && startShape.type === "draw") {
        updated.points = startShape.points.map(([px, py, pr]) => [
          px + actualDeltaX,
          py + actualDeltaY,
          pr,
        ]);
      }

      updatedShapes.push(updated);
    });

    const store = useWhiteboardStore.getState();
    const nextShapes = { ...store.shapes };
    updatedShapes.forEach((s) => {
      nextShapes[s.id] = s;
    });
    store.setShapes(nextShapes);

    const doc = shapesMap.doc;
    if (doc) {
      doc.transact(() => {
        updatedShapes.forEach((s) => shapesMap.set(s.id, s));
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const renderShape = () => {
    switch (shape.type) {
      case "rectangle":
        return <RectangleShape shape={shape} />;
      case "ellipse":
        return <EllipseShape shape={shape} />;
      case "draw":
        return <DrawShape shape={shape} />;
      case "text":
        return (
          <TextShape
            shape={shape}
            onUpdate={handleUpdate}
            isReadOnly={isDraft}
          />
        );
      case "sticky":
        return (
          <StickyShape
            shape={shape}
            onUpdate={handleUpdate}
            isReadOnly={isDraft}
          />
        );
      case "image":
        return <ImageShape shape={shape} />;
      case "embed":
        return (
          <EmbedShape
            shape={shape as any}
            onUpdate={handleUpdate as any}
            isReadOnly={isDraft}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "absolute select-none",
        isSelected && "ring-2 ring-primary ring-offset-1 rounded-sm",
        isDraft && "opacity-60 pointer-events-none"
      )}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        opacity: shape.opacity,
        zIndex: isSelected ? 1000 : undefined,
        // Block interaction if not in select mode (pointer events should go to canvas for shape creation)
        pointerEvents: activeTool === "select" && !isDraft ? "auto" : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {renderShape()}
    </div>
  );
}
