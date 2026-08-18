import React, { useRef, useLayoutEffect, useEffect } from "react";
import type { StickyShape as StickyShapeType } from "@/types/whiteboard";
import { SHAPE_DEFAULTS } from "@/lib/constants";

interface StickyShapeProps {
  shape: StickyShapeType;
  onUpdate: (id: string, updates: Partial<StickyShapeType>) => void;
  isReadOnly?: boolean;
  isEditing?: boolean;
  onEditEnd?: () => void;
}

export function StickyShape({
  shape,
  onUpdate,
  isReadOnly = false,
  isEditing = false,
  onEditEnd,
}: StickyShapeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Reactive dynamic measuring and updating of shape dimensions for sticky notes
  useLayoutEffect(() => {
    if (isEditing && measureRef.current) {
      // Get exact text scroll width and height
      // Sticky notes have a default size, they start as a post-it and grow as text expands
      // Add 32px padding for post-it note border margins
      const width = Math.max(120, measureRef.current.scrollWidth + 32);
      const height = Math.max(120, measureRef.current.scrollHeight + 32);

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
      className="w-full h-full p-4 rounded-lg shadow-md flex items-center justify-center transition-shadow select-none relative overflow-hidden"
      style={{
        backgroundColor,
        color: textColor,
        border: `1px solid ${shape.stroke === "transparent" ? "transparent" : shape.stroke || "#1e293b"}`,
      }}
    >
      {isEditing ? (
        <div className="relative w-full h-full">
          {/* Hidden mirror element to calculate text bounding box */}
          <span
            ref={measureRef}
            className="absolute pointer-events-none invisible whitespace-pre-wrap wrap-break-word"
            style={{
              fontSize: `${shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE}px`,
              fontFamily: shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY,
              fontWeight: shape.fontWeight || 'normal',
              fontStyle: shape.fontStyle || 'normal',
              textDecoration: shape.textDecoration || 'none',
              lineHeight: "1.4",
              width: "max-content",
              maxWidth: "400px", // Comfortable max width for sticky notes
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
            onPointerDown={(e) => e.stopPropagation()} // Prevent canvas deselect/drag
            className="w-full h-full bg-transparent resize-none overflow-hidden p-0 wrap-break-word select-text pointer-events-auto"
            style={{
              fontSize: `${shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE}px`,
              fontFamily: shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY,
              fontWeight: shape.fontWeight || 'normal',
              fontStyle: shape.fontStyle || 'normal',
              textDecoration: shape.textDecoration || 'none',
              textAlign: shape.textAlign || 'center',
              lineHeight: "1.4",
              color: textColor,
              border: "none",
              outline: "none",
              boxShadow: "none",
              padding: 0,
              margin: 0,
            }}
          />
        </div>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center wrap-break-word overflow-hidden whitespace-pre-wrap"
          style={{
            fontSize: `${shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE}px`,
            fontFamily: shape.fontFamily || SHAPE_DEFAULTS.FONT_FAMILY,
            fontWeight: shape.fontWeight || 'normal',
            fontStyle: shape.fontStyle || 'normal',
            textDecoration: shape.textDecoration || 'none',
            textAlign: shape.textAlign || 'center',
            justifyContent: shape.textAlign === 'left' ? 'flex-start' : shape.textAlign === 'right' ? 'flex-end' : 'center',
            lineHeight: "1.4",
          }}
        >
          {shape.text || "Double click to write"}
        </div>
      )}
    </div>
  );
}
