"use client";

import React from "react";
import * as Y from "yjs";
import {
  Circle,
  MousePointer,
  Pencil,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape, ToolType } from "@/types/whiteboard";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  shapesMap: Y.Map<CustomShape> | null;
}

// Earthy colors palette preset
const COLOR_PRESETS = [
  { name: "Stone", value: "#78716c" },
  { name: "Olive", value: "#606756" },
  { name: "Terracotta", value: "#b85d43" },
  { name: "Ochre", value: "#d4a373" },
  { name: "Slate", value: "#475569" },
  { name: "Sage", value: "#829c87" },
  { name: "Transparent", value: "transparent" },
];

export function Toolbar({ shapesMap }: ToolbarProps) {
  const { activeTool, setActiveTool, selectedShapeIds, shapes } = useWhiteboardStore();

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
  };

  // Find the currently selected shape (if only one is selected) to show its styles
  const selectedShape =
    selectedShapeIds.length === 1 ? shapes[selectedShapeIds[0]] : null;

  const updateSelectedShapeStyle = (
    updater: (shape: CustomShape) => Partial<CustomShape>
  ) => {
    if (!shapesMap || selectedShapeIds.length === 0) return;

    // Apply updates inside a single Yjs transaction
    const doc = shapesMap.doc;
    if (doc) {
      doc.transact(() => {
        selectedShapeIds.forEach((id) => {
          const current = shapesMap.get(id);
          if (current) {
            const updated = {
              ...current,
              ...updater(current),
            } as CustomShape;
            shapesMap.set(id, updated);
          }
        });
      });
    }
  };

  const tools = [
    { type: "select" as ToolType, icon: MousePointer, label: "Select (V)" },
    { type: "rectangle" as ToolType, icon: Square, label: "Rectangle (R)" },
    { type: "ellipse" as ToolType, icon: Circle, label: "Ellipse (O)" },
    { type: "draw" as ToolType, icon: Pencil, label: "Pencil (D)" },
    { type: "text" as ToolType, icon: Type, label: "Text (T)" },
    { type: "sticky" as ToolType, icon: StickyNote, label: "Sticky Note (S)" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-200 flex flex-col items-center gap-3">
      {/* Secondary styles settings panel for selected shapes */}
      {selectedShape && (
        <div
          className="flex items-center gap-4 rounded-xl bg-panel-bg p-3 shadow-lg backdrop-blur-md"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          {/* Stroke / Border colors */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">
              Stroke
            </span>
            <div className="flex gap-1">
              {COLOR_PRESETS.filter((c) => c.value !== "transparent").map((c) => (
                <button
                  key={c.name}
                  onClick={() => updateSelectedShapeStyle(() => ({ stroke: c.value }))}
                  className={cn(
                    "h-5 w-5 rounded-full border border-panel-border transition hover:scale-110",
                    selectedShape.stroke === c.value && "ring-2 ring-primary ring-offset-2 ring-offset-panel-bg"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Fill colors */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">
              Fill
            </span>
            <div className="flex gap-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => updateSelectedShapeStyle(() => ({ fill: c.value }))}
                  className={cn(
                    "h-5 w-5 rounded-full border border-panel-border transition hover:scale-110 relative overflow-hidden",
                    selectedShape.fill === c.value && "ring-2 ring-primary ring-offset-2 ring-offset-panel-bg"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {c.value === "transparent" && (
                    <div className="absolute top-0 right-0 bottom-0 left-0 border-t border-red-500 rotate-45" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Line/Stroke Width */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">
              Width
            </span>
            <div className="flex items-center gap-1.5 h-6">
              {[2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => updateSelectedShapeStyle(() => ({ strokeWidth: w }))}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-semibold hover:bg-surface-hover transition",
                    selectedShape.strokeWidth === w ? "bg-primary text-primary-foreground" : "bg-panel-bg text-foreground"
                  )}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">
              Opacity
            </span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={selectedShape.opacity ?? 1.0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateSelectedShapeStyle(() => ({ opacity: val }));
              }}
              className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      )}

      {/* Main Tools Pill Toolbar */}
      <div
        className="flex items-center gap-1.5 rounded-2xl bg-panel-bg p-2 shadow-xl backdrop-blur-md"
        style={{ border: "1px solid var(--panel-border)" }}
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.type;

          return (
            <button
              key={tool.type}
              onClick={() => handleToolChange(tool.type)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-surface-hover",
                isActive ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm" : "text-muted-foreground"
              )}
              title={tool.label}
              aria-label={tool.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
