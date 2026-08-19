import * as Y from "yjs";
import { nanoid } from "nanoid";
import type { CustomShape } from "@/types/whiteboard";
import { generateIndex, generateNewTopIndex } from "./fractional-index";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { UPLOAD_LIMITS } from "@/lib/constants";

// ─── Local Media Storage Helpers ─────────────────────────────────────────────

export function getLocalMediaShapes(boardId: string): Record<string, CustomShape> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(`sketchboard-local-shapes-${boardId}`);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveLocalMediaShape(boardId: string, shape: CustomShape) {
  if (typeof window === "undefined") return;
  try {
    const shapes = getLocalMediaShapes(boardId);
    shapes[shape.id] = shape;
    localStorage.setItem(`sketchboard-local-shapes-${boardId}`, JSON.stringify(shapes));
  } catch (err) {
    console.error("Failed to save local media shape:", err);
  }
}

export function deleteLocalMediaShape(boardId: string, id: string) {
  if (typeof window === "undefined") return;
  try {
    const shapes = getLocalMediaShapes(boardId);
    delete shapes[id];
    localStorage.setItem(`sketchboard-local-shapes-${boardId}`, JSON.stringify(shapes));
  } catch (err) {
    console.error("Failed to delete local media shape:", err);
  }
}

// ─── Board Size Limit Helpers ────────────────────────────────────────────────

export function getBoardDataSize(shapesMap: Y.Map<CustomShape> | null): number {
  if (!shapesMap || !shapesMap.doc) return 0;
  try {
    const update = Y.encodeStateAsUpdate(shapesMap.doc);
    return update.byteLength;
  } catch {
    return 0;
  }
}

const BOARD_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB in bytes

export function checkBoardLimitExceeded(shapesMap: Y.Map<CustomShape> | null): boolean {
  const currentSize = getBoardDataSize(shapesMap);
  return currentSize >= BOARD_SIZE_LIMIT;
}

// ─── Shape Mutation Wrappers ─────────────────────────────────────────────────

export function saveShape(
  shapesMap: Y.Map<CustomShape> | null,
  boardId: string,
  shape: CustomShape
): boolean {
  if (shape.type === "image") {
    saveLocalMediaShape(boardId, shape);
    useWhiteboardStore.getState().upsertShape(shape);
    return true;
  }

  if (!shapesMap) return false;

  if (checkBoardLimitExceeded(shapesMap)) {
    const existing = shapesMap.get(shape.id);
    if (!existing) {
      alert("Board data limit reached (10 MB). Please delete some shapes before making changes.");
      return false;
    }
  }

  const doc = shapesMap.doc;
  if (doc) {
    doc.transact(() => {
      shapesMap.set(shape.id, shape);
    });
  }
  return true;
}

export function removeShapes(
  shapesMap: Y.Map<CustomShape> | null,
  boardId: string,
  ids: string[],
  deleteMedia?: (urls: string[]) => Promise<void>
) {
  if (ids.length === 0) return;

  const localMedia = getLocalMediaShapes(boardId);
  const urlsToDelete: string[] = [];

  ids.forEach((id) => {
    if (localMedia[id]) {
      const shape = localMedia[id];
      if (shape.type === "image" && shape.src) {
        urlsToDelete.push(shape.src);
      }
      deleteLocalMediaShape(boardId, id);
      useWhiteboardStore.getState().deleteShape(id);
    } else if (shapesMap) {
      const shape = shapesMap.get(id);
      if (shape && shape.type === "image" && shape.src) {
        urlsToDelete.push(shape.src);
      }
    }
  });

  if (urlsToDelete.length > 0 && deleteMedia) {
    deleteMedia(urlsToDelete).catch((err) => {
      console.warn("Failed to delete media assets:", err);
    });
  }

  if (shapesMap) {
    const doc = shapesMap.doc;
    if (doc) {
      doc.transact(() => {
        ids.forEach((id) => {
          if (shapesMap.has(id)) {
            shapesMap.delete(id);
          }
        });
      });
    }
  }
}

// ─── Duplication, Arrangement, Alignment ─────────────────────────────────────

export function duplicateShapes(
  ids: string[],
  shapesMap: Y.Map<CustomShape> | null,
  boardId: string,
  onNewSelection: (newIds: string[]) => void
) {
  if (ids.length === 0) return;

  const storeShapes = useWhiteboardStore.getState().shapes;
  const selectedShapes = ids
    .map((id) => storeShapes[id])
    .filter((s): s is CustomShape => !!s)
    .sort((a, b) => a.index.localeCompare(b.index));

  const newIds: string[] = [];
  const allShapes = Object.values(storeShapes);
  let lastIndex = allShapes.reduce((max, s) => (s.index > max ? s.index : max), "");

  selectedShapes.forEach((shape) => {
    const nextIndex = generateIndex(lastIndex || null, null);
    lastIndex = nextIndex;

    const newId = nanoid();
    newIds.push(newId);

    const duplicated: CustomShape = {
      ...shape,
      id: newId,
      index: nextIndex,
      x: shape.x + 20,
      y: shape.y + 20,
    } as CustomShape;

    if (duplicated.type === "draw" && shape.type === "draw") {
      duplicated.points = shape.points.map(([px, py, pr]) => [px + 20, py + 20, pr]);
    }

    saveShape(shapesMap, boardId, duplicated);
  });

  if (newIds.length > 0) {
    onNewSelection(newIds);
  }
}

export function arrangeShapes(
  ids: string[],
  action: "front" | "back" | "forward" | "backward",
  shapesMap: Y.Map<CustomShape> | null,
  boardId: string
) {
  if (ids.length === 0) return;

  const storeShapes = useWhiteboardStore.getState().shapes;
  const allShapes = Object.values(storeShapes).sort((a, b) => a.index.localeCompare(b.index));
  const selectedIdsSet = new Set(ids);

  if (action === "front") {
    let highest = allShapes[allShapes.length - 1].index;
    const selected = allShapes.filter((s) => selectedIdsSet.has(s.id));
    selected.forEach((shape) => {
      const nextIndex = generateIndex(highest, null);
      saveShape(shapesMap, boardId, { ...shape, index: nextIndex } as CustomShape);
      highest = nextIndex;
    });
  } else if (action === "back") {
    let lowest = allShapes[0].index;
    const selected = allShapes.filter((s) => selectedIdsSet.has(s.id)).reverse();
    selected.forEach((shape) => {
      const nextIndex = generateIndex(null, lowest);
      saveShape(shapesMap, boardId, { ...shape, index: nextIndex } as CustomShape);
      lowest = nextIndex;
    });
  } else if (action === "forward") {
    const selected = allShapes.filter((s) => selectedIdsSet.has(s.id));
    for (let i = selected.length - 1; i >= 0; i--) {
      const shape = selected[i];
      const idx = allShapes.findIndex((s) => s.id === shape.id);
      if (idx < allShapes.length - 1) {
        let nextUnselectedIdx = idx + 1;
        while (nextUnselectedIdx < allShapes.length && selectedIdsSet.has(allShapes[nextUnselectedIdx].id)) {
          nextUnselectedIdx++;
        }
        if (nextUnselectedIdx < allShapes.length) {
          const sibling = allShapes[nextUnselectedIdx];
          const afterSibling = nextUnselectedIdx + 1 < allShapes.length ? allShapes[nextUnselectedIdx + 1].index : null;
          const nextIndex = generateIndex(sibling.index, afterSibling);
          saveShape(shapesMap, boardId, { ...shape, index: nextIndex } as CustomShape);
          
          allShapes.splice(idx, 1);
          shape.index = nextIndex;
          allShapes.splice(nextUnselectedIdx, 0, shape);
        }
      }
    }
  } else if (action === "backward") {
    const selected = allShapes.filter((s) => selectedIdsSet.has(s.id));
    for (let i = 0; i < selected.length; i++) {
      const shape = selected[i];
      const idx = allShapes.findIndex((s) => s.id === shape.id);
      if (idx > 0) {
        let prevUnselectedIdx = idx - 1;
        while (prevUnselectedIdx >= 0 && selectedIdsSet.has(allShapes[prevUnselectedIdx].id)) {
          prevUnselectedIdx--;
        }
        if (prevUnselectedIdx >= 0) {
          const sibling = allShapes[prevUnselectedIdx];
          const beforeSibling = prevUnselectedIdx - 1 >= 0 ? allShapes[prevUnselectedIdx - 1].index : null;
          const nextIndex = generateIndex(beforeSibling, sibling.index);
          saveShape(shapesMap, boardId, { ...shape, index: nextIndex } as CustomShape);

          allShapes.splice(idx, 1);
          shape.index = nextIndex;
          allShapes.splice(prevUnselectedIdx, 0, shape);
        }
      }
    }
  }
}

export function alignShapes(
  ids: string[],
  axis: "left" | "center" | "right" | "top" | "middle" | "bottom",
  shapesMap: Y.Map<CustomShape> | null,
  boardId: string
) {
  if (ids.length < 2) return;

  const storeShapes = useWhiteboardStore.getState().shapes;
  const selectedShapes = ids
    .map((id) => storeShapes[id])
    .filter((s): s is CustomShape => !!s);

  if (selectedShapes.length < 2) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedShapes.forEach((s) => {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x + s.width > maxX) maxX = s.x + s.width;
    if (s.y + s.height > maxY) maxY = s.y + s.height;
  });

  const width = maxX - minX;
  const height = maxY - minY;

  selectedShapes.forEach((shape) => {
    let nextX = shape.x;
    let nextY = shape.y;

    if (axis === "left") nextX = minX;
    else if (axis === "right") nextX = maxX - shape.width;
    else if (axis === "center") nextX = minX + (width - shape.width) / 2;
    else if (axis === "top") nextY = minY;
    else if (axis === "bottom") nextY = maxY - shape.height;
    else if (axis === "middle") nextY = minY + (height - shape.height) / 2;

    const deltaX = nextX - shape.x;
    const deltaY = nextY - shape.y;

    const updated = {
      ...shape,
      x: nextX,
      y: nextY,
    } as CustomShape;

    if (updated.type === "draw" && shape.type === "draw") {
      updated.points = shape.points.map(([px, py, pr]) => [px + deltaX, py + deltaY, pr]);
    }

    saveShape(shapesMap, boardId, updated);
  });
}

export function fitToContent(
  shapes: CustomShape[],
  viewportRef: React.RefObject<HTMLDivElement | null>,
  setPan: (p: { x: number; y: number }) => void,
  setZoom: (z: number) => void
) {
  if (!viewportRef.current) return;
  const rect = viewportRef.current.getBoundingClientRect();
  const shapesList = Object.values(shapes);

  if (shapesList.length === 0) {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapesList.forEach((shape) => {
    if (shape.x < minX) minX = shape.x;
    if (shape.y < minY) minY = shape.y;
    if (shape.x + shape.width > maxX) maxX = shape.x + shape.width;
    if (shape.y + shape.height > maxY) maxY = shape.y + shape.height;
  });

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  const padding = 48;
  const targetWidth = Math.max(100, rect.width - padding * 2);
  const targetHeight = Math.max(100, rect.height - padding * 2);

  const fitZoom = Math.min(targetWidth / w, targetHeight / h);
  const clampedZoom = Math.max(0.1, Math.min(2, fitZoom));

  const vx = rect.width / 2;
  const vy = rect.height / 2;

  const newPanX = vx - cx * clampedZoom;
  const newPanY = vy - cy * clampedZoom;

  setZoom(clampedZoom);
  setPan({ x: newPanX, y: newPanY });
}

export async function addImageShapes(
  files: File[],
  canvasPos: { x: number; y: number },
  shapesList: CustomShape[],
  shapesMap: Y.Map<CustomShape> | null,
  boardId: string,
  uploadMedia: (file: File) => Promise<string>,
  setSelectedShapeIds: (ids: string[]) => void
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const url = await uploadMedia(file);
      
      const id = nanoid();
      const index = generateNewTopIndex(shapesList);
      const offset = i * 20;

      const newShape: CustomShape = {
        id,
        type: "image",
        x: canvasPos.x - 100 + offset,
        y: canvasPos.y - 100 + offset,
        width: 200,
        height: 200,
        fill: "transparent",
        stroke: "transparent",
        strokeWidth: 0,
        opacity: 1.0,
        index,
        src: url,
        fileSize: file.size,
        mimeType: file.type,
      };

      saveShape(shapesMap, boardId, newShape);
      setSelectedShapeIds([id]);
    } catch (err) {
      console.error("Failed to upload image:", err);
    }
  }
}

export async function triggerMediaUpload({
  shapesMap,
  shapes,
  boardId,
  uploadMedia,
  viewportRef,
  setSelectedShapeIds,
  mode,
}: {
  shapesMap: Y.Map<CustomShape> | null;
  shapes: Record<string, CustomShape>;
  boardId: string;
  uploadMedia: (file: File) => Promise<string>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  setSelectedShapeIds: (ids: string[]) => void;
  mode: "guest" | "auth";
}) {
  const limit = mode === "auth" ? UPLOAD_LIMITS.AUTH : UPLOAD_LIMITS.GUEST;
  const currentUsage = Object.values(shapes)
    .filter((s) => s.type === "image")
    .reduce((acc, s) => acc + ((s as any).fileSize || 0), 0);

  if (currentUsage >= limit) {
    const limitMB = limit / (1024 * 1024);
    alert(`Upload limit exceeded: ${limitMB}MB maximum limit for ${mode} users. Please delete some existing media to free up space.`);
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = "image/*,video/*";

  input.onchange = async (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    if (files.length === 0) return;

    const selectedFilesSize = files.reduce((acc, f) => acc + f.size, 0);
    if (currentUsage + selectedFilesSize > limit) {
      alert(`Selected files exceed the remaining storage space. Maximum limit: ${limit / (1024 * 1024)}MB.`);
      return;
    }

    let cx = 100;
    let cy = 100;
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const store = useWhiteboardStore.getState();
      cx = (rect.width / 2 - store.pan.x) / store.zoom;
      cy = (rect.height / 2 - store.pan.y) / store.zoom;
    }

    await addImageShapes(
      files,
      { x: cx, y: cy },
      Object.values(shapes),
      shapesMap,
      boardId,
      uploadMedia,
      setSelectedShapeIds
    );
  };

  input.click();
}
