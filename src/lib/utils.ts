import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 * Handles conditional classes, deduplication, and conflict resolution.
 *
 * @example
 * cn("px-2 py-1", condition && "bg-blue-500", "px-4")
 * // => "py-1 px-4" (px-4 overrides px-2, bg-blue-500 added if condition is true)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
