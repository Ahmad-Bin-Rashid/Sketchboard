import React from "react";
import type { LineShape as LineShapeType } from "@/types/whiteboard";

interface LineShapeProps {
  shape: LineShapeType;
}

export function LineShape({ shape }: LineShapeProps) {
  const x1 = shape.x1n * shape.width;
  const y1 = shape.y1n * shape.height;
  const x2 = shape.x2n * shape.width;
  const y2 = shape.y2n * shape.height;

  return (
    <svg className="w-full h-full overflow-visible pointer-events-none">
      {/* Thick invisible click target for selection */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={Math.max(16, shape.strokeWidth)}
        strokeLinecap="round"
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={
          shape.strokeStyle === "dashed"
            ? "6,6"
            : shape.strokeStyle === "dotted"
            ? "2,4"
            : undefined
        }
        strokeLinecap="round"
      />
    </svg>
  );
}
