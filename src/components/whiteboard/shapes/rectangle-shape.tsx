import React from "react";
import type { RectShape } from "@/types/whiteboard";

interface RectangleShapeProps {
  shape: RectShape;
}

export function RectangleShape({ shape }: RectangleShapeProps) {
  return (
    <div
      className="w-full h-full pointer-events-none"
      style={{
        border: `${shape.strokeWidth}px solid ${shape.stroke}`,
        backgroundColor: shape.fill,
        borderRadius: "4px",
      }}
    />
  );
}
