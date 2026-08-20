"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Y from "yjs";
import {
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Download,
  Settings,
  Sun,
  Moon,
  Maximize,
  Grid,
  ChevronDown,
  LayoutGrid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Minimize2,
  Upload,
  Keyboard,
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import {
  duplicateShapes,
  arrangeShapes,
  alignShapes,
  removeShapes,
  saveShape,
} from "@/lib/board-actions";
import { exportBoardAsFile, exportBoardAsSVG, exportBoardAsPNG, openImportFilePicker, type ImportResult } from "@/lib/board-export";
import { useTheme } from "@/components/theme-provider";

interface CommandBarProps {
  shapesMap: Y.Map<CustomShape> | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  boardId: string;
  boardName: string;
  onRename?: (newName: string) => void;
  deleteMedia?: (urls: string[]) => Promise<void>;
  onOpenKeyboardShortcuts: () => void;
}

export function CommandBar({
  shapesMap,
  canUndo,
  canRedo,
  undo,
  redo,
  boardId,
  boardName,
  onRename,
  deleteMedia,
  onOpenKeyboardShortcuts,
}: CommandBarProps) {
  const {
    selectedShapeIds,
    setSelectedShapeIds,
    shapes,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    focusMode,
    setFocusMode,
  } = useWhiteboardStore();

  const [activeDropdown, setActiveDropdown] = useState<"export" | "board" | "arrange" | "align" | null>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  const handleDuplicate = () => {
    duplicateShapes(selectedShapeIds, shapesMap, boardId, (newIds) => {
      setSelectedShapeIds(newIds);
    });
    setActiveDropdown(null);
  };

  const handleDelete = () => {
    removeShapes(shapesMap, boardId, selectedShapeIds, deleteMedia);
    setSelectedShapeIds([]);
    setActiveDropdown(null);
  };

  const handleArrange = (action: "front" | "back" | "forward" | "backward") => {
    arrangeShapes(selectedShapeIds, action, shapesMap, boardId);
    setActiveDropdown(null);
  };

  const handleAlign = (axis: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    alignShapes(selectedShapeIds, axis, shapesMap, boardId);
    setActiveDropdown(null);
  };

  const handleImport = () => {
    openImportFilePicker((result: ImportResult) => {
      if (result.ok && result.shapes) {
        if (shapesMap) {
          const doc = shapesMap.doc;
          if (doc) {
            doc.transact(() => {
              shapesMap.clear();
            });
          }
        }
        // Clear local media shapes from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem(`sketchboard-local-shapes-${boardId}`);
        }

        result.shapes?.forEach((shape) => {
          saveShape(shapesMap, boardId, shape);
        });

        setImportMsg("Board imported!");
        if (result.boardName && onRename) {
          onRename(result.boardName);
        }
      } else {
        setImportMsg(result.error ?? "Import failed");
      }
      setTimeout(() => setImportMsg(null), 3000);
    });
  };

  const toggleDropdown = (dropdown: "export" | "board" | "arrange" | "align") => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const shapesList = Object.values(shapes);
  const selectedCount = selectedShapeIds.length;

  return (
    <>
      <div
        ref={barRef}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-200 flex items-center gap-1 rounded-xl bg-panel-bg p-1.5 shadow-md border border-panel-border backdrop-blur-md transition select-none"
        style={{ pointerEvents: "auto" }}
      >
        {/* Group 1: Undo / Redo */}
        <div className="flex items-center">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-foreground hover:bg-surface-hover disabled:opacity-40 transition cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-foreground hover:bg-surface-hover disabled:opacity-40 transition cursor-pointer"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-panel-border mx-1" />

        {/* Group 2: Clipboard Actions */}
        <div className="flex items-center">
          <button
            onClick={handleDuplicate}
            disabled={selectedCount === 0}
            className="p-1.5 rounded-lg text-foreground hover:bg-surface-hover disabled:opacity-40 transition cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedCount === 0}
            className="p-1.5 rounded-lg text-destructive hover:bg-red-500/10 disabled:opacity-40 transition cursor-pointer"
            title="Delete (Delete)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-panel-border mx-1" />

        {/* Group 3: Arrange Layering */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("arrange")}
            disabled={selectedCount === 0}
            className={`flex items-center gap-0.5 p-1.5 rounded-lg text-foreground hover:bg-surface-hover disabled:opacity-40 transition cursor-pointer ${
              activeDropdown === "arrange" ? "bg-surface-hover" : ""
            }`}
            title="Arrange Layers"
          >
            <LayoutGrid className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {activeDropdown === "arrange" && (
            <div className="absolute top-full left-0 mt-1.5 w-40 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-300">
              <button
                onClick={() => handleArrange("front")}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Bring to Front
              </button>
              <button
                onClick={() => handleArrange("forward")}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Bring Forward
              </button>
              <button
                onClick={() => handleArrange("backward")}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Send Backward
              </button>
              <button
                onClick={() => handleArrange("back")}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Send to Back
              </button>
            </div>
          )}
        </div>

        {/* Group 4: Align Shapes */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("align")}
            disabled={selectedCount < 2}
            className={`flex items-center gap-0.5 p-1.5 rounded-lg text-foreground hover:bg-surface-hover disabled:opacity-40 transition cursor-pointer ${
              activeDropdown === "align" ? "bg-surface-hover" : ""
            }`}
            title="Align Shapes"
          >
            <AlignLeft className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {activeDropdown === "align" && (
            <div className="absolute top-full left-0 mt-1.5 w-44 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-300">
              <button
                onClick={() => handleAlign("left")}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <AlignLeft className="h-3.5 w-3.5" /> Align Left
              </button>
              <button
                onClick={() => handleAlign("center")}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <AlignCenter className="h-3.5 w-3.5" /> Align Center
              </button>
              <button
                onClick={() => handleAlign("right")}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <AlignRight className="h-3.5 w-3.5" /> Align Right
              </button>
              <div className="h-px bg-panel-border my-0.5" />
              <button
                onClick={() => handleAlign("top")}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <AlignStartVertical className="h-3.5 w-3.5" /> Align Top
              </button>
              <button
                onClick={() => handleAlign("middle")}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <AlignCenterVertical className="h-3.5 w-3.5" /> Align Middle
              </button>
              <button
                onClick={() => handleAlign("bottom")}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <AlignEndVertical className="h-3.5 w-3.5" /> Align Bottom
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Import Button */}
        <button
          onClick={handleImport}
          className="p-1.5 rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
          title="Import .whiteboard file"
        >
          <Upload className="h-4 w-4" />
        </button>

        {/* Group 5: Exports */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("export")}
            className={`flex items-center gap-0.5 p-1.5 rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer ${
              activeDropdown === "export" ? "bg-surface-hover" : ""
            }`}
            title="Export Options"
          >
            <Download className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {activeDropdown === "export" && (
            <div className="absolute top-full left-0 mt-1.5 w-44 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-300">
              <button
                onClick={() => {
                  exportBoardAsPNG(shapesList, boardName);
                  setActiveDropdown(null);
                }}
                title="Export as .png image"
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Export PNG
              </button>
              <button
                onClick={() => {
                  exportBoardAsSVG(shapesList, boardName);
                  setActiveDropdown(null);
                }}
                title="Export as .svg image"
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Export SVG
              </button>
              <button
                onClick={() => {
                  exportBoardAsFile(shapesList, boardId, boardName);
                  setActiveDropdown(null);
                }}
                title="Export as .whiteboard file"
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                Export .whiteboard
              </button>
            </div>
          )}
        </div>

        {/* Group 6: Board Tools & Preferences */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("board")}
            className={`flex items-center gap-0.5 p-1.5 rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer ${
              activeDropdown === "board" ? "bg-surface-hover" : ""
            }`}
            title="Board Tools & Settings"
          >
            <Settings className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {activeDropdown === "board" && (
            <div className="absolute top-full right-0 mt-1.5 w-48 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-300">
              <button
                onClick={() => {
                  setActiveDropdown(null);
                  onOpenKeyboardShortcuts();
                }}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                Keyboard Shortcuts
              </button>
              <div className="h-px bg-panel-border my-0.5" />
              {/* Preferences */}
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-muted-foreground">
                Preferences
              </div>
              <button
                onClick={() => {
                  setShowGrid(!showGrid);
                }}
                className="flex items-center justify-between w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Grid className="h-3.5 w-3.5 text-muted-foreground" /> Grid
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {showGrid ? "Enabled" : "Disabled"}
                </span>
              </button>
              <button
                onClick={() => {
                  setSnapToGrid(!snapToGrid);
                }}
                className="flex items-center justify-between w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" /> Snap to Grid
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {snapToGrid ? "Enabled" : "Disabled"}
                </span>
              </button>
              <button
                onClick={() => {
                  setFocusMode(!focusMode);
                }}
                className="flex items-center justify-between w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {focusMode ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize className="h-3.5 w-3.5 text-muted-foreground" />}
                  Focus Mode
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {focusMode ? "On" : "Off"}
                </span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-between w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {resolvedTheme === "light" ? <Sun className="h-3.5 w-3.5 text-muted-foreground" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
                  Theme
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold capitalize">
                  {theme}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-panel-border mx-1" />

      </div>

      {/* Import feedback toast */}
      {importMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-200 rounded-lg bg-card px-3 py-1.5 text-xs text-foreground shadow-md border border-panel-border backdrop-blur-md">
          {importMsg}
        </div>
      )}
    </>
  );
}
