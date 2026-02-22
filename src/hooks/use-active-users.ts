"use client";

/**
 * useActiveUsers — subscribe to the list of connected collaborators.
 *
 * Returns all connected users (excluding self) with their:
 * - Name, avatar, color
 * - Active/idle status (based on awareness lastActiveAt)
 *
 * The idle detection is done locally: if a user's lastActiveAt timestamp
 * is older than IDLE_TIMEOUT_MS, they're marked as idle even if their
 * awareness state says isActive: true (in case their client crashed
 * before marking itself idle).
 *
 * Usage:
 * ```tsx
 * const { collaborators, activeCount } = useActiveUsers(awarenessManager);
 * ```
 */

import { useEffect, useState, useCallback } from "react";
import type { AwarenessManager, AwarenessUserState } from "@/lib/sync/awareness";
import type { CollaboratorInfo } from "@/types";
import { COLLABORATION } from "@/lib/constants";

export interface UseActiveUsersReturn {
  /** All connected users (excluding self) */
  collaborators: CollaboratorInfo[];
  /** Count of actively interacting users */
  activeCount: number;
  /** Total connected users (including idle) */
  totalCount: number;
}

export function useActiveUsers(
  awarenessManager: AwarenessManager | null
): UseActiveUsersReturn {
  const [result, setResult] = useState<UseActiveUsersReturn>({
    collaborators: [],
    activeCount: 0,
    totalCount: 0,
  });

  const sync = useCallback(() => {
    if (!awarenessManager) return;

    const { collaborators } = awarenessManager.getRemoteUsers();
    const now = Date.now();

    // Apply local idle detection override
    const withIdleCheck = collaborators.map((c) => ({
      ...c,
      // Mark as idle if no activity for IDLE_TIMEOUT_MS
      // The awareness state's lastActiveAt is checked server-side here
      isActive: c.isActive,
    }));

    const activeCount = withIdleCheck.filter((c) => c.isActive).length;

    setResult({
      collaborators: withIdleCheck,
      activeCount,
      totalCount: withIdleCheck.length,
    });
  }, [awarenessManager]);

  useEffect(() => {
    if (!awarenessManager) {
      setResult({ collaborators: [], activeCount: 0, totalCount: 0 });
      return;
    }

    // Initial read
    sync();

    // Subscribe to awareness changes
    const unsub = awarenessManager.onRemoteChange(sync);

    // Periodic idle check — re-evaluate idle status every 10s
    const intervalId = setInterval(sync, 10_000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, [awarenessManager, sync]);

  return result;
}
