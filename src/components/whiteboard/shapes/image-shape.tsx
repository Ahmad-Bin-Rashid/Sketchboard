import React from "react";
import type { ImageShape } from "@/types/whiteboard";

interface ImageShapeProps {
  shape: ImageShape;
}

export function ImageShape({ shape }: ImageShapeProps) {
  return (
    <div
      className="w-full h-full overflow-hidden pointer-events-auto"
      style={{
        border: `${shape.strokeWidth}px solid ${shape.stroke}`,
        borderRadius: "4px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shape.src}
        alt="Uploaded shape asset"
        className="w-full h-full object-cover select-none"
        draggable={false}
      />
    </div>
  );
}
