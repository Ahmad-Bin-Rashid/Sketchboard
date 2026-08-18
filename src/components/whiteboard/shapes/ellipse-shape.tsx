import React from "react";
import type { EllipseShape as EllipseShapeType } from "@/types/whiteboard";

interface EllipseShapeProps {
  shape: EllipseShapeType;
}

export function EllipseShape({ shape }: EllipseShapeProps) {
  const fill = shape.fill === "transparent" ? "none" : shape.fill;
  const strokeDash =
    shape.strokeStyle === "dashed"
      ? "6,6"
      : shape.strokeStyle === "dotted"
      ? "2,4"
      : undefined;

  const rx = Math.max(0, (shape.width - shape.strokeWidth) / 2);
  const ry = Math.max(0, (shape.height - shape.strokeWidth) / 2);
  const cx = shape.width / 2;
  const cy = shape.height / 2;

  return (
    <svg className="w-full h-full overflow-visible pointer-events-none absolute inset-0">
      {/* Thick invisible click target for selection */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, shape.strokeWidth)}
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible ellipse */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={strokeDash}
        className="pointer-events-auto"
      />
    </svg>
  );
}
