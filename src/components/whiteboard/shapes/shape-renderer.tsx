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
import { cn } from "@/lib/utils";

interface ShapeRendererProps {
  shape: CustomShape;
  shapesMap: Y.Map<CustomShape> | null;
  isDraft?: boolean;
}

export function ShapeRenderer({ shape, shapesMap, isDraft = false }: ShapeRendererProps) {
  const { activeTool, selectedShapeIds, setSelectedShapeIds, addToSelection } =
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDraft || activeTool !== "select") return;

    e.stopPropagation(); // Prevent canvas background click handler (deselection)
    
    if (e.shiftKey) {
      addToSelection(shape.id);
    } else {
      setSelectedShapeIds([shape.id]);
    }
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
    >
      {renderShape()}
    </div>
  );
}
