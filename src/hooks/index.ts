/**
 * Custom hooks barrel export.
 *
 * Import from "@/hooks" instead of individual files.
 *
 * Categories:
 * - useYjsSync:         Real-time sync orchestrator (Phase 3)
 * - useRemoteCursors:   Subscribe to remote cursor positions (Phase 4)
 * - useActiveUsers:     Collaborator list with idle detection (Phase 4)
 * - useCursorBroadcast: Broadcast local cursor movements (Phase 4)
 * - useBoard*:          Board-related hooks (Phase 6+)
 */

export { useYjsSync, type UseYjsSyncOptions, type UseYjsSyncReturn, type WhiteboardMode } from "./use-yjs-sync";
export { useRemoteCursors } from "./use-remote-cursors";
export { useActiveUsers, type UseActiveUsersReturn } from "./use-active-users";
export { useCursorBroadcast, type UseCursorBroadcastOptions } from "./use-cursor-broadcast";
export { useUndoRedo } from "./use-undo-redo";

