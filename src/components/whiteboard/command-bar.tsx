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
  Keyboard,
  Upload,
  Play,
  Film,
  Video,
  Music,
  Layout,
  Code,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import {
  duplicateShapes,
  arrangeShapes,
  alignShapes,
  fitToContent,
} from "@/lib/board-actions";
import { exportBoardAsFile, exportBoardAsSVG, exportBoardAsPNG, openImportFilePicker, type ImportResult } from "@/lib/board-export";
import { generateNewTopIndex } from "@/lib/fractional-index";
import { nanoid } from "nanoid";

const validateUrlByCategory = (url: string, category: string): boolean => {
  try {
    const lower = url.trim().toLowerCase();
    if (!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("<iframe")) {
      return false;
    }
    switch (category) {
      case "youtube":
        return lower.includes("youtube.com") || lower.includes("youtu.be");
      case "vimeo":
        return lower.includes("vimeo.com");
      case "loom":
        return lower.includes("loom.com");
      case "spotify":
        return lower.includes("spotify.com");
      case "figma":
        return lower.includes("figma.com");
      case "codepen":
        return lower.includes("codepen.io");
      case "google-maps":
        return lower.includes("google.com/maps") || lower.includes("google.co") && lower.includes("/maps") || lower.startsWith("<iframe");
      default:
        return false;
    }
  } catch {
    return false;
  }
};

const getCategoryDisplayName = (category: string): string => {
  const map: Record<string, string> = {
    "youtube": "YouTube",
    "vimeo": "Vimeo",
    "loom": "Loom",
    "spotify": "Spotify",
    "figma": "Figma",
    "codepen": "CodePen",
    "google-maps": "Google Maps",
  };
  return map[category] || category;
};

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
  const [embedStep, setEmbedStep] = useState<"category" | "url">("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
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

  // Sync theme status on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("sketchboard-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  const handleDuplicate = () => {
    duplicateShapes(selectedShapeIds, shapesMap, (newIds) => {
      setSelectedShapeIds(newIds);
    });
    setActiveDropdown(null);
  };

  const handleDelete = () => {
    if (!shapesMap || selectedShapeIds.length === 0) return;
    const doc = shapesMap.doc;
    if (doc) {
      doc.transact(() => {
        selectedShapeIds.forEach((id) => shapesMap.delete(id));
      });
    }
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

  const handleInsertEmbed = () => {
    if (!embedUrl.trim() || !shapesMap || !selectedCategory) return;

    const isValid = validateUrlByCategory(embedUrl, selectedCategory);
    if (!isValid) {
      setValidationError(`Invalid URL. The link does not match the format for ${getCategoryDisplayName(selectedCategory)}.`);
      return;
    }

    setValidationError(null);

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
          stroke: "#78716c",
          strokeWidth: 2,
          opacity: 1.0,
          index,
          src: embedUrl.trim(),
        };

        shapesMap.set(id, newShape);
        setSelectedShapeIds([id]);
      });
    }

    setEmbedUrl("");
    setSelectedCategory(null);
    setEmbedStep("category");
    setShowEmbedDialog(false);
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
                  setEmbedStep("category");
                  setSelectedCategory(null);
                  setEmbedUrl("");
                  setValidationError(null);
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
                  {theme === "light" ? <Sun className="h-3.5 w-3.5 text-muted-foreground" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
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

        {/* Group 7: View Fits */}
        <div className="flex items-center">
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
        </div>
      </div>

      {/* Embed insertion modal/dialog */}
      {/* Embed insertion modal/dialog */}
      {showEmbedDialog && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-panel-bg p-6 border border-panel-border shadow-xl backdrop-blur-md flex flex-col gap-4">
            
            {embedStep === "category" ? (
              <>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-bold text-foreground">Insert Embeded Media</h2>
                  <p className="text-xs text-muted-foreground">Select a media platform/provider below to embed on the canvas.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 my-2">
                  {[
                    { id: "youtube", name: "YouTube", icon: Play, desc: "Video streaming", color: "text-red-500 bg-red-500/10" },
                    { id: "vimeo", name: "Vimeo", icon: Film, desc: "High-quality video", color: "text-blue-400 bg-blue-400/10" },
                    { id: "loom", name: "Loom", icon: Video, desc: "Screencasts & recordings", color: "text-purple-500 bg-purple-500/10" },
                    { id: "spotify", name: "Spotify", icon: Music, desc: "Music tracks & albums", color: "text-green-500 bg-green-500/10" },
                    { id: "figma", name: "Figma", icon: Layout, desc: "Design frames & prototypes", color: "text-orange-500 bg-orange-500/10" },
                    { id: "codepen", name: "CodePen", icon: Code, desc: "Front-end code sandboxes", color: "text-sky-500 bg-sky-500/10" },
                    { id: "google-maps", name: "Google Maps", icon: MapPin, desc: "Interactive maps", color: "text-emerald-500 bg-emerald-500/10" },
                  ].map((cat) => {
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setEmbedStep("url");
                        }}
                        className="flex flex-col items-start gap-2 p-3 text-left rounded-xl border border-panel-border hover:border-primary hover:bg-surface-hover transition cursor-pointer group"
                      >
                        <div className={`p-2 rounded-lg ${cat.color} group-hover:scale-105 transition-transform`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{cat.name}</span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">{cat.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => {
                      setEmbedUrl("");
                      setSelectedCategory(null);
                      setEmbedStep("category");
                      setValidationError(null);
                      setShowEmbedDialog(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEmbedStep("category");
                      setValidationError(null);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-bold text-foreground">
                      Embed {getCategoryDisplayName(selectedCategory || "")}
                    </h2>
                    <p className="text-[10px] text-muted-foreground">Only secure {getCategoryDisplayName(selectedCategory || "")} links are permitted.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 my-2">
                  <label className="text-xs font-medium text-muted-foreground">Paste URL:</label>
                  <input
                    type="text"
                    placeholder={
                      selectedCategory === "youtube" ? "https://www.youtube.com/watch?v=..." :
                      selectedCategory === "vimeo" ? "https://vimeo.com/..." :
                      selectedCategory === "loom" ? "https://www.loom.com/share/..." :
                      selectedCategory === "spotify" ? "https://open.spotify.com/track/..." :
                      selectedCategory === "figma" ? "https://www.figma.com/file/..." :
                      selectedCategory === "codepen" ? "https://codepen.io/..." :
                      "https://www.google.com/maps/..."
                    }
                    value={embedUrl}
                    onChange={(e) => {
                      setEmbedUrl(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInsertEmbed();
                      if (e.key === "Escape") {
                        setEmbedUrl("");
                        setSelectedCategory(null);
                        setEmbedStep("category");
                        setValidationError(null);
                        setShowEmbedDialog(false);
                      }
                    }}
                  />
                  {validationError && (
                    <span className="text-[11px] text-destructive leading-tight bg-destructive/10 border border-destructive/20 rounded-lg p-2 mt-1">
                      {validationError}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setEmbedStep("category");
                      setValidationError(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover rounded-xl transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleInsertEmbed}
                    disabled={!embedUrl.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 rounded-xl transition cursor-pointer"
                  >
                    Insert
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
      {/* Import feedback toast */}
      {importMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] rounded-lg bg-card px-3 py-1.5 text-xs text-foreground shadow-md border border-panel-border backdrop-blur-md">
          {importMsg}
        </div>
      )}
    </>
  );
}
