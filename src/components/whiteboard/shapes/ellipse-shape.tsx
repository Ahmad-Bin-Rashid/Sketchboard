import React from "react";
import type { EllipseShape } from "@/types/whiteboard";

interface EllipseShapeProps {
  shape: EllipseShape;
}

export function EllipseShape({ shape }: EllipseShapeProps) {
  return (
    <div
      className="w-full h-full pointer-events-none"
      style={{
        border: `${shape.strokeWidth}px ${shape.strokeStyle || "solid"} ${shape.stroke}`,
        backgroundColor: shape.fill,
        borderRadius: "50%",
      }}
    />
  );
}
