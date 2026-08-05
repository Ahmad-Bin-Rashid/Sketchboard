import React, { useState, useRef, useEffect } from "react";
import type { TextShape as TextShapeType } from "@/types/whiteboard";

interface TextShapeProps {
  shape: TextShapeType;
  onUpdate: (id: string, updates: Partial<TextShapeType>) => void;
  isReadOnly?: boolean;
}

export function TextShape({ shape, onUpdate, isReadOnly = false }: TextShapeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

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
    // Exit edit mode on Escape
    if (e.key === "Escape") {
      textareaRef.current?.blur();
      e.stopPropagation();
    }
    // Exit edit mode on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textareaRef.current?.blur();
      e.stopPropagation();
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={shape.text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag-selection/pan on input
        className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-0 font-sans break-words select-text pointer-events-auto"
        style={{
          color: shape.stroke || "var(--foreground)",
          fontSize: `${shape.fontSize ?? 16}px`,
          fontFamily: shape.fontFamily || "sans-serif",
          lineHeight: "1.2",
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="w-full h-full select-none font-sans break-words whitespace-pre-wrap flex items-start"
      style={{
        color: shape.stroke || "var(--foreground)",
        fontSize: `${shape.fontSize ?? 16}px`,
        fontFamily: shape.fontFamily || "sans-serif",
        lineHeight: "1.2",
      }}
    >
      {shape.text || "Double click to edit"}
    </div>
  );
}
