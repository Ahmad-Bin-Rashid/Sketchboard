import { useEffect, useState, useCallback } from "react";
import type { UndoManager } from "yjs";

export function useUndoRedo(undoManager: UndoManager | null) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = useCallback(() => {
    if (!undoManager) return;
    setCanUndo(undoManager.undoStack.length > 0);
    setCanRedo(undoManager.redoStack.length > 0);
  }, [undoManager]);

  useEffect(() => {
    if (!undoManager) return;

    updateUndoRedoState();

    undoManager.on("stack-item-added", updateUndoRedoState);
    undoManager.on("stack-item-popped", updateUndoRedoState);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: do not trigger when user is typing in inputs or textareas
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement instanceof HTMLElement &&
          document.activeElement.isContentEditable)
      ) {
        return;
      }

      const isMac =
        typeof window !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          undoManager.redo();
        } else {
          undoManager.undo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        undoManager.redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      undoManager.off("stack-item-added", updateUndoRedoState);
      undoManager.off("stack-item-popped", updateUndoRedoState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoManager, updateUndoRedoState]);

  const undo = useCallback(() => {
    undoManager?.undo();
  }, [undoManager]);

  const redo = useCallback(() => {
    undoManager?.redo();
  }, [undoManager]);

  return { canUndo, canRedo, undo, redo };
}
