import React from "react";
import type { HexagonShape } from "@/types/whiteboard";

interface HexagonShapeProps {
  shape: HexagonShape;
}

export function HexagonShape({ shape }: HexagonShapeProps) {
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
        points="25,0 75,0 100,50 75,100 25,100 0,50"
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible polygon */}
      <polygon
        points="25,0 75,0 100,50 75,100 25,100 0,50"
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
