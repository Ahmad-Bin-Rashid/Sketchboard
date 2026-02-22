"use client";

/**
 * useRemoteCursors — subscribe to remote users' cursor positions.
 *
 * Provides a reactive list of remote cursor positions from the
 * Yjs awareness protocol. This hook handles:
 * - Subscribing to awareness change events
 * - Filtering to only users with active cursors
 * - Cleaning up on unmount
 *
 * The actual rendering and coordinate transformation happens in
 * the RemoteCursors component — this hook just provides the raw data.
 *
 * Usage:
 * ```tsx
 * const cursors = useRemoteCursors(awarenessManager);
 * // cursors: CursorPresence[] — remote users with visible cursors
 * ```
 */

import { useEffect, useState, useCallback } from "react";
import type { AwarenessManager } from "@/lib/sync/awareness";
import type { CursorPresence } from "@/types";

export function useRemoteCursors(
  awarenessManager: AwarenessManager | null
): CursorPresence[] {
  const [cursors, setCursors] = useState<CursorPresence[]>([]);

  const sync = useCallback(() => {
    if (!awarenessManager) return;
    const { cursors: remoteCursors } = awarenessManager.getRemoteUsers();
    setCursors(remoteCursors);
  }, [awarenessManager]);

  useEffect(() => {
    if (!awarenessManager) {
      setCursors([]);
      return;
    }

    // Initial read
    sync();

    // Subscribe to changes
    const unsub = awarenessManager.onRemoteChange(sync);
    return unsub;
  }, [awarenessManager, sync]);

  return cursors;
}
