import { generateKeyBetween } from "fractional-indexing";
import type { CustomShape } from "@/types/whiteboard";

/**
 * Returns a fractional index string lexicographically between `before` and `after`.
 */
export function generateIndex(before?: string | null, after?: string | null): string {
  try {
    return generateKeyBetween(before || null, after || null);
  } catch (e) {
    console.error("Error generating fractional index:", e);
    // Safe fallback: append a character or return simple ordering
    return (before || "") + "a";
  }
}

/**
 * Returns a fractional index string that sorts higher than all existing shapes
 * (for placing a new shape on top of the stack).
 */
export function generateNewTopIndex(shapes: CustomShape[]): string {
  if (shapes.length === 0) {
    return generateIndex(null, null);
  }

  // Find the highest index currently in use
  const sortedShapes = [...shapes].sort((a, b) => a.index.localeCompare(b.index));
  const highestIndex = sortedShapes[sortedShapes.length - 1].index;

  return generateIndex(highestIndex, null);
}
