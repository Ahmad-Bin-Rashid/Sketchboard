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
import getStroke from "perfect-freehand";

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

const VALID_TYPES: ShapeType[] = ["rectangle", "ellipse", "draw", "text", "sticky", "image", "embed"];

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

  if (shape.type === "embed") {
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

/**
 * Escapes HTML characters for inclusion in SVG.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates an SVG string representation of the whiteboard shapes.
 */
export function generateSVGString(shapes: CustomShape[]): string {
  if (shapes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"></svg>`;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach((s) => {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x + s.width > maxX) maxX = s.x + s.width;
    if (s.y + s.height > maxY) maxY = s.y + s.height;
  });

  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  const sortedShapes = [...shapes].sort((a, b) => a.index.localeCompare(b.index));

  const elements = sortedShapes.map((shape) => {
    const opacity = shape.opacity ?? 1;
    const fill = shape.fill === "transparent" ? "none" : shape.fill;
    const stroke = shape.stroke === "transparent" ? "none" : shape.stroke;

    switch (shape.type) {
      case "rectangle":
        return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" rx="4" ry="4" opacity="${opacity}" />`;
      case "ellipse":
        return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" />`;
      case "draw": {
        const relativePoints = shape.points.map(([px, py, pr]) => [
          px - shape.x,
          py - shape.y,
          pr,
        ] as [number, number, number]);
        const strokePoints = getStroke(relativePoints, {
          size: shape.strokeWidth * 1.5,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        });
        if (!strokePoints.length) return "";
        const d = strokePoints.reduce((acc, [x, y], i) => {
          if (i === 0) return `M ${x + shape.x} ${y + shape.y}`;
          return `${acc} L ${x + shape.x} ${y + shape.y}`;
        }, "");
        return `<path d="${d} Z" fill="${shape.stroke || "#000"}" stroke="${shape.stroke || "#000"}" stroke-width="1" opacity="${opacity}" />`;
      }
      case "text": {
        const lines = shape.text.split("\n");
        const fontSize = shape.fontSize ?? 16;
        const fontFamily = shape.fontFamily || "sans-serif";
        const tspans = lines
          .map((line, idx) => `<tspan x="${shape.x}" dy="${idx === 0 ? 0 : "1.2em"}">${escapeHtml(line)}</tspan>`)
          .join("");
        return `<text x="${shape.x}" y="${shape.y + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" fill="${stroke || "#000"}" opacity="${opacity}">${tspans}</text>`;
      }
      case "sticky": {
        const stickyBg = shape.fill === "transparent" ? "#fef9c3" : shape.fill || "#fef9c3";
        const stickyText = shape.stroke === "transparent" ? "#1e293b" : shape.stroke || "#1e293b";
        const lines = shape.text.split("\n");
        const fontSize = shape.fontSize ?? 14;
        const textYStart = shape.y + (shape.height - (lines.length * fontSize * 1.4)) / 2 + fontSize;
        const tspans = lines
          .map((line, idx) => `<tspan x="${shape.x + shape.width / 2}" dy="${idx === 0 ? 0 : "1.4em"}">${escapeHtml(line)}</tspan>`)
          .join("");
        return `
          <g opacity="${opacity}">
            <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${stickyBg}" rx="8" ry="8" />
            <text x="${shape.x + shape.width / 2}" y="${textYStart}" font-family="sans-serif" font-size="${fontSize}" fill="${stickyText}" text-anchor="middle">${tspans}</text>
          </g>
        `;
      }
      case "image":
        return `<image href="${shape.src}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" opacity="${opacity}" />`;
      case "embed":
        return `
          <g opacity="${opacity}">
            <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" rx="8" ry="8" />
            <text x="${shape.x + shape.width / 2}" y="${shape.y + shape.height / 2}" font-family="sans-serif" font-size="12" fill="#4b5563" text-anchor="middle">Embed URL: ${escapeHtml(shape.src)}</text>
          </g>
        `;
      default:
        return "";
    }
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">
      <style>
        text { user-select: none; white-space: pre-wrap; }
      </style>
      ${elements.join("\n")}
    </svg>
  `.trim();
}

/**
 * Exports the whiteboard shapes as a clean SVG file.
 */
export function exportBoardAsSVG(shapes: CustomShape[], boardName: string) {
  const svgString = generateSVGString(shapes);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName = boardName.replace(/[^a-z0-9\-_\s]/gi, "").trim() || "board";

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.svg`;
  a.click();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

/**
 * Exports the whiteboard shapes as a PNG file.
 */
export function exportBoardAsPNG(shapes: CustomShape[], boardName: string) {
  const svgString = generateSVGString(shapes);
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const reader = new FileReader();

  reader.onload = () => {
    img.src = reader.result as string;
  };

  img.onload = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapes.forEach((s) => {
      if (s.x < minX) minX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.x + s.width > maxX) maxX = s.x + s.width;
      if (s.y + s.height > maxY) maxY = s.y + s.height;
    });

    const padding = 20;
    const width = (maxX - minX || 100) + padding * 2;
    const height = (maxY - minY || 100) + padding * 2;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const url = canvas.toDataURL("image/png");
        const safeName = boardName.replace(/[^a-z0-9\-_\s]/gi, "").trim() || "board";
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeName}.png`;
        a.click();
      } catch (err) {
        console.error("Failed to generate PNG (likely due to insecure resource URL in SVG):", err);
      }
    }
  };

  reader.readAsDataURL(svgBlob);
}
