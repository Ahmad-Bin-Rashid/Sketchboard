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

/**
 * Helper to determine orientation of ordered triplet (p, q, r).
 * Returns:
 * 0 -> p, q, and r are collinear
 * 1 -> Clockwise
 * 2 -> Counterclockwise
 */
function orientation(
  p: { x: number; y: number },
  q: { x: number; y: number },
  r: { x: number; y: number }
): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0; // collinear
  return val > 0 ? 1 : 2; // clock or counterclock
}

/**
 * Helper to check if point q lies on line segment pr
 */
function onSegment(
  p: { x: number; y: number },
  q: { x: number; y: number },
  r: { x: number; y: number }
): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

/**
 * Returns true if line segment p1q1 and p2q2 intersect.
 */
function lineSegmentsIntersect(
  p1: { x: number; y: number },
  q1: { x: number; y: number },
  p2: { x: number; y: number },
  q2: { x: number; y: number }
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special Cases
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Returns true if the line segment from p1 to p2 intersects the given rect bounding box.
 */
export function lineSegmentIntersectsRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  // 1. Check if either endpoint is inside the rectangle
  if (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) return true;
  if (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY) return true;

  // 2. Check if segment intersects any of the four edges of the rectangle
  const topLeft = { x: minX, y: minY };
  const topRight = { x: maxX, y: minY };
  const bottomLeft = { x: minX, y: maxY };
  const bottomRight = { x: maxX, y: maxY };

  if (lineSegmentsIntersect(p1, p2, topLeft, topRight)) return true;
  if (lineSegmentsIntersect(p1, p2, topRight, bottomRight)) return true;
  if (lineSegmentsIntersect(p1, p2, bottomRight, bottomLeft)) return true;
  if (lineSegmentsIntersect(p1, p2, bottomLeft, topLeft)) return true;

  return false;
}


