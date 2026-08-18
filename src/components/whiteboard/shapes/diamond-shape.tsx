import React from "react";
import type { DiamondShape } from "@/types/whiteboard";

interface DiamondShapeProps {
  shape: DiamondShape;
}

export function DiamondShape({ shape }: DiamondShapeProps) {
  const dashArray =
    shape.strokeStyle === "dashed"
      ? "6 6"
      : shape.strokeStyle === "dotted"
      ? "2 4"
      : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full pointer-events-none overflow-visible"
    >
      <polygon
        points="50,0 100,50 50,100 0,50"
        fill={shape.fill === "transparent" ? "none" : shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dashArray}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
