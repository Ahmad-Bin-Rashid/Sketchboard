/**
 * Sync module barrel export.
 *
 * Import from "@/lib/sync" instead of individual files.
 *
 * Module overview:
 * - tldraw-yjs-sync: Core bidirectional sync between tldraw Store ↔ Yjs Y.Doc
 * - connection:      Reactive connection status store (connected/connecting/offline)
 * - awareness:       User presence management (cursors, collaborator list)
 */

export { TldrawYjsSync, type TldrawYjsSyncOptions } from "./tldraw-yjs-sync";

export {
  useConnectionStore,
  getConnectionLabel,
  getConnectionColor,
  getConnectionDotColor,
  type ConnectionStatus,
  type ConnectionState,
} from "./connection";

export {
  AwarenessManager,
  getCursorColor,
  type AwarenessManagerOptions,
  type AwarenessUserState,
} from "./awareness";
