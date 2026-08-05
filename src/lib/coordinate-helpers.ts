import type { CustomShape } from "@/types/whiteboard";

/**
 * Convert screen (viewport) coordinates to canvas coordinates.
 */
export function screenToCanvas(
  clientX: number,
  clientY: number,
  pan: { x: number; y: number },
  zoom: number,
  rect: DOMRect
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  };
}

/**
 * Convert canvas coordinates to screen (viewport) coordinates.
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: canvasX * zoom + pan.x,
    y: canvasY * zoom + pan.y,
  };
}

/**
 * Compute bounding box from a freehand points array.
 */
export function pointsToBoundingBox(points: [number, number, number][]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX || 1, // Avoid 0-width bounding boxes
    height: maxY - minY || 1, // Avoid 0-height bounding boxes
  };
}
