import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import { removeShapes, saveShape, triggerMediaUpload, duplicateShapes } from "@/lib/board-actions";
import { generateIndex } from "@/lib/fractional-index";
import { nanoid } from "nanoid";

export function useWhiteboardKeyboard(
  shapesMap: Y.Map<CustomShape> | null,
  uploadMedia: (file: File) => Promise<string>,
  deleteMedia: (urls: string[]) => Promise<void>,
  viewportRef: React.RefObject<HTMLDivElement | null>,
  mode: "guest" | "auth",
  boardId: string
) {
  const shapesMapRef = useRef<Y.Map<CustomShape> | null>(shapesMap);

  useEffect(() => {
    shapesMapRef.current = shapesMap;
  }, [shapesMap]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: do not trigger when user is typing in input or textareas
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement instanceof HTMLElement &&
          document.activeElement.isContentEditable)
      ) {
        return;
      }

      const {
        selectedShapeIds,
        shapes,
        setSelectedShapeIds,
        clearSelection,
        setActiveTool,
        activeTool,
      } = useWhiteboardStore.getState();

      const isMac =
        typeof window !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeIds.length > 0 && shapesMapRef.current) {
          e.preventDefault();
          removeShapes(shapesMapRef.current, boardId, selectedShapeIds, deleteMedia);
          setSelectedShapeIds([]);
        }
      }

      // 2. Escape
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        setActiveTool("select");
      }

      // 3. Ctrl/Cmd + A (Select All)
      if (isCmdOrCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedShapeIds(Object.keys(shapes));
      }

      // Ctrl/Cmd + U (Upload Media)
      if (isCmdOrCtrl && e.key.toLowerCase() === "u") {
        e.preventDefault();
        if (viewportRef) {
          triggerMediaUpload({
            shapesMap: shapesMapRef.current,
            shapes,
            boardId,
            uploadMedia,
            viewportRef,
            setSelectedShapeIds,
            mode: mode || "guest",
          });
        }
      }

      // Duplicate (Ctrl/Cmd + D)
      if (isCmdOrCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedShapeIds.length > 0 && shapesMapRef.current) {
          duplicateShapes(selectedShapeIds, shapesMapRef.current, boardId, (newIds) => {
            setSelectedShapeIds(newIds);
          });
        }
      }

      // Copy (Ctrl/Cmd + C)
      if (isCmdOrCtrl && e.key.toLowerCase() === "c") {
        if (selectedShapeIds.length > 0) {
          e.preventDefault();
          const selectedShapes = selectedShapeIds
            .map((id) => shapes[id])
            .filter((s): s is CustomShape => !!s);
          const data = {
            type: "sketchboard-shapes",
            shapes: selectedShapes,
          };
          navigator.clipboard.writeText(JSON.stringify(data)).catch((err) => {
            console.error("Failed to copy shapes to clipboard: ", err);
          });
        }
      }

      // Paste (Ctrl/Cmd + V)
      if (isCmdOrCtrl && e.key.toLowerCase() === "v") {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          try {
            const data = JSON.parse(text);
            if (data && data.type === "sketchboard-shapes" && Array.isArray(data.shapes)) {
              const shapesToPaste = data.shapes as CustomShape[];
              if (shapesToPaste.length === 0) return;

              const storeShapes = useWhiteboardStore.getState().shapes;
              const allShapes = Object.values(storeShapes);
              let lastIndex = allShapes.reduce((max, s) => (s.index > max ? s.index : max), "");

              const newIds: string[] = [];
              const { setSelectedShapeIds } = useWhiteboardStore.getState();

              // Sort them by index to preserve layering relative order if possible
              const sortedShapes = [...shapesToPaste].sort((a, b) => a.index.localeCompare(b.index));

              if (shapesMapRef.current) {
                const map = shapesMapRef.current;
                const doc = map.doc;
                const pasteAction = () => {
                  sortedShapes.forEach((shape) => {
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

                    saveShape(map, boardId, duplicated);
                  });

                  if (newIds.length > 0) {
                    setSelectedShapeIds(newIds);
                  }
                };

                if (doc) {
                  doc.transact(pasteAction);
                } else {
                  pasteAction();
                }
              }
            }
          } catch (err) {
            console.error("Failed to parse clipboard data or paste shapes: ", err);
          }
        }).catch((err) => {
          console.error("Failed to read from clipboard: ", err);
        });
      }

      // Zoom In (Ctrl/Cmd + Shift + = / +)
      if (isCmdOrCtrl && e.shiftKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        const { zoom, setZoom, pan, setPan } = useWhiteboardStore.getState();
        const nextZoom = zoom * 1.1;
        const clampedZoom = Math.max(0.1, Math.min(20, nextZoom));
        if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const vx = rect.width / 2;
          const vy = rect.height / 2;
          const newPanX = vx - (vx - pan.x) * (clampedZoom / zoom);
          const newPanY = vy - (vy - pan.y) * (clampedZoom / zoom);
          setZoom(clampedZoom);
          setPan({ x: newPanX, y: newPanY });
        } else {
          setZoom(clampedZoom);
        }
      }

      // Zoom Out (Ctrl/Cmd + Shift + - / _)
      if (isCmdOrCtrl && e.shiftKey && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        const { zoom, setZoom, pan, setPan } = useWhiteboardStore.getState();
        const nextZoom = zoom / 1.1;
        const clampedZoom = Math.max(0.1, Math.min(20, nextZoom));
        if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const vx = rect.width / 2;
          const vy = rect.height / 2;
          const newPanX = vx - (vx - pan.x) * (clampedZoom / zoom);
          const newPanY = vy - (vy - pan.y) * (clampedZoom / zoom);
          setZoom(clampedZoom);
          setPan({ x: newPanX, y: newPanY });
        } else {
          setZoom(clampedZoom);
        }
      }

      // Fit to Screen (Ctrl/Cmd + Shift + H)
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        if (viewportRef.current) {
          const { setZoom, setPan, shapes } = useWhiteboardStore.getState();
          const rect = viewportRef.current.getBoundingClientRect();
          const shapesList = Object.values(shapes);

          const centerOnShapes = (targetZoom: number) => {
            const vx = rect.width / 2;
            const vy = rect.height / 2;
            if (shapesList.length === 0) {
              setZoom(targetZoom);
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
            const newPanX = vx - cx * targetZoom;
            const newPanY = vy - cy * targetZoom;
            setZoom(targetZoom);
            setPan({ x: newPanX, y: newPanY });
          };

          if (shapesList.length === 0) {
            centerOnShapes(1);
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
          const padding = 64;
          const targetWidth = Math.max(100, rect.width - padding * 2);
          const targetHeight = Math.max(100, rect.height - padding * 2);
          const fitZoom = Math.min(targetWidth / w, targetHeight / h);
          const clampedZoom = Math.max(0.1, Math.min(2, fitZoom));
          centerOnShapes(clampedZoom);
        }
      }

      // 5. Tool Selection Shortcuts (S, R, O, D, T, N, L, A, H)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "s") {
          e.preventDefault();
          setActiveTool("select");
        } else if (key === "r") {
          e.preventDefault();
          setActiveTool("rectangle");
        } else if (key === "o") {
          e.preventDefault();
          setActiveTool("ellipse");
        } else if (key === "d") {
          e.preventDefault();
          setActiveTool("draw");
        } else if (key === "t") {
          e.preventDefault();
          setActiveTool("text");
        } else if (key === "n") {
          e.preventDefault();
          setActiveTool("sticky");
        } else if (key === "l") {
          e.preventDefault();
          setActiveTool("line");
        } else if (key === "a") {
          e.preventDefault();
          setActiveTool("arrow");
        } else if (key === "h") {
          e.preventDefault();
          setActiveTool(activeTool === "hand" ? "select" : "hand");
        } else if (key === "f") {
          e.preventDefault();
          setActiveTool("frame");
        } else if (key === "e") {
          e.preventDefault();
          setActiveTool("eraser");
        }
      }

      // 4. Arrow keys (Nudge selected shapes)
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        selectedShapeIds.length > 0 &&
        shapesMapRef.current
      ) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        if (e.key === "ArrowLeft") dx = -nudgeAmount;
        if (e.key === "ArrowRight") dx = nudgeAmount;
        if (e.key === "ArrowUp") dy = -nudgeAmount;
        if (e.key === "ArrowDown") dy = nudgeAmount;

        const currentMap = shapesMapRef.current;
        const storeShapes = useWhiteboardStore.getState().shapes;
        selectedShapeIds.forEach((id) => {
          const current = storeShapes[id];
          if (current) {
            const updated = {
              ...current,
              x: current.x + dx,
              y: current.y + dy,
            } as CustomShape;

            if (updated.type === "draw" && current.type === "draw") {
              updated.points = current.points.map(([px, py, pr]) => [
                px + dx,
                py + dy,
                pr,
              ]);
            }

            saveShape(currentMap, boardId, updated);
          }
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
