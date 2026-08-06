import * as Y from "yjs";
import { nanoid } from "nanoid";
import type { CustomShape } from "@/types/whiteboard";
import { generateIndex } from "./fractional-index";

/**
 * Duplicates the selected shapes, offsetting their positions slightly.
 */
export function duplicateShapes(
  ids: string[],
  shapesMap: Y.Map<CustomShape> | null,
  onNewSelection: (newIds: string[]) => void
) {
  if (!shapesMap || ids.length === 0) return;

  const doc = shapesMap.doc;
  if (!doc) return;

  // Retrieve current shapes
  const allShapes = Array.from(shapesMap.values());
  const selectedShapes = ids
    .map((id) => shapesMap.get(id))
    .filter((s): s is CustomShape => !!s)
    .sort((a, b) => a.index.localeCompare(b.index));

  const newIds: string[] = [];

  doc.transact(() => {
    let lastIndex = allShapes.reduce((max, s) => (s.index > max ? s.index : max), "");
    
    selectedShapes.forEach((shape) => {
      const nextIndex = generateIndex(lastIndex || null, null);
      lastIndex = nextIndex;

      const newId = nanoid();
      newIds.push(newId);

      const duplicated: CustomShape = {
        ...shape,
        id: newId,
        index: nextIndex,
        x: shape.x + 20,
        y: shape.y + 20,
      } as CustomShape;

      // Handle duplicate points for drawing shapes
      if (duplicated.type === "draw" && shape.type === "draw") {
        duplicated.points = shape.points.map(([px, py, pr]) => [px + 20, py + 20, pr]);
      }

      shapesMap.set(newId, duplicated);
    });
  });

  if (newIds.length > 0) {
    onNewSelection(newIds);
  }
}

/**
 * Arranges Z-order layers for selected shapes
 */
export function arrangeShapes(
  ids: string[],
  action: "front" | "back" | "forward" | "backward",
  shapesMap: Y.Map<CustomShape> | null
) {
  if (!shapesMap || ids.length === 0) return;
  const doc = shapesMap.doc;
  if (!doc) return;

  const allShapes = Array.from(shapesMap.values()).sort((a, b) => a.index.localeCompare(b.index));
  const selectedIdsSet = new Set(ids);

  doc.transact(() => {
    if (action === "front") {
      let highest = allShapes[allShapes.length - 1].index;
      const selected = allShapes.filter((s) => selectedIdsSet.has(s.id));
      selected.forEach((shape) => {
        const nextIndex = generateIndex(highest, null);
        shapesMap.set(shape.id, { ...shape, index: nextIndex } as CustomShape);
        highest = nextIndex;
      });
    } else if (action === "back") {
      let lowest = allShapes[0].index;
      const selected = allShapes.filter((s) => selectedIdsSet.has(s.id)).reverse();
      selected.forEach((shape) => {
        const nextIndex = generateIndex(null, lowest);
        shapesMap.set(shape.id, { ...shape, index: nextIndex } as CustomShape);
        lowest = nextIndex;
      });
    } else if (action === "forward") {
      // Move each shape past the next unselected shape
      const selected = allShapes.filter((s) => selectedIdsSet.has(s.id));
      for (let i = selected.length - 1; i >= 0; i--) {
        const shape = selected[i];
        const idx = allShapes.findIndex((s) => s.id === shape.id);
        if (idx < allShapes.length - 1) {
          // Find the next unselected sibling shape
          let nextUnselectedIdx = idx + 1;
          while (nextUnselectedIdx < allShapes.length && selectedIdsSet.has(allShapes[nextUnselectedIdx].id)) {
            nextUnselectedIdx++;
          }
          if (nextUnselectedIdx < allShapes.length) {
            const sibling = allShapes[nextUnselectedIdx];
            const afterSibling = nextUnselectedIdx + 1 < allShapes.length ? allShapes[nextUnselectedIdx + 1].index : null;
            const nextIndex = generateIndex(sibling.index, afterSibling);
            shapesMap.set(shape.id, { ...shape, index: nextIndex } as CustomShape);
            
            // Re-order locally in our sorted temp array to handle contiguous selection moves
            allShapes.splice(idx, 1);
            shape.index = nextIndex;
            allShapes.splice(nextUnselectedIdx, 0, shape);
          }
        }
      }
    } else if (action === "backward") {
      // Move each shape before the previous unselected shape
      const selected = allShapes.filter((s) => selectedIdsSet.has(s.id));
      for (let i = 0; i < selected.length; i++) {
        const shape = selected[i];
        const idx = allShapes.findIndex((s) => s.id === shape.id);
        if (idx > 0) {
          let prevUnselectedIdx = idx - 1;
          while (prevUnselectedIdx >= 0 && selectedIdsSet.has(allShapes[prevUnselectedIdx].id)) {
            prevUnselectedIdx--;
          }
          if (prevUnselectedIdx >= 0) {
            const sibling = allShapes[prevUnselectedIdx];
            const beforeSibling = prevUnselectedIdx - 1 >= 0 ? allShapes[prevUnselectedIdx - 1].index : null;
            const nextIndex = generateIndex(beforeSibling, sibling.index);
            shapesMap.set(shape.id, { ...shape, index: nextIndex } as CustomShape);

            // Re-order locally in our sorted temp array to handle contiguous selection moves
            allShapes.splice(idx, 1);
            shape.index = nextIndex;
            allShapes.splice(prevUnselectedIdx, 0, shape);
          }
        }
      }
    }
  });
}

/**
 * Aligns selected shapes relative to their bounding box.
 */
export function alignShapes(
  ids: string[],
  axis: "left" | "center" | "right" | "top" | "middle" | "bottom",
  shapesMap: Y.Map<CustomShape> | null
) {
  if (!shapesMap || ids.length < 2) return;
  const doc = shapesMap.doc;
  if (!doc) return;

  const selectedShapes = ids
    .map((id) => shapesMap.get(id))
    .filter((s): s is CustomShape => !!s);

  if (selectedShapes.length < 2) return;

  // Compute union bounding box bounds
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

  const width = maxX - minX;
  const height = maxY - minY;

  doc.transact(() => {
    selectedShapes.forEach((shape) => {
      let nextX = shape.x;
      let nextY = shape.y;

      if (axis === "left") nextX = minX;
      else if (axis === "right") nextX = maxX - shape.width;
      else if (axis === "center") nextX = minX + (width - shape.width) / 2;
      else if (axis === "top") nextY = minY;
      else if (axis === "bottom") nextY = maxY - shape.height;
      else if (axis === "middle") nextY = minY + (height - shape.height) / 2;

      const deltaX = nextX - shape.x;
      const deltaY = nextY - shape.y;

      const updated = {
        ...shape,
        x: nextX,
        y: nextY,
      } as CustomShape;

      // Also adjust individual draw coordinates for drawing shapes
      if (updated.type === "draw" && shape.type === "draw") {
        updated.points = shape.points.map(([px, py, pr]) => [px + deltaX, py + deltaY, pr]);
      }

      shapesMap.set(shape.id, updated);
    });
  });
}

/**
 * Adjusts pan and zoom to fit all shapes within the viewport.
 */
export function fitToContent(
  shapes: CustomShape[],
  viewportRef: React.RefObject<HTMLDivElement | null>,
  setPan: (p: { x: number; y: number }) => void,
  setZoom: (z: number) => void
) {
  if (!viewportRef.current) return;
  const rect = viewportRef.current.getBoundingClientRect();
  const shapesList = Object.values(shapes);

  if (shapesList.length === 0) {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapesList.forEach((shape) => {
    if (shape.x < minX) minX = shape.x;
    if (shape.y < minY) minY = shape.y;
    if (shape.x + shape.width > maxX) maxX = shape.x + shape.width;
    if (shape.y + shape.height > maxY) maxY = shape.y + shape.height;
  });

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  const padding = 48;
  const targetWidth = Math.max(100, rect.width - padding * 2);
  const targetHeight = Math.max(100, rect.height - padding * 2);

  const fitZoom = Math.min(targetWidth / w, targetHeight / h);
  const clampedZoom = Math.max(0.1, Math.min(2, fitZoom));

  const vx = rect.width / 2;
  const vy = rect.height / 2;

  const newPanX = vx - cx * clampedZoom;
  const newPanY = vy - cy * clampedZoom;

  setZoom(clampedZoom);
  setPan({ x: newPanX, y: newPanY });
}
