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
  Minus,
  ArrowRight,
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape, ToolType } from "@/types/whiteboard";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  shapesMap: Y.Map<CustomShape> | null;
}

export function Toolbar({ shapesMap }: ToolbarProps) {
  const { activeTool, setActiveTool } = useWhiteboardStore();

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
  };

  const tools = [
    { type: "select" as ToolType, icon: MousePointer, label: "Select (V)" },
    { type: "line" as ToolType, icon: Minus, label: "Line (L)" },
    { type: "arrow" as ToolType, icon: ArrowRight, label: "Arrow (A)" },
    { type: "draw" as ToolType, icon: Pencil, label: "Pencil (D)" },
    { type: "rectangle" as ToolType, icon: Square, label: "Rectangle (R)" },
    { type: "ellipse" as ToolType, icon: Circle, label: "Ellipse (O)" },
    { type: "text" as ToolType, icon: Type, label: "Text (T)" },
    { type: "sticky" as ToolType, icon: StickyNote, label: "Sticky Note (S)" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-200 flex flex-col items-center gap-3">
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
