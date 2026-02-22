/**
 * PartyKit server for real-time whiteboard collaboration.
 *
 * Architecture:
 * - Each board gets its own PartyKit room (room ID = board ID)
 * - Uses y-partykit to manage Yjs documents per room
 * - Yjs handles CRDT-based conflict resolution automatically
 * - The awareness protocol broadcasts cursor positions & presence
 *
 * Data flow:
 * 1. Client connects via WebSocket to room/{boardId}
 * 2. y-partykit syncs the initial Yjs document state
 * 3. All tldraw store changes flow through Yjs → broadcast to other clients
 * 4. On disconnect, y-partykit handles cleanup
 *
 * Phase 5 will add:
 * - Persistence (save Yjs state to database on interval / disconnect)
 * - Snapshot loading (restore Yjs state from database on room start)
 */

import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

/**
 * Whiteboard collaboration server.
 *
 * Each room corresponds to a single board. The room name IS the board ID.
 * y-partykit manages the Yjs document lifecycle, sync protocol,
 * and awareness (presence/cursors) automatically.
 */
export default class WhiteboardServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  /**
   * Handle new WebSocket connections.
   *
   * Delegates to y-partykit's onConnect which:
   * - Sends initial sync (full Yjs state) to the connecting client
   * - Sets up incremental sync (ongoing updates)
   * - Manages the awareness protocol for presence
   */
  onConnect(conn: Party.Connection) {
    return onConnect(conn, this.room, {
      // Persist Yjs document in memory for the room's lifetime.
      // Phase 5 will add database persistence via the `load` and `callback` options.
      persist: {
        mode: "snapshot",
      },
    });
  }

  /**
   * Handle incoming messages (non-Yjs).
   *
   * y-partykit handles Yjs sync/awareness messages automatically via onConnect.
   * This handler is for custom application-level messages (e.g., board rename,
   * permission changes, etc.) added in later phases.
   */
  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "board:rename": {
          // Broadcast board name change to all other clients
          this.room.broadcast(message, [sender.id]);
          break;
        }

        case "board:ping": {
          // Health check — respond to sender only
          sender.send(JSON.stringify({ type: "board:pong", timestamp: Date.now() }));
          break;
        }

        default:
          // Unknown message type — ignore silently
          break;
      }
    } catch {
      // Non-JSON message or malformed — ignore
      // (Yjs binary messages are handled by y-partykit, not this handler)
    }
  }

  /**
   * Clean up when a connection closes.
   *
   * y-partykit handles awareness cleanup automatically.
   * This hook is for any additional cleanup (logging, metrics, etc.)
   */
  onClose(conn: Party.Connection) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[WhiteboardServer] Connection closed: ${conn.id} in room ${this.room.id}`
      );
    }
  }

  /**
   * Handle connection errors.
   */
  onError(conn: Party.Connection, error: Error) {
    console.error(
      `[WhiteboardServer] Connection error in room ${this.room.id}:`,
      error.message
    );
  }
}

// PartyKit uses the default export
WhiteboardServer satisfies Party.Worker;
