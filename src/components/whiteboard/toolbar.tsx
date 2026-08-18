"use client";

import React, { useState } from "react";
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
  Hand,
  Zap,
  ChevronUp,
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape, ToolType } from "@/types/whiteboard";
import { cn } from "@/lib/utils";

// Custom shape icons for the grid popover to match SVG outputs perfectly
const TriangleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,3 21,20 3,20" />
  </svg>
);

const DiamondIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,3 21,12 12,21 3,12" />
  </svg>
);

const ParallelogramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7,5 21,5 17,19 3,19" />
  </svg>
);

const HexagonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7,3 17,3 22,12 17,21 7,21 2,12" />
  </svg>
);

const OctagonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" />
  </svg>
);

const CylinderIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M 4,6 L 4,18 A 8,3 0 0,0 20,18 L 20,6" />
  </svg>
);

const RoundedRectIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
  </svg>
);

const SpeechBubbleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 21,15 C 21,16.1 20.1,17 19,17 L 7,17 L 3,21 L 3,5 C 3,3.9 3.9,3 5,3 L 19,3 C 20.1,3 21,3.9 21,5 Z" />
  </svg>
);

interface ToolbarProps {
  shapesMap: Y.Map<CustomShape> | null;
}

export function Toolbar({ shapesMap }: ToolbarProps) {
  const { activeTool, setActiveTool } = useWhiteboardStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    setShowMoreMenu(false);
  };

  const tools = [
    { type: "select" as ToolType, icon: MousePointer, label: "Select (S)" },
    { type: "hand" as ToolType, icon: Hand, label: "Hand (H)" },
    { type: "draw" as ToolType, icon: Pencil, label: "Pencil (D)" },
    { type: "line" as ToolType, icon: Minus, label: "Line (L)" },
    { type: "arrow" as ToolType, icon: ArrowRight, label: "Arrow (A)" },
    { type: "rectangle" as ToolType, icon: Square, label: "Rectangle (R)" },
    { type: "ellipse" as ToolType, icon: Circle, label: "Ellipse (O)" },
    { type: "text" as ToolType, icon: Type, label: "Text (T)" },
    { type: "sticky" as ToolType, icon: StickyNote, label: "Sticky Note (N)" },
    { type: "laser" as ToolType, icon: Zap, label: "Laser Pointer" },
  ];

  const moreShapes = [
    { type: "triangle", label: "Triangle", icon: TriangleIcon },
    { type: "diamond", label: "Diamond", icon: DiamondIcon },
    { type: "parallelogram", label: "Parallelogram", icon: ParallelogramIcon },
    { type: "hexagon", label: "Hexagon", icon: HexagonIcon },
    { type: "octagon", label: "Octagon", icon: OctagonIcon },
    { type: "cylinder", label: "Cylinder", icon: CylinderIcon },
    { type: "rounded-rectangle", label: "Rounded Rectangle", icon: RoundedRectIcon },
    { type: "speech-bubble", label: "Speech Bubble", icon: SpeechBubbleIcon },
  ];

  const isMoreActive = moreShapes.some((s) => s.type === activeTool);

  return (
    <>
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-[190] pointer-events-auto"
          onClick={() => setShowMoreMenu(false)}
        />
      )}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3">
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

          <div className="h-6 w-[1px] bg-panel-border" />

          {/* More Shapes Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-surface-hover",
                isMoreActive
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                  : showMoreMenu
                  ? "bg-surface-hover text-foreground"
                  : "text-muted-foreground"
              )}
              title="More Shapes"
              aria-label="More Shapes"
            >
              <ChevronUp className={cn("h-5 w-5 transition-transform duration-200", showMoreMenu && "rotate-180")} />
            </button>

            {showMoreMenu && (
              <div
                className="absolute bottom-full mb-3 right-0 z-[210] rounded-2xl bg-panel-bg p-3 shadow-xl border border-panel-border backdrop-blur-md flex flex-col gap-2 min-w-[200px] animate-fade-in"
                // style={{ border: "1px solid var(--panel-border)" }}
              >
                {/* <div className="text-[10px] font-semibold text-muted-foreground uppercase px-1 pb-1 border-b border-panel-border select-none">
                  More Shapes
                </div> */}
                <div className="grid grid-cols-4 gap-1.5">
                  {moreShapes.map((shape) => {
                    const IconComponent = shape.icon;
                    const isShapeActive = activeTool === shape.type;
                    return (
                      <button
                        key={shape.type}
                        onClick={() => handleToolChange(shape.type as ToolType)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-surface-hover text-muted-foreground",
                          isShapeActive && "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                        )}
                        title={shape.label}
                        aria-label={shape.label}
                      >
                        <IconComponent />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

