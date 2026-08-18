import React from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import { RectangleShape } from "./rectangle-shape";
import { EllipseShape } from "./ellipse-shape";
import { LineShape } from "./line-shape";
import { ArrowShape } from "./arrow-shape";
import { DrawShape } from "./draw-shape";
import { TextShape } from "./text-shape";
import { StickyShape } from "./sticky-shape";
import { ImageShape } from "./image-shape";
import { EmbedShape } from "./embed-shape";
import { TriangleShape } from "./triangle-shape";
import { DiamondShape } from "./diamond-shape";
import { ParallelogramShape } from "./parallelogram-shape";
import { HexagonShape } from "./hexagon-shape";
import { OctagonShape } from "./octagon-shape";
import { CylinderShapeComponent } from "./cylinder-shape";
import { RoundedRectangleShapeComponent } from "./rounded-rectangle-shape";
import { SpeechBubbleShapeComponent } from "./speech-bubble-shape";
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

  const [isEditing, setIsEditing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const startPointerRef = React.useRef({ x: 0, y: 0 });
  const startShapesRef = React.useRef<Record<string, CustomShape>>({});
  const isAlreadySelectedRef = React.useRef(false);

  // Auto-enter edit mode if the shape is selected and empty (e.g. just created)
  React.useEffect(() => {
    if (isSelected && (shape.type === "text" || shape.type === "sticky") && (shape as any).text === "") {
      setIsEditing(true);
    }
  }, [isSelected, (shape as any).text, shape.type]);

  // Cancel editing when deselected
  React.useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isDraft || activeTool !== "select") return;
    if (shape.type === "text" || shape.type === "sticky") {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraft || activeTool !== "select") return;
    if (e.button !== 0) return; // Left click only

    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const isAlreadySelected = selectedShapeIds.includes(shape.id);
    isAlreadySelectedRef.current = isAlreadySelected;
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

    // Reselection click triggers editing (if clicked without significant dragging)
    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 3 && isAlreadySelectedRef.current && (shape.type === "text" || shape.type === "sticky")) {
      setIsEditing(true);
    }
  };

  const renderShape = () => {
    switch (shape.type) {
      case "rectangle":
        return <RectangleShape shape={shape} />;
      case "ellipse":
        return <EllipseShape shape={shape} />;
      case "line":
        return <LineShape shape={shape as any} />;
      case "arrow":
        return <ArrowShape shape={shape as any} />;
      case "draw":
        return <DrawShape shape={shape} />;
      case "text":
        return (
          <TextShape
            shape={shape}
            onUpdate={handleUpdate}
            isReadOnly={isDraft}
            isEditing={isEditing}
            onEditEnd={() => setIsEditing(false)}
          />
        );
      case "sticky":
        return (
          <StickyShape
            shape={shape}
            onUpdate={handleUpdate}
            isReadOnly={isDraft}
            isEditing={isEditing}
            onEditEnd={() => setIsEditing(false)}
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
      case "triangle":
        return <TriangleShape shape={shape as any} />;
      case "diamond":
        return <DiamondShape shape={shape as any} />;
      case "parallelogram":
        return <ParallelogramShape shape={shape as any} />;
      case "hexagon":
        return <HexagonShape shape={shape as any} />;
      case "octagon":
        return <OctagonShape shape={shape as any} />;
      case "cylinder":
        return <CylinderShapeComponent shape={shape as any} />;
      case "rounded-rectangle":
        return <RoundedRectangleShapeComponent shape={shape as any} />;
      case "speech-bubble":
        return <SpeechBubbleShapeComponent shape={shape as any} />;
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
        filter: shape.shadow
          ? `drop-shadow(0px ${shape.shadowSpread ?? 4}px ${shape.shadowBlur ?? 8}px rgba(0, 0, 0, 0.15))`
          : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {renderShape()}
    </div>
  );
}
