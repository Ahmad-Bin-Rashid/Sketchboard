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

/**
 * Format a Date or ISO timestamp string as a human-readable relative time string.
 *
 * Examples:
 *   "just now"
 *   "5 minutes ago"
 *   "2 hours ago"
 *   "3 days ago"
 *   "Jan 12"          (same year, > 7 days)
 *   "Jan 12, 2024"    (different year)
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  // Older than 7 days — show date
  const options: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };

  return d.toLocaleDateString("en-US", options);
}
