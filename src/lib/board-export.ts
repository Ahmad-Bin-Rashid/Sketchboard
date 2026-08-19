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
import { SHAPE_DEFAULTS } from "@/lib/constants";


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

const VALID_TYPES: ShapeType[] = [
  "rectangle",
  "ellipse",
  "draw",
  "text",
  "sticky",
  "image",
  "embed",
  "line",
  "arrow",
  "triangle",
  "diamond",
  "parallelogram",
  "hexagon",
  "octagon",
  "cylinder",
  "rounded-rectangle",
  "speech-bubble",
  "frame",
];

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

  if (shape.type === "line" || shape.type === "arrow") {
    return (
      typeof shape.x1n === "number" &&
      typeof shape.y1n === "number" &&
      typeof shape.x2n === "number" &&
      typeof shape.y2n === "number"
    );
  }

  if (shape.type === "frame") {
    return typeof (shape as any).name === "string";
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
      case "line": {
        const x1 = shape.x + (shape.x1n ?? 0) * shape.width;
        const y1 = shape.y + (shape.y1n ?? 0) * shape.height;
        const x2 = shape.x + (shape.x2n ?? 0) * shape.width;
        const y2 = shape.y + (shape.y2n ?? 0) * shape.height;
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linecap="round" />`;
      }
      case "arrow": {
        const x1 = shape.x + (shape.x1n ?? 0) * shape.width;
        const y1 = shape.y + (shape.y1n ?? 0) * shape.height;
        const x2 = shape.x + (shape.x2n ?? 0) * shape.width;
        const y2 = shape.y + (shape.y2n ?? 0) * shape.height;
        
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headSize = Math.max(10, shape.strokeWidth * 3);
        const arrowX1 = x2 - headSize * Math.cos(angle - Math.PI / 6);
        const arrowY1 = y2 - headSize * Math.sin(angle - Math.PI / 6);
        const arrowX2 = x2 - headSize * Math.cos(angle + Math.PI / 6);
        const arrowY2 = y2 - headSize * Math.sin(angle + Math.PI / 6);

        return `
          <g opacity="${opacity}">
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" ${strokeDash} stroke-linecap="round" />
            <path d="M ${x2} ${y2} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z" fill="${stroke}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round" />
          </g>
        `;
      }
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
        const fontSize = shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE;
        const fontFamily = shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY;
        const tspans = lines
          .map((line, idx) => `<tspan x="${shape.x}" dy="${idx === 0 ? 0 : "1.2em"}">${escapeHtml(line)}</tspan>`)
          .join("");
        return `<text x="${shape.x}" y="${shape.y + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" fill="${stroke || "#000"}" opacity="${opacity}">${tspans}</text>`;
      }
      case "sticky": {
        const stickyBg = shape.fill === "transparent" ? SHAPE_DEFAULTS.STICKY_FILL : shape.fill || SHAPE_DEFAULTS.STICKY_FILL;
        const stickyText = shape.stroke === "transparent" ? SHAPE_DEFAULTS.STICKY_STROKE : shape.stroke || SHAPE_DEFAULTS.STICKY_STROKE;
        const lines = shape.text.split("\n");
        const fontSize = shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE;
        const textYStart = shape.y + (shape.height - (lines.length * fontSize * 1.4)) / 2 + fontSize;
        const tspans = lines
          .map((line, idx) => `<tspan x="${shape.x + shape.width / 2}" dy="${idx === 0 ? 0 : "1.4em"}">${escapeHtml(line)}</tspan>`)
          .join("");
        return `
          <g opacity="${opacity}">
            <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${stickyBg}" rx="8" ry="8" />
            <text x="${shape.x + shape.width / 2}" y="${textYStart}" font-family="${shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY}" font-size="${fontSize}" fill="${stickyText}" text-anchor="middle">${tspans}</text>
          </g>
        `;
      }
      case "image": {
        let href = shape.src;
        if (href.startsWith("local://")) {
          const localId = href.replace("local://", "");
          if (typeof window !== "undefined") {
            href = localStorage.getItem(`sketchboard-local-media-data-${localId}`) ?? href;
          }
        }
        return `<image href="${href}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" opacity="${opacity}" />`;
      }
      case "embed":
        return `
          <g opacity="${opacity}">
            <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" rx="8" ry="8" />
            <text x="${shape.x + shape.width / 2}" y="${shape.y + shape.height / 2}" font-family="sans-serif" font-size="12" fill="#4b5563" text-anchor="middle">Embed URL: ${escapeHtml(shape.src)}</text>
          </g>
        `;
      case "triangle": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const p1x = shape.x + shape.width / 2;
        const p1y = shape.y;
        const p2x = shape.x + shape.width;
        const p2y = shape.y + shape.height;
        const p3x = shape.x;
        const p3y = shape.y + shape.height;
        return `<polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linejoin="round" />`;
      }
      case "diamond": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const p1x = shape.x + shape.width / 2;
        const p1y = shape.y;
        const p2x = shape.x + shape.width;
        const p2y = shape.y + shape.height / 2;
        const p3x = shape.x + shape.width / 2;
        const p3y = shape.y + shape.height;
        const p4x = shape.x;
        const p4y = shape.y + shape.height / 2;
        return `<polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linejoin="round" />`;
      }
      case "parallelogram": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const p1x = shape.x + shape.width * 0.25;
        const p1y = shape.y;
        const p2x = shape.x + shape.width;
        const p2y = shape.y;
        const p3x = shape.x + shape.width * 0.75;
        const p3y = shape.y + shape.height;
        const p4x = shape.x;
        const p4y = shape.y + shape.height;
        return `<polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linejoin="round" />`;
      }
      case "hexagon": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const p1x = shape.x + shape.width * 0.25;
        const p1y = shape.y;
        const p2x = shape.x + shape.width * 0.75;
        const p2y = shape.y;
        const p3x = shape.x + shape.width;
        const p3y = shape.y + shape.height * 0.5;
        const p4x = shape.x + shape.width * 0.75;
        const p4y = shape.y + shape.height;
        const p5x = shape.x + shape.width * 0.25;
        const p5y = shape.y + shape.height;
        const p6x = shape.x;
        const p6y = shape.y + shape.height * 0.5;
        return `<polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y} ${p5x},${p5y} ${p6x},${p6y}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linejoin="round" />`;
      }
      case "octagon": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const p1x = shape.x + shape.width * 0.3;
        const p1y = shape.y;
        const p2x = shape.x + shape.width * 0.7;
        const p2y = shape.y;
        const p3x = shape.x + shape.width;
        const p3y = shape.y + shape.height * 0.3;
        const p4x = shape.x + shape.width;
        const p4y = shape.y + shape.height * 0.7;
        const p5x = shape.x + shape.width * 0.7;
        const p5y = shape.y + shape.height;
        const p6x = shape.x + shape.width * 0.3;
        const p6y = shape.y + shape.height;
        const p7x = shape.x;
        const p7y = shape.y + shape.height * 0.7;
        const p8x = shape.x;
        const p8y = shape.y + shape.height * 0.3;
        return `<polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y} ${p5x},${p5y} ${p6x},${p6y} ${p7x},${p7y} ${p8x},${p8y}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linejoin="round" />`;
      }
      case "cylinder": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const ry = shape.height * 0.15;
        const rx = shape.width / 2;
        const cx = shape.x + rx;
        const cy = shape.y + ry;
        return `
          <g opacity="${opacity}">
            <path d="M ${shape.x} ${shape.y + ry} L ${shape.x} ${shape.y + shape.height - ry} A ${rx} ${ry} 0 0 0 ${shape.x + shape.width} ${shape.y + shape.height - ry} L ${shape.x + shape.width} ${shape.y + ry} Z" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" ${strokeDash} stroke-linejoin="round" />
            <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" ${strokeDash} />
          </g>
        `;
      }
      case "rounded-rectangle": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const r = (shape as any).borderRadius ?? 16;
        return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" rx="${r}" ry="${r}" opacity="${opacity}" ${strokeDash} />`;
      }
      case "speech-bubble": {
        let strokeDash = "";
        if (shape.strokeStyle === "dashed") strokeDash = `stroke-dasharray="6,6"`;
        else if (shape.strokeStyle === "dotted") strokeDash = `stroke-dasharray="2,4"`;
        const w = shape.width;
        const h = shape.height;
        const r = Math.min(15, Math.min(w * 0.15, h * 0.15));
        const x = shape.x;
        const y = shape.y;
        const d = `M ${x + r} ${y} L ${x + w - r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h * 0.8 - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h * 0.8} L ${x + w * 0.35} ${y + h * 0.8} L ${x + w * 0.15} ${y + h} L ${x + w * 0.20} ${y + h * 0.8} L ${x + r} ${y + h * 0.8} A ${r} ${r} 0 0 1 ${x} ${y + h * 0.8 - r} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`.replace(/\s+/g, " ");
        return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" opacity="${opacity}" ${strokeDash} stroke-linejoin="round" />`;
      }
      case "frame": {
        const label = (shape as any).name || "Frame";
        return `
          <g opacity="${opacity}">
            <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" stroke-dasharray="4,4" rx="12" ry="12" />
            <text x="${shape.x + 8}" y="${shape.y - 6}" font-family="sans-serif" font-size="10" fill="${stroke}">${escapeHtml(label)}</text>
          </g>
        `;
      }
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
