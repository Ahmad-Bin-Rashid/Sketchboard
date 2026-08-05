import React, { useState, useRef, useEffect } from "react";
import type { StickyShape as StickyShapeType } from "@/types/whiteboard";
import { useWhiteboardStore } from "@/store/whiteboard-store";

interface StickyShapeProps {
  shape: StickyShapeType;
  onUpdate: (id: string, updates: Partial<StickyShapeType>) => void;
  isReadOnly?: boolean;
}

export function StickyShape({ shape, onUpdate, isReadOnly = false }: StickyShapeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-enter edit mode if the shape is selected and empty (e.g. just created)
  const { selectedShapeIds } = useWhiteboardStore();
  const isSelected = selectedShapeIds.includes(shape.id);

  useEffect(() => {
    if (isSelected && shape.text === "" && !isReadOnly) {
      setIsEditing(true);
    }
  }, [isSelected, shape.text, isReadOnly]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(shape.id, { text: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      textareaRef.current?.blur();
      e.stopPropagation();
    }
  };

  // Themed sticky note background colors with fallback
  const backgroundColor = shape.fill === "transparent" ? "#fef9c3" : shape.fill || "#fef9c3";
  const textColor = shape.stroke === "transparent" ? "#1e293b" : shape.stroke || "#1e293b";

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="w-full h-full p-4 rounded-lg shadow-md flex items-center justify-center transition-shadow select-none relative overflow-hidden"
      style={{
        backgroundColor,
        color: textColor,
        border: shape.strokeWidth > 0 ? `${shape.strokeWidth}px solid ${shape.stroke}` : "none",
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={shape.text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()} // Prevent canvas deselect/drag
          className="w-full h-full bg-transparent border-none outline-none resize-none overflow-y-auto p-0 font-sans text-center break-words select-text pointer-events-auto"
          style={{
            fontSize: `${shape.fontSize ?? 14}px`,
            lineHeight: "1.4",
            color: textColor,
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-sans text-center break-words overflow-hidden whitespace-pre-wrap"
          style={{
            fontSize: `${shape.fontSize ?? 14}px`,
            lineHeight: "1.4",
          }}
        >
          {shape.text || "Double click to write"}
        </div>
      )}
    </div>
  );
}
