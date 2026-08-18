import React from "react";
import type { RoundedRectangleShape } from "@/types/whiteboard";

interface RoundedRectangleShapeProps {
  shape: RoundedRectangleShape;
}

export function RoundedRectangleShapeComponent({ shape }: RoundedRectangleShapeProps) {
  const dashStyle =
    shape.strokeStyle === "dashed"
      ? "dashed"
      : shape.strokeStyle === "dotted"
      ? "dotted"
      : "solid";

  return (
    <div
      className="w-full h-full pointer-events-none"
      style={{
        border: `${shape.strokeWidth}px ${dashStyle} ${shape.stroke}`,
        backgroundColor: shape.fill,
        borderRadius: `${shape.borderRadius ?? 24}px`,
      }}
    />
  );
}
