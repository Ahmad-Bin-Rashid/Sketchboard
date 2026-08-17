"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Y from "yjs";
import {
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Download,
  Globe,
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
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import {
  duplicateShapes,
  arrangeShapes,
  alignShapes,
  fitToContent,
  deleteShapes,
} from "@/lib/board-actions";
import { exportBoardAsFile, exportBoardAsSVG, exportBoardAsPNG, openImportFilePicker, type ImportResult } from "@/lib/board-export";
import { generateNewTopIndex } from "@/lib/fractional-index";
import { nanoid } from "nanoid";
import { SHAPE_DEFAULTS } from "@/lib/constants";
import { EmbedDialog } from "./embed-dialog";
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
}

export function CommandBar({
  shapesMap,
  canUndo,
  canRedo,
  undo,
  redo,
  viewportRef,
  boardId,
  boardName,
  onRename,
}: CommandBarProps) {
  const {
    selectedShapeIds,
    setSelectedShapeIds,
    shapes,
    setPan,
    setZoom,
    zoom,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    focusMode,
    setFocusMode,
  } = useWhiteboardStore();

  const [activeDropdown, setActiveDropdown] = useState<"export" | "board" | "arrange" | "align" | null>(null);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
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
    duplicateShapes(selectedShapeIds, shapesMap, (newIds) => {
      setSelectedShapeIds(newIds);
    });
    setActiveDropdown(null);
  };

  const handleDelete = () => {
    deleteShapes(selectedShapeIds, shapesMap);
    setSelectedShapeIds([]);
    setActiveDropdown(null);
  };

  const handleArrange = (action: "front" | "back" | "forward" | "backward") => {
    arrangeShapes(selectedShapeIds, action, shapesMap);
    setActiveDropdown(null);
  };

  const handleAlign = (axis: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    alignShapes(selectedShapeIds, axis, shapesMap);
    setActiveDropdown(null);
  };

  const handleInsertEmbed = (url: string, category: string) => {
    if (!shapesMap) return;

    const doc = shapesMap.doc;
    if (doc) {
      doc.transact(() => {
        const id = nanoid();
        const index = generateNewTopIndex(Object.values(shapes));
        
        // Place in center of viewport
        let cx = 100;
        let cy = 100;
        if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const store = useWhiteboardStore.getState();
          cx = (rect.width / 2 - store.pan.x) / store.zoom - 200;
          cy = (rect.height / 2 - store.pan.y) / store.zoom - 150;
        }

        const newShape: CustomShape = {
          id,
          type: "embed",
          x: cx,
          y: cy,
          width: 400,
          height: 300,
          fill: "transparent",
          stroke: SHAPE_DEFAULTS.STROKE,
          strokeWidth: 2,
          opacity: 1.0,
          index,
          src: url,
        };

        shapesMap.set(id, newShape);
        setSelectedShapeIds([id]);
      });
    }
  };

  const handleImport = () => {
    if (!shapesMap) return;
    openImportFilePicker((result: ImportResult) => {
      if (result.ok && result.shapes) {
        const doc = shapesMap.doc;
        if (doc) {
          doc.transact(() => {
            shapesMap.clear();
            result.shapes?.forEach((shape) => {
              shapesMap.set(shape.id, shape);
            });
          });
        }
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
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-1 rounded-xl bg-panel-bg p-1.5 shadow-md border border-panel-border backdrop-blur-md transition select-none"
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

        <div className="w-[1px] h-4 bg-panel-border mx-1" />

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

        <div className="w-[1px] h-4 bg-panel-border mx-1" />

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
            <div className="absolute top-full left-0 mt-1.5 w-40 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-[300]">
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
            <div className="absolute top-full left-0 mt-1.5 w-44 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-[300]">
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
            <div className="absolute top-full left-0 mt-1.5 w-44 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-[300]">
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
            <div className="absolute top-full right-0 mt-1.5 w-48 flex flex-col gap-0.5 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border backdrop-blur-md z-[300]">
              <button
                onClick={() => {
                  setShowEmbedDialog(true);
                  setActiveDropdown(null);
                }}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Insert Embeded Media
              </button>
              
              <div className="h-px bg-panel-border my-1" />
              
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

        <div className="w-[1px] h-4 bg-panel-border mx-1" />

        {/* Group 7: View Fits (No need for zoom options in Command Bar - Keep it commented for now) */}
        {/* <div className="flex items-center">
          <button
            onClick={() => fitToContent(shapesList, viewportRef, setPan, setZoom)}
            className="p-1.5 rounded-lg text-foreground hover:bg-surface-hover transition cursor-pointer"
            title="Fit to Screen"
          >
            <Maximize className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (viewportRef.current) {
                const rect = viewportRef.current.getBoundingClientRect();
                const vx = rect.width / 2;
                const vy = rect.height / 2;
                if (shapesList.length === 0) {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                } else {
                  // Fit content but force zoom 1
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
                  const cx = minX + (maxX - minX) / 2;
                  const cy = minY + (maxY - minY) / 2;
                  setZoom(1);
                  setPan({ x: vx - cx, y: vy - cy });
                }
              }
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-foreground hover:bg-surface-hover transition cursor-pointer"
            title="Zoom to 100%"
          >
            100%
          </button>
        </div> */}
      </div>

      {/* Embed insertion modal/dialog */}
      <EmbedDialog
        isOpen={showEmbedDialog}
        onClose={() => setShowEmbedDialog(false)}
        onInsert={handleInsertEmbed}
      />
      {/* Import feedback toast */}
      {importMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] rounded-lg bg-card px-3 py-1.5 text-xs text-foreground shadow-md border border-panel-border backdrop-blur-md">
          {importMsg}
        </div>
      )}
    </>
  );
}
