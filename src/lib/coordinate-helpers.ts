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

/**
 * Perpendicular distance helper from point to line segment.
 */
function getSquareSegmentDistance(
  p: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number]
) {
  let x = p1[0];
  let y = p1[1];
  let dx = p2[0] - x;
  let dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;

  return dx * dx + dy * dy;
}

/**
 * Douglas-Peucker path simplification to reduce stored shape byte size.
 */
export function simplifyPath(
  points: [number, number, number][],
  sqTolerance = 1.5
): [number, number, number][] {
  if (points.length <= 2) return points;

  const len = points.length;
  const markers = new Uint8Array(len);
  markers[0] = markers[len - 1] = 1;

  const stack: [number, number][] = [[0, len - 1]];

  while (stack.length > 0) {
    const range = stack.pop()!;
    const first = range[0];
    const last = range[1];
    let maxSqDist = 0;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSquareSegmentDistance(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      markers[index] = 1;
      stack.push([first, index]);
      stack.push([index, last]);
    }
  }

  const result: [number, number, number][] = [];
  for (let i = 0; i < len; i++) {
    if (markers[i]) result.push(points[i]);
  }

  return result;
}

