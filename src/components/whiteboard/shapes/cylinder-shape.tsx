import React from "react";
import type { CylinderShape } from "@/types/whiteboard";

interface CylinderShapeProps {
  shape: CylinderShape;
}

export function CylinderShapeComponent({ shape }: CylinderShapeProps) {
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
      {/* Cylinder body: left wall, bottom curve, right wall, top curve */}
      <path
        d="M 0,15 L 0,85 A 50,15 0 0,0 100,85 L 100,15 A 50,15 0 0,1 0,15 Z"
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dashArray}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Top face ellipse */}
      <ellipse
        cx="50"
        cy="15"
        rx="50"
        ry="15"
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dashArray}
        vectorEffect="non-scaling-stroke"
      />
    </svg>

  );
}
