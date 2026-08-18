import React from "react";
import type { RectShape } from "@/types/whiteboard";

interface RectangleShapeProps {
  shape: RectShape;
}

export function RectangleShape({ shape }: RectangleShapeProps) {
  const fill = shape.fill === "transparent" ? "none" : shape.fill;
  const strokeDash =
    shape.strokeStyle === "dashed"
      ? "6,6"
      : shape.strokeStyle === "dotted"
      ? "2,4"
      : undefined;

  return (
    <svg className="w-full h-full overflow-visible pointer-events-none absolute inset-0">
      {/* Thick invisible click target for selection */}
      <rect
        x={shape.strokeWidth / 2}
        y={shape.strokeWidth / 2}
        width={Math.max(0, shape.width - shape.strokeWidth)}
        height={Math.max(0, shape.height - shape.strokeWidth)}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, shape.strokeWidth)}
        rx={shape.borderRadius ?? 2}
        ry={shape.borderRadius ?? 2}
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible rect */}
      <rect
        x={shape.strokeWidth / 2}
        y={shape.strokeWidth / 2}
        width={Math.max(0, shape.width - shape.strokeWidth)}
        height={Math.max(0, shape.height - shape.strokeWidth)}
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={strokeDash}
        rx={shape.borderRadius ?? 2}
        ry={shape.borderRadius ?? 2}
        className="pointer-events-auto"
      />
    </svg>
  );
}
