import React from "react";
import type { ArrowShape as ArrowShapeType } from "@/types/whiteboard";

interface ArrowShapeProps {
  shape: ArrowShapeType;
}

export function ArrowShape({ shape }: ArrowShapeProps) {
  const x1 = shape.x1n * shape.width;
  const y1 = shape.y1n * shape.height;
  const x2 = shape.x2n * shape.width;
  const y2 = shape.y2n * shape.height;

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headSize = Math.max(10, shape.strokeWidth * 3);

  const arrowX1 = x2 - headSize * Math.cos(angle - Math.PI / 6);
  const arrowY1 = y2 - headSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = x2 - headSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = y2 - headSize * Math.sin(angle + Math.PI / 6);

  const arrowPath = `M ${x2} ${y2} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`;

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
      {/* The main line */}
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
      {/* The arrowhead */}
      <path
        d={arrowPath}
        fill={shape.stroke}
        stroke={shape.stroke}
        strokeWidth={1}
        strokeLinejoin="round"
        className="pointer-events-auto cursor-pointer"
      />
    </svg>
  );
}
