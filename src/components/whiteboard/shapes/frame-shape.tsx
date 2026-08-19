import React, { useRef, useEffect } from "react";
import type { FrameShape as FrameShapeType } from "@/types/whiteboard";

interface FrameShapeProps {
  shape: FrameShapeType;
  onUpdate?: (id: string, updates: Partial<FrameShapeType>) => void;
  isReadOnly?: boolean;
  isEditing?: boolean;
  onEditEnd?: () => void;
}

export function FrameShapeComponent({
  shape,
  onUpdate,
  isReadOnly = false,
  isEditing = false,
  onEditEnd,
}: FrameShapeProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate?.(shape.id, { name: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" || e.key === "Enter") {
      inputRef.current?.blur();
      e.stopPropagation();
    }
  };

  return (
    <div className="w-full h-full relative pointer-events-none">
      {/* Visual background pattern (non-interactive) */}
      <div className="absolute inset-0 bg-slate-500/5 bg-[radial-gradient(rgba(148,163,184,0.1)_1px,transparent_1px)] bg-size-[10px_10px] rounded-xl pointer-events-none" />

      {/* SVG Border with interactive target */}
      <svg className="w-full h-full overflow-visible pointer-events-none absolute inset-0">
        {/* Thick invisible click target for selecting the frame border */}
        <rect
          x={1}
          y={1}
          width={Math.max(0, shape.width - 2)}
          height={Math.max(0, shape.height - 2)}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          rx={12}
          ry={12}
          className="pointer-events-auto cursor-pointer"
        />
        {/* Visible dashed border */}
        <rect
          x={1}
          y={1}
          width={Math.max(0, shape.width - 2)}
          height={Math.max(0, shape.height - 2)}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="6,6"
          rx={12}
          ry={12}
          className="text-slate-300 dark:text-slate-700 pointer-events-auto"
        />
      </svg>

      {/* Label container at the top left */}
      <div 
        className="absolute -top-7 left-0 pointer-events-auto select-none flex items-center h-6"
        onPointerDown={(e) => {
          if (isEditing) {
            e.stopPropagation();
          }
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={shape.name || ""}
            onChange={handleChange}
            onBlur={onEditEnd}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => e.stopPropagation()} // Stop propagation to avoid dragging frame
            className="text-xs font-semibold text-foreground bg-panel-bg px-2 py-0.5 rounded border border-primary outline-none shadow-sm pointer-events-auto w-32"
          />
        ) : (
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-panel-bg/85 border border-panel-border/30 backdrop-blur-sm cursor-text hover:bg-surface-hover transition hover:text-foreground">
            {shape.name || "Frame"}
          </div>
        )}
      </div>
    </div>
  );
}
