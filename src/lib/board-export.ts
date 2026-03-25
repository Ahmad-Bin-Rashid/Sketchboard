/**
 * Board export and import utilities.
 *
 * Boards can be saved to / loaded from `.whiteboard` JSON files.
 * This lets guest users "save their work" locally and share files,
 * and auth users can download a portable copy of any board.
 *
 * File format:
 * {
 *   version: 1,
 *   appName: "SketchBoard",
 *   boardId: string,
 *   boardName: string,
 *   snapshot: TLStoreSnapshot,
 *   exportedAt: ISO string,
 * }
 */

import type { Editor, TLEditorSnapshot } from "tldraw";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhiteboardFile {
  version: 1;
  appName: "SketchBoard";
  boardId: string;
  boardName: string;
  snapshot: TLEditorSnapshot;
  exportedAt: string;
}

export interface ImportResult {
  ok: boolean;
  boardName?: string;
  error?: string;
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Export the current board to a `.whiteboard` file and trigger download.
 *
 * Uses `editor.store.getSnapshot()` which captures all shapes, assets,
 * and page state in a portable JSON format.
 */
export function exportBoardAsFile(
  editor: Editor,
  boardId: string,
  boardName: string
): void {
  const snapshot = editor.getSnapshot();

  const file: WhiteboardFile = {
    version: 1,
    appName: "SketchBoard",
    boardId,
    boardName,
    snapshot,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Sanitize file name: remove characters invalid in file names
  const safeName = boardName.replace(/[^a-z0-9\-_\s]/gi, "").trim() || "board";

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.whiteboard`;
  a.click();

  // Clean up the blob URL immediately after triggering download
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

// ─── Import ──────────────────────────────────────────────────────────────────

/**
 * Import a `.whiteboard` file into the current editor.
 *
 * Reads the file, validates the format, and loads the snapshot.
 * Returns the board name from the file so the caller can update UI state.
 */
export async function importBoardFromFile(
  editor: Editor,
  file: File
): Promise<ImportResult> {
  return new Promise((resolve) => {
    if (!file.name.endsWith(".whiteboard") && file.type !== "application/json") {
      resolve({ ok: false, error: "Invalid file type. Please select a .whiteboard file." });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as WhiteboardFile;

        // Validate structure
        if (parsed.version !== 1 || !parsed.snapshot) {
          resolve({ ok: false, error: "Invalid .whiteboard file format." });
          return;
        }

        // Load snapshot into the editor — replaces all current content
        editor.loadSnapshot(parsed.snapshot);

        resolve({ ok: true, boardName: parsed.boardName });
      } catch {
        resolve({ ok: false, error: "Failed to parse file. The file may be corrupted." });
      }
    };

    reader.onerror = () => {
      resolve({ ok: false, error: "Failed to read file." });
    };

    reader.readAsText(file);
  });
}

/**
 * Open a native file picker and import the selected file.
 * Convenience wrapper around importBoardFromFile.
 */
export function openImportFilePicker(
  editor: Editor,
  onResult: (result: ImportResult) => void
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".whiteboard,application/json";

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const result = await importBoardFromFile(editor, file);
    onResult(result);
  };

  input.click();
}
