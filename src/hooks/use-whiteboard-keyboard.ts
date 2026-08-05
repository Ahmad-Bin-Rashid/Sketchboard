import { useEffect } from "react";
import * as Y from "yjs";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";

export function useWhiteboardKeyboard(shapesMap: Y.Map<CustomShape> | null) {
  useEffect(() => {
    if (!shapesMap) return;

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
      } = useWhiteboardStore.getState();

      const isMac =
        typeof window !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeIds.length > 0) {
          e.preventDefault();
          const doc = shapesMap.doc;
          if (doc) {
            doc.transact(() => {
              selectedShapeIds.forEach((id) => {
                shapesMap.delete(id);
              });
            });
          }
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

      // 4. Arrow keys (Nudge selected shapes)
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        selectedShapeIds.length > 0
      ) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        if (e.key === "ArrowLeft") dx = -nudgeAmount;
        if (e.key === "ArrowRight") dx = nudgeAmount;
        if (e.key === "ArrowUp") dy = -nudgeAmount;
        if (e.key === "ArrowDown") dy = nudgeAmount;

        const doc = shapesMap.doc;
        if (doc) {
          doc.transact(() => {
            selectedShapeIds.forEach((id) => {
              const current = shapesMap.get(id);
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

                shapesMap.set(id, updated);
              }
            });
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shapesMap]);
}
