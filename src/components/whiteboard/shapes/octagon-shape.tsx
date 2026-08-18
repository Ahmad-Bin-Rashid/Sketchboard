import React from "react";
import type { OctagonShape } from "@/types/whiteboard";

interface OctagonShapeProps {
  shape: OctagonShape;
}

export function OctagonShape({ shape }: OctagonShapeProps) {
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
        points="30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30"
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
