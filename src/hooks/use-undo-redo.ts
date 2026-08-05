import { useEffect } from "react";
import type { UndoManager } from "yjs";

export function useUndoRedo(undoManager: UndoManager | null) {
  useEffect(() => {
    if (!undoManager) return;

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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoManager]);
}
