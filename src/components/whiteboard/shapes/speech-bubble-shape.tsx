import React from "react";
import type { SpeechBubbleShape } from "@/types/whiteboard";

interface SpeechBubbleShapeProps {
  shape: SpeechBubbleShape;
}

export function SpeechBubbleShapeComponent({ shape }: SpeechBubbleShapeProps) {
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
      <path
        d="M 15,0 L 85,0 A 15,15 0 0,1 100,15 L 100,65 A 15,15 0 0,1 85,80 L 35,80 L 15,100 L 20,80 L 15,80 A 15,15 0 0,1 0,65 L 0,15 A 15,15 0 0,1 15,0 Z"
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeDasharray={dashArray}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
