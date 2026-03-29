"use client";

/**
 * useDebounce — debounces a value by the given delay in milliseconds.
 *
 * Returns the debounced value which only updates after the specified
 * delay has elapsed without the source value changing.
 *
 * Used for search inputs in the dashboard to avoid triggering URL
 * updates / re-fetches on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchInput, 300);
 * // debouncedSearch updates 300ms after the user stops typing
 */

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
