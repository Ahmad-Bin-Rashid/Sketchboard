/**
 * Board export and import utilities.
 *
 * Boards can be saved to / loaded from `.whiteboard` JSON files.
 * This lets guest users "save their work" locally and share files,
 * and auth users can download a portable copy of any board.
 *
 * File format:
 * {
 *   version: 2,
 *   appName: "SketchBoard",
 *   boardId: string,
 *   boardName: string,
 *   shapes: CustomShape[],
 *   exportedAt: ISO string,
 * }
 */

import type { CustomShape, ShapeType } from "@/types/whiteboard";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhiteboardFile {
  version: 2;
  appName: "SketchBoard";
  boardId: string;
  boardName: string;
  shapes: CustomShape[];
  exportedAt: string;
}

export interface ImportResult {
  ok: boolean;
  shapes?: CustomShape[];
  boardName?: string;
  error?: string;
}

const VALID_TYPES: ShapeType[] = ["rectangle", "ellipse", "draw", "text", "sticky", "image"];

// ─── Type Guard ──────────────────────────────────────────────────────────────

function isValidShape(s: unknown): s is CustomShape {
  if (typeof s !== "object" || !s) return false;
  const shape = s as Record<string, unknown>;

  // Enforce base structural constraints
  const hasBaseFields =
    typeof shape.id === "string" &&
    VALID_TYPES.includes(shape.type as ShapeType) &&
    typeof shape.x === "number" &&
    typeof shape.y === "number" &&
    typeof shape.width === "number" &&
    typeof shape.height === "number" &&
    typeof shape.fill === "string" &&
    typeof shape.stroke === "string" &&
    typeof shape.strokeWidth === "number" &&
    typeof shape.opacity === "number" &&
    typeof shape.index === "string";

  if (!hasBaseFields) return false;

  // Enforce type-specific constraints
  if (shape.type === "draw") {
    if (!Array.isArray(shape.points)) return false;
    return shape.points.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 3 &&
        typeof p[0] === "number" &&
        typeof p[1] === "number" &&
        typeof p[2] === "number"
    );
  }

  if (shape.type === "text") {
    return (
      typeof shape.text === "string" &&
      typeof shape.fontSize === "number" &&
      typeof shape.fontFamily === "string"
    );
  }

  if (shape.type === "sticky") {
    return (
      typeof shape.text === "string" &&
      typeof shape.fontSize === "number"
    );
  }

  if (shape.type === "image") {
    return typeof shape.src === "string";
  }

  return true;
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Export the current shapes to a `.whiteboard` file and trigger download.
 */
export function exportBoardAsFile(
  shapes: CustomShape[],
  boardId: string,
  boardName: string
): void {
  const file: WhiteboardFile = {
    version: 2,
    appName: "SketchBoard",
    boardId,
    boardName,
    shapes,
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
 * Import a `.whiteboard` file.
 * Reads the file, validates the format, and extracts shapes.
 */
export async function importBoardFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    if (!file.name.endsWith(".whiteboard") && file.type !== "application/json") {
      resolve({ ok: false, error: "Invalid file type. Please select a .whiteboard file." });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as Record<string, any>;

        // Validate structure
        if (parsed.version !== 2 || !Array.isArray(parsed.shapes)) {
          resolve({ ok: false, error: "Invalid .whiteboard file format. Only version 2 is supported." });
          return;
        }

        const validShapes: CustomShape[] = [];
        for (const s of parsed.shapes) {
          if (isValidShape(s)) {
            validShapes.push(s);
          } else {
            resolve({ ok: false, error: "Malformed shapes detected in file." });
            return;
          }
        }

        resolve({
          ok: true,
          shapes: validShapes,
          boardName: typeof parsed.boardName === "string" ? parsed.boardName : undefined,
        });
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
 */
export function openImportFilePicker(
  onResult: (result: ImportResult) => void
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".whiteboard,application/json";

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const result = await importBoardFromFile(file);
    onResult(result);
  };

  input.click();
}
