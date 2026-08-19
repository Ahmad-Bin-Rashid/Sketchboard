import React from "react";
import type { RoundedRectangleShape as RoundedRectangleShapeType } from "@/types/whiteboard";

interface RoundedRectangleShapeProps {
  shape: RoundedRectangleShapeType;
}

export function RoundedRectangleShapeComponent({ shape }: RoundedRectangleShapeProps) {
  const fill = shape.fill === "transparent" ? "none" : shape.fill;
  const strokeDash =
    shape.strokeStyle === "dashed"
      ? "6,6"
      : shape.strokeStyle === "dotted"
      ? "2,4"
      : undefined;

  const r = shape.borderRadius ?? 24;

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
        rx={r}
        ry={r}
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible rounded rect */}
      <rect
        x={shape.strokeWidth / 2}
        y={shape.strokeWidth / 2}
        width={Math.max(0, shape.width - shape.strokeWidth)}
        height={Math.max(0, shape.height - shape.strokeWidth)}
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={strokeDash}
        rx={r}
        ry={r}
        className="pointer-events-auto"
      />
    </svg>
  );
}
