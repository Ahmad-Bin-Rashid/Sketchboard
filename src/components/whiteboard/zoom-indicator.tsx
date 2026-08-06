"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronUp, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import { cn } from "@/lib/utils";

interface ZoomIndicatorProps {
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

export function ZoomIndicator({ viewportRef }: ZoomIndicatorProps) {
  const { zoom, setZoom, pan, setPan, shapes } = useWhiteboardStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const centerOnShapes = (targetZoom: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const vx = rect.width / 2;
    const vy = rect.height / 2;

    const shapesList = Object.values(shapes);
    if (shapesList.length === 0) {
      setZoom(targetZoom);
      setPan({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapesList.forEach((shape) => {
      if (shape.x < minX) minX = shape.x;
      if (shape.y < minY) minY = shape.y;
      if (shape.x + shape.width > maxX) maxX = shape.x + shape.width;
      if (shape.y + shape.height > maxY) maxY = shape.y + shape.height;
    });

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const cx = minX + w / 2;
    const cy = minY + h / 2;

    const newPanX = vx - cx * targetZoom;
    const newPanY = vy - cy * targetZoom;

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomToFit = () => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const shapesList = Object.values(shapes);
    if (shapesList.length === 0) {
      centerOnShapes(1);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapesList.forEach((shape) => {
      if (shape.x < minX) minX = shape.x;
      if (shape.y < minY) minY = shape.y;
      if (shape.x + shape.width > maxX) maxX = shape.x + shape.width;
      if (shape.y + shape.height > maxY) maxY = shape.y + shape.height;
    });

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;

    const padding = 64;
    const targetWidth = Math.max(100, rect.width - padding * 2);
    const targetHeight = Math.max(100, rect.height - padding * 2);

    const fitZoom = Math.min(targetWidth / w, targetHeight / h);
    const clampedZoom = Math.max(0.1, Math.min(2, fitZoom));

    centerOnShapes(clampedZoom);
    setIsOpen(false);
  };

  const handleZoomIn = () => {
    const nextZoom = zoom * 1.1;
    const clampedZoom = Math.max(0.1, Math.min(20, nextZoom));
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const vx = rect.width / 2;
      const vy = rect.height / 2;
      const newPanX = vx - (vx - pan.x) * (clampedZoom / zoom);
      const newPanY = vy - (vy - pan.y) * (clampedZoom / zoom);
      setZoom(clampedZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setZoom(clampedZoom);
    }
  };

  const handleZoomOut = () => {
    const nextZoom = zoom / 1.1;
    const clampedZoom = Math.max(0.1, Math.min(20, nextZoom));
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const vx = rect.width / 2;
      const vy = rect.height / 2;
      const newPanX = vx - (vx - pan.x) * (clampedZoom / zoom);
      const newPanY = vy - (vy - pan.y) * (clampedZoom / zoom);
      setZoom(clampedZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setZoom(clampedZoom);
    }
  };

  const handleSetPreset = (preset: number) => {
    centerOnShapes(preset);
    setIsOpen(false);
  };

  const roundedPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center select-none"
    >
      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-40 flex flex-col gap-1 rounded-xl bg-panel-bg p-2 shadow-lg border border-panel-border backdrop-blur-md animate-fade-in z-[300]"
          style={{ border: "1px solid var(--panel-border)" }}
        >
          <button
            onClick={handleZoomIn}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
            Zoom In
          </button>
          <button
            onClick={handleZoomOut}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
            Zoom Out
          </button>
          <button
            onClick={handleZoomToFit}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <Maximize className="h-3.5 w-3.5 text-muted-foreground" />
            Zoom to Fit
          </button>
          <div className="h-px bg-panel-border my-1" />
          <button
            onClick={() => handleSetPreset(0.5)}
            className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            50%
          </button>
          <button
            onClick={() => handleSetPreset(1)}
            className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            100%
          </button>
          <button
            onClick={() => handleSetPreset(2)}
            className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            200%
          </button>
        </div>
      )}

      {/* Main Pill Button */}
      <div
        className="flex items-center gap-0.5 rounded-xl bg-panel-bg shadow-sm border border-panel-border backdrop-blur-md overflow-hidden"
        style={{ border: "1px solid var(--panel-border)" }}
      >
        <button
          onClick={() => centerOnShapes(1)}
          className="px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors min-w-[50px] text-center cursor-pointer"
          title="Reset Zoom to 100%"
        >
          {roundedPercent}%
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border-l border-panel-border cursor-pointer"
        >
          <ChevronUp className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </div>
    </div>
  );
}
