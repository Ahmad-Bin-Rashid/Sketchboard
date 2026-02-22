/**
 * tldraw ↔ Yjs sync bridge.
 *
 * This is the core synchronization layer that bidirectionally syncs
 * tldraw's record-based Store with a Yjs Y.Map (CRDT).
 *
 * Architecture:
 * ┌─────────┐    store.listen()     ┌────────┐    Y.Map.observe()    ┌──────────┐
 * │ tldraw  │ ──────────────────→  │  Sync  │  ←────────────────── │   Yjs    │
 * │  Store  │ ←──────────────────  │ Bridge │  ──────────────────→ │  Y.Doc   │
 * └─────────┘  mergeRemoteChanges  └────────┘    Y.Map.set/delete  └──────────┘
 *
 * Key principles:
 * - Local changes (from tldraw) → written to Y.Map → broadcast to peers
 * - Remote changes (from Yjs) → applied via mergeRemoteChanges (non-emitting)
 * - Uses a "suppression flag" to prevent infinite feedback loops
 * - Only syncs document-scoped records (shapes, pages, etc.)
 *   NOT session-scoped records (camera, presence, pointer, instance state)
 *
 * Record scoping:
 * - "document" scope: shapes, pages, assets, bindings — SYNCED
 * - "session" scope: camera, instance, pointer, presence — LOCAL ONLY
 * - "presence" scope: handled separately by awareness protocol
 */

import * as Y from "yjs";
import type { Editor, TLRecord, TLStoreEventInfo } from "tldraw";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Y.Map key name within the Y.Doc that holds all tldraw records */
const RECORDS_MAP_KEY = "tl_records";

/**
 * Record type prefixes that belong to the "session" scope.
 * These are per-client and should NOT be synced across users.
 */
const SESSION_RECORD_PREFIXES = [
  "instance:",
  "instance_page_state:",
  "camera:",
  "pointer:",
  "instance_presence:",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check if a record ID belongs to session scope (not synced). */
function isSessionRecord(recordId: string): boolean {
  return SESSION_RECORD_PREFIXES.some((prefix) => recordId.startsWith(prefix));
}

/** Serialize a tldraw record for storage in Y.Map */
function serializeRecord(record: TLRecord): string {
  return JSON.stringify(record);
}

/** Deserialize a record from Y.Map back to a tldraw record */
function deserializeRecord(data: string): TLRecord {
  return JSON.parse(data) as TLRecord;
}

// ─── Sync Bridge ─────────────────────────────────────────────────────────────

export interface TldrawYjsSyncOptions {
  /** The Yjs document to sync with */
  doc: Y.Doc;
  /** The tldraw Editor instance */
  editor: Editor;
}

/**
 * Bidirectional sync bridge between tldraw Store and Yjs Y.Doc.
 *
 * Usage:
 * ```ts
 * const sync = new TldrawYjsSync({ doc, editor });
 * // ... collaboration happens ...
 * sync.dispose(); // cleanup on unmount
 * ```
 */
export class TldrawYjsSync {
  private readonly doc: Y.Doc;
  private readonly editor: Editor;
  private readonly recordsMap: Y.Map<string>;

  /** Prevents feedback loops when applying changes from one side to the other */
  private isSuppressingRemoteUpdates = false;
  private isSuppressingLocalUpdates = false;

  /** Cleanup function for the tldraw store listener */
  private unsubscribeStore: (() => void) | null = null;

  /** Whether the sync bridge is currently active */
  private isActive = false;

  constructor({ doc, editor }: TldrawYjsSyncOptions) {
    this.doc = doc;
    this.editor = editor;
    this.recordsMap = doc.getMap<string>(RECORDS_MAP_KEY);

    this.start();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────

  /**
   * Start bidirectional sync.
   *
   * 1. Hydrate tldraw Store from existing Y.Doc state (if any)
   * 2. Start listening to tldraw Store changes → push to Yjs
   * 3. Start observing Yjs Y.Map changes → apply to tldraw Store
   */
  private start(): void {
    if (this.isActive) return;
    this.isActive = true;

    // Step 1: Hydrate from Yjs → tldraw (initial state from other peers)
    this.hydrateFromYjs();

    // Step 2: Listen to local tldraw changes → push to Yjs
    this.unsubscribeStore = this.editor.store.listen(
      this.handleLocalStoreChange,
      {
        source: "user",
        scope: "document",
      }
    );

    // Step 3: Observe remote Yjs changes → apply to tldraw
    this.recordsMap.observe(this.handleRemoteYjsChange);
  }

  /**
   * Stop sync and clean up all listeners.
   * Call this on component unmount.
   */
  dispose(): void {
    if (!this.isActive) return;
    this.isActive = false;

    // Remove tldraw store listener
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;

    // Remove Yjs map observer
    this.recordsMap.unobserve(this.handleRemoteYjsChange);
  }

  // ─── Initial Hydration ──────────────────────────────────────────────

  /**
   * Load existing records from Y.Doc into tldraw Store.
   *
   * This happens when a new client connects to a room that already
   * has state (other users were editing before this client joined).
   */
  private hydrateFromYjs(): void {
    if (this.recordsMap.size === 0) {
      // No existing state — push local tldraw state to Yjs
      this.pushLocalStateToYjs();
      return;
    }

    // Apply Yjs state to tldraw store
    const records: TLRecord[] = [];
    this.recordsMap.forEach((serialized, id) => {
      if (isSessionRecord(id)) return;
      try {
        records.push(deserializeRecord(serialized));
      } catch {
        console.warn(`[TldrawYjsSync] Failed to deserialize record: ${id}`);
      }
    });

    if (records.length > 0) {
      this.editor.store.mergeRemoteChanges(() => {
        // Remove existing document records first to avoid conflicts
        const existingIds = this.editor.store
          .allRecords()
          .filter((r) => !isSessionRecord(r.id))
          .map((r) => r.id);

        if (existingIds.length > 0) {
          this.editor.store.remove(existingIds as TLRecord["id"][]);
        }

        // Put the records from Yjs
        this.editor.store.put(records);
      });
    }
  }

  /**
   * Push local tldraw document state to Yjs for the first time.
   * Used when this client is the first to connect (empty Y.Doc).
   */
  private pushLocalStateToYjs(): void {
    this.isSuppressingRemoteUpdates = true;
    this.doc.transact(() => {
      for (const record of this.editor.store.allRecords()) {
        if (isSessionRecord(record.id)) continue;
        this.recordsMap.set(record.id, serializeRecord(record));
      }
    });
    this.isSuppressingRemoteUpdates = false;
  }

  // ─── Local → Remote (tldraw → Yjs) ────────────────────────────────

  /**
   * Handle changes made locally in tldraw → push them to Yjs.
   *
   * The store.listen callback fires for both user edits and undo/redo.
   * We filter to only document-scoped changes, serialize each record,
   * and set/delete them in the Y.Map within a single Yjs transaction.
   */
  private handleLocalStoreChange = (event: TLStoreEventInfo): void => {
    // Skip if we're currently applying remote changes to avoid feedback loops
    if (this.isSuppressingLocalUpdates) return;

    const { changes } = event;
    const hasChanges =
      Object.keys(changes.added).length > 0 ||
      Object.keys(changes.updated).length > 0 ||
      Object.keys(changes.removed).length > 0;

    if (!hasChanges) return;

    this.isSuppressingRemoteUpdates = true;

    this.doc.transact(() => {
      // Handle added records
      for (const record of Object.values(changes.added)) {
        if (isSessionRecord(record.id)) continue;
        this.recordsMap.set(record.id, serializeRecord(record));
      }

      // Handle updated records (value is [before, after])
      for (const [, after] of Object.values(changes.updated)) {
        if (isSessionRecord(after.id)) continue;
        this.recordsMap.set(after.id, serializeRecord(after));
      }

      // Handle removed records
      for (const record of Object.values(changes.removed)) {
        if (isSessionRecord(record.id)) continue;
        this.recordsMap.delete(record.id);
      }
    });

    this.isSuppressingRemoteUpdates = false;
  };

  // ─── Remote → Local (Yjs → tldraw) ────────────────────────────────

  /**
   * Handle changes from remote Yjs peers → apply them to tldraw Store.
   *
   * Y.Map fires an event with all keys that changed. We iterate the changes
   * and apply adds/updates/deletes within mergeRemoteChanges (which prevents
   * the store from emitting these as "user" changes back to us).
   */
  private handleRemoteYjsChange = (
    event: Y.YMapEvent<string>,
    transaction: Y.Transaction
  ): void => {
    // Skip changes that originated from this client (our own writes)
    if (transaction.local || this.isSuppressingRemoteUpdates) return;

    const toAdd: TLRecord[] = [];
    const toRemove: TLRecord["id"][] = [];

    event.changes.keys.forEach((change, id) => {
      if (isSessionRecord(id)) return;

      switch (change.action) {
        case "add":
        case "update": {
          const serialized = this.recordsMap.get(id);
          if (serialized) {
            try {
              toAdd.push(deserializeRecord(serialized));
            } catch {
              console.warn(
                `[TldrawYjsSync] Failed to deserialize remote record: ${id}`
              );
            }
          }
          break;
        }
        case "delete": {
          toRemove.push(id as TLRecord["id"]);
          break;
        }
      }
    });

    if (toAdd.length === 0 && toRemove.length === 0) return;

    // Apply inside mergeRemoteChanges to avoid triggering our local listener
    this.isSuppressingLocalUpdates = true;
    this.editor.store.mergeRemoteChanges(() => {
      if (toRemove.length > 0) {
        this.editor.store.remove(toRemove);
      }
      if (toAdd.length > 0) {
        this.editor.store.put(toAdd);
      }
    });
    this.isSuppressingLocalUpdates = false;
  };
}
