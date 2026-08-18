import React, { useMemo } from "react";
import getStroke from "perfect-freehand";
import type { DrawShape as DrawShapeType } from "@/types/whiteboard";

interface DrawShapeProps {
  shape: DrawShapeType;
}

export function DrawShape({ shape }: DrawShapeProps) {
  // Translate the absolute canvas points into points relative to the shape's bounding box
  const relativePoints = useMemo(() => {
    return shape.points.map(([px, py, pr]) => [
      px - shape.x,
      py - shape.y,
      pr,
    ] as [number, number, number]);
  }, [shape.points, shape.x, shape.y]);

  const stroke = useMemo(() => {
    return getStroke(relativePoints, {
      size: shape.strokeWidth * 1.5,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
  }, [relativePoints, shape.strokeWidth]);

  const pathData = useMemo(() => {
    if (!stroke.length) return "";
    const d = stroke.reduce((acc, [x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      return `${acc} L ${x} ${y}`;
    }, "");
    return `${d} Z`;
  }, [stroke]);

  const isCustomStroke = shape.strokeStyle && shape.strokeStyle !== "solid";

  const linePathData = useMemo(() => {
    if (!relativePoints.length) return "";
    return relativePoints.reduce((acc, [x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      return `${acc} L ${x} ${y}`;
    }, "");
  }, [relativePoints]);

  if (isCustomStroke) {
    let strokeDasharray = "none";
    if (shape.strokeStyle === "dashed") {
      strokeDasharray = `${shape.strokeWidth * 3} ${shape.strokeWidth * 2}`;
    } else if (shape.strokeStyle === "dotted") {
      strokeDasharray = `${shape.strokeWidth} ${shape.strokeWidth * 2}`;
    }

    return (
      <svg className="w-full h-full overflow-visible pointer-events-none absolute inset-0">
        {/* Thick invisible click target for selection */}
        <path
          d={linePathData}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(16, shape.strokeWidth)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-auto cursor-pointer"
        />
        {/* Visible line */}
        <path
          d={linePathData}
          fill="none"
          stroke={shape.stroke || "#000"}
          strokeWidth={shape.strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className="w-full h-full overflow-visible pointer-events-none absolute inset-0">
      {/* Thick invisible click target for selection */}
      <path
        d={linePathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, shape.strokeWidth)}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-auto cursor-pointer"
      />
      {/* Visible brush shape */}
      <path
        d={pathData}
        fill={shape.stroke || "#000"}
        stroke={shape.stroke || "#000"}
        strokeWidth={1}
        className="pointer-events-auto"
      />
    </svg>
  );
}
