import React, { useRef, useLayoutEffect, useEffect } from "react";
import type { TextShape as TextShapeType } from "@/types/whiteboard";
import { SHAPE_DEFAULTS } from "@/lib/constants";

interface TextShapeProps {
  shape: TextShapeType;
  onUpdate: (id: string, updates: Partial<TextShapeType>) => void;
  isReadOnly?: boolean;
  isEditing?: boolean;
  onEditEnd?: () => void;
}

export function TextShape({
  shape,
  onUpdate,
  isReadOnly = false,
  isEditing = false,
  onEditEnd,
}: TextShapeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Auto-focus and select all text when editing is enabled
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Reactive dynamic measuring and updating of shape dimensions
  useLayoutEffect(() => {
    if (isEditing && measureRef.current) {
      // Get exact text scroll width and height
      // Add small horizontal (4px) and vertical (2px) padding to accommodate cursors and lines
      const width = Math.max(64, measureRef.current.scrollWidth + 4);
      const height = Math.max(shape.fontSize * 1.2, measureRef.current.scrollHeight + 2);

      const widthDiff = Math.abs(width - (shape.width || 0));
      const heightDiff = Math.abs(height - (shape.height || 0));

      if (widthDiff > 2 || heightDiff > 2) {
        onUpdate(shape.id, { width, height });
      }
    }
  }, [shape.text, shape.fontSize, shape.fontFamily, isEditing, shape.width, shape.height, onUpdate, shape.id]);

  const handleBlur = () => {
    onEditEnd?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onUpdate(shape.id, { text });
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
      <div className="relative w-full h-full">
        {/* Hidden mirror element to calculate text bounding box */}
        <span
          ref={measureRef}
          className="absolute pointer-events-none invisible whitespace-pre-wrap wrap-break-word"
          style={{
            fontSize: `${shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE}px`,
            fontFamily: shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY,
            fontWeight: shape.fontWeight || "normal",
            fontStyle: shape.fontStyle || "normal",
            textDecoration: shape.textDecoration || "none",
            lineHeight: "1.2",
            width: "max-content",
            maxWidth: "600px",
          }}
        >
          {shape.text ? (shape.text.endsWith("\n") ? shape.text + " " : shape.text) : " "}
        </span>

        <textarea
          ref={textareaRef}
          value={shape.text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag-selection/pan on input
          className="w-full h-full bg-transparent resize-none overflow-hidden p-0 wrap-break-word select-text pointer-events-auto"
          style={{
            color: shape.stroke || "var(--foreground)",
            fontSize: `${shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE}px`,
            fontFamily: shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY,
            fontWeight: shape.fontWeight || "normal",
            fontStyle: shape.fontStyle || "normal",
            textDecoration: shape.textDecoration || "none",
            textAlign: shape.textAlign || "left",
            lineHeight: "1.2",
            border: "none",
            outline: "none",
            boxShadow: "none",
            padding: 0,
            margin: 0,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full select-none wrap-break-word whitespace-pre-wrap flex items-start pointer-events-auto cursor-pointer"
      style={{
        color: shape.stroke || "var(--foreground)",
        fontSize: `${shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE}px`,
        fontFamily: shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY,
        fontWeight: shape.fontWeight || "normal",
        fontStyle: shape.fontStyle || "normal",
        textDecoration: shape.textDecoration || "none",
        textAlign: shape.textAlign || "left",
        justifyContent:
          shape.textAlign === "center"
            ? "center"
            : shape.textAlign === "right"
            ? "flex-end"
            : "flex-start",
        lineHeight: "1.2",
      }}
    >
      {shape.text || "Double click to edit"}
    </div>
  );
}
