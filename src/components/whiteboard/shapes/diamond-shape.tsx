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

  const fill = shape.fill === "transparent" ? "none" : shape.fill;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full pointer-events-none overflow-visible"
    >
      {/* Thick invisible click target for selection */}
      <polygon
        points="50,0 100,50 50,100 0,50"
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible polygon */}
      <polygon
        points="50,0 100,50 50,100 0,50"
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dashArray}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="pointer-events-auto"
      />
    </svg>
  );
}
