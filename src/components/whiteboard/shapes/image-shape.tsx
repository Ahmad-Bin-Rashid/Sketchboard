import React, { useRef, useEffect, useState } from "react";
import type { ImageShape as ImageShapeType } from "@/types/whiteboard";
import { useWhiteboardStore } from "@/store/whiteboard-store";

interface ImageShapeProps {
  shape: ImageShapeType;
  isReadOnly?: boolean;
}

export function ImageShape({ shape, isReadOnly = false }: ImageShapeProps) {
  const selectedShapeIds = useWhiteboardStore((s) => s.selectedShapeIds);
  const isSelected = selectedShapeIds.includes(shape.id);

  const isVideo =
    shape.mimeType?.startsWith("video/") ||
    shape.src.endsWith(".mp4") ||
    shape.src.endsWith(".webm") ||
    shape.src.endsWith(".ogg") ||
    shape.src.includes("video");

  const [resolvedSrc, setResolvedSrc] = useState<string>("");

  useEffect(() => {
    if (shape.src.startsWith("local://")) {
      const localId = shape.src.replace("local://", "");
      const localData = localStorage.getItem(`sketchboard-local-media-data-${localId}`) ?? "";
      setResolvedSrc(localData);
    } else {
      setResolvedSrc(shape.src);
    }
  }, [shape.src]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isSelected && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isSelected]);

  const cropStyle = shape.crop
    ? {
        clipPath: `inset(${shape.crop.top}% ${shape.crop.right}% ${shape.crop.bottom}% ${shape.crop.left}%)`,
      }
    : {};

  return (
    <div
      className="w-full h-full overflow-hidden pointer-events-auto relative"
      style={{
        border: `${shape.strokeWidth}px solid ${shape.stroke}`,
        borderRadius: "4px",
        ...cropStyle,
      }}
    >
      {!resolvedSrc ? (
        <div className="w-full h-full bg-surface flex items-center justify-center text-muted-foreground text-xs select-none">
          Loading...
        </div>
      ) : isVideo ? (
        <video
          ref={videoRef}
          src={resolvedSrc.startsWith("data:") ? resolvedSrc : `${resolvedSrc}#t=0.001`}
          className="w-full h-full object-cover select-none"
          controls={isSelected}
          preload="metadata"
          playsInline
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolvedSrc}
          alt="Uploaded shape asset"
          className="w-full h-full object-cover select-none"
          draggable={false}
        />
      )}

      {(!isSelected || isReadOnly) && (
        <div className="absolute inset-0 bg-transparent z-10 cursor-grab active:cursor-grabbing" />
      )}
    </div>
  );
}
