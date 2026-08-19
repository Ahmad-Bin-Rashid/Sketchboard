"use client";

import React, { useMemo } from "react";
import * as Y from "yjs";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { useWhiteboardStore } from "@/store/whiteboard-store";
import type { CustomShape } from "@/types/whiteboard";
import { cn } from "@/lib/utils";
import { arrangeShapes, saveShape } from "@/lib/board-actions";
import { PRESET_COLORS, FONT_FAMILIES, SHAPE_DEFAULTS } from "@/lib/constants";


interface StylePanelProps {
  shapesMap: Y.Map<CustomShape> | null;
  boardId: string;
}

export function StylePanel({ shapesMap, boardId }: StylePanelProps) {
  const { selectedShapeIds, shapes, setSelectedShapeIds } = useWhiteboardStore();

  // Baseline selection
  const selectedShapes = useMemo(() => {
    return selectedShapeIds
      .map((id) => shapes[id])
      .filter((s): s is CustomShape => !!s);
  }, [selectedShapeIds, shapes]);

  if (selectedShapes.length === 0) return null;

  // If multiple are selected, we edit all of them. We use the first selected shape as the UI state baseline.
  const baseline = selectedShapes[0];

  const updateSelectedShapesStyle = (updates: Partial<CustomShape> | ((shape: CustomShape) => Partial<CustomShape>)) => {
    if (selectedShapeIds.length === 0) return;

    selectedShapeIds.forEach((id) => {
      const current = shapes[id];
      if (current) {
        const calculatedUpdates = typeof updates === "function" ? updates(current) : updates;
        const updated = {
          ...current,
          ...calculatedUpdates,
        } as CustomShape;
        saveShape(shapesMap, boardId, updated);
      }
    });
  };


  const isTextOrSticky = selectedShapes.some(s => s.type === "text" || s.type === "sticky");
  const isRectOrRoundedRect = selectedShapes.some(s => s.type === "rectangle" || s.type === "rounded-rectangle");
  const isFrame = selectedShapes.some(s => s.type === "frame");
  const isMedia = selectedShapes.some(s => s.type === "image");

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-200 w-60 max-h-[85vh] overflow-y-auto select-none rounded-2xl bg-panel-bg p-4 shadow-xl border border-panel-border backdrop-blur-md flex flex-col gap-4 animate-fade-in custom-scrollbar"
      style={{ pointerEvents: "auto" }}
    >
        
      {/* ─── SECTION: Color & Fill ─── */}
      {!isFrame && !isMedia && (
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center justify-between w-full text-[11px] text-foreground uppercase py-0.5"
        >
          <span>Color</span>
        </button>

        
          <div className="flex flex-col gap-3">
            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_COLORS.map((color) => {
                const isCurrentStroke = baseline.stroke === color;
                return (
                  <button
                    key={color}
                    onClick={() => updateSelectedShapesStyle({ stroke: color })}
                    className={cn(
                      "h-5 w-5 mx-auto rounded-lg border border-panel-border transition hover:scale-105",
                      isCurrentStroke && "ring-2 ring-primary ring-offset-1 ring-offset-panel-bg"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                );
              })}
            </div>

            {/* Hex Picker Input */}
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 rounded-lg border border-panel-border overflow-hidden cursor-pointer shrink-0">
                <input
                  type="color"
                  value={baseline.stroke.startsWith("#") ? baseline.stroke : SHAPE_DEFAULTS.STROKE}
                  onChange={(e) => updateSelectedShapesStyle({ stroke: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                />
                <div
                  className="h-full w-full"
                  style={{ backgroundColor: baseline.stroke.startsWith("#") ? baseline.stroke : SHAPE_DEFAULTS.STROKE }}
                />
              </div>
              <input
                type="text"
                value={baseline.stroke}
                onChange={(e) => updateSelectedShapesStyle({ stroke: e.target.value })}
                className="h-7 flex-1 pl-2 text-xs bg-background border border-panel-border rounded-md outline-none focus:border-primary text-foreground font-mono"
                placeholder="#hex"
              />
            </div>

            {/* Fill Presets */}
            {baseline.type !== "draw" && baseline.type !== "image" && baseline.type !== "embed" && baseline.type !== "line" && baseline.type !== "arrow" && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] text-foreground uppercase">Fill Mode</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateSelectedShapesStyle({ fill: "transparent" })}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-md border border-panel-border bg-background hover:bg-surface-hover transition relative overflow-hidden",
                      baseline.fill === "transparent" && "border-primary text-primary"
                    )}
                  >
                    None
                    <div className="absolute inset-0 border-t border-destructive/40 rotate-12 pointer-events-none" />
                  </button>
                  <button
                    onClick={() => updateSelectedShapesStyle({ fill: baseline.stroke })}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-md border border-panel-border bg-background hover:bg-surface-hover transition",
                      baseline.fill === baseline.stroke && baseline.fill !== "transparent" && "border-primary text-primary"
                    )}
                  >
                    Solid
                  </button>
                </div>
              </div>
            )}
          </div>
        {/* )} */}
      </div>
      )}

      {/* ─── SECTION: Line & Stroke style ─── */}
      {!isTextOrSticky && !isFrame && !isMedia && (
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center justify-between w-full text-[11px] text-foreground uppercase"
        >
          <span>Line Style</span>
        </button>
          <div className="flex flex-col gap-2.5">
            {/* Width */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 h-7">
                {[
                  { label: "S", value: 1 },
                  { label: "M", value: 2 },
                  { label: "L", value: 4 },
                  { label: "XL", value: 8 },
                ].map((sz) => (
                  <button
                    key={sz.label}
                    onClick={() => updateSelectedShapesStyle({ strokeWidth: sz.value })}
                    className={cn(
                      "flex-1 h-full rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground",
                      baseline.strokeWidth === sz.value && "bg-primary text-primary-foreground border-primary hover:bg-primary-hover"
                    )}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dash Style */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 h-7">
                {[
                  { label: "Solid", value: "solid" },
                  { label: "Dashed", value: "dashed" },
                  { label: "Dotted", value: "dotted" },
                ].map((st) => (
                  <button
                    key={st.value}
                    onClick={() => updateSelectedShapesStyle({ strokeStyle: st.value as any })}
                    className={cn(
                      "flex-1 h-full rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground",
                      (baseline.strokeStyle || "solid") === st.value && "bg-primary text-primary-foreground border-primary hover:bg-primary-hover"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
      </div>
      )}

      {/* Opacity */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-foreground uppercase">
          <span>Opacity</span>
          <span>{Math.round((baseline.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={baseline.opacity ?? 1}
          onChange={(e) => updateSelectedShapesStyle({ opacity: parseFloat(e.target.value) })}
          className="w-full h-1 bg-muted rounded-md appearance-none cursor-pointer accent-primary"
        />
      </div>

      {/* ─── SECTION: Typography (Text/Sticky only) ─── */}
      {isTextOrSticky && !isFrame && !isMedia && (
        <div className="flex flex-col gap-2">
          <button
            className="flex items-center justify-between w-full text-[11px] text-foreground uppercase"
          >
            <span>Typography</span>
          </button>

            <div className="flex flex-col gap-2.5">
              {/* Font Family */}
              <div className="flex flex-col gap-1">
                <select
                  value={
                    (baseline as any).fontFamily || SHAPE_DEFAULTS.FONT_FAMILY
                  }
                  onChange={(e) => updateSelectedShapesStyle({ fontFamily: e.target.value })}
                  className="h-8 w-full px-2 text-xs bg-background border border-panel-border rounded-md outline-none focus:border-primary text-foreground font-semibold"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 h-7">
                  {[
                    { label: "S", value: 14 },
                    { label: "M", value: 20 },
                    { label: "L", value: 28 },
                    { label: "XL", value: 36 },
                  ].map((sz) => {
                    const currentSize = (baseline as any).fontSize ?? SHAPE_DEFAULTS.FONT_SIZE;
                    return (
                      <button
                        key={sz.label}
                        onClick={() => updateSelectedShapesStyle({ fontSize: sz.value })}
                        className={cn(
                          "flex-1 h-full rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground",
                          currentSize === sz.value && "bg-primary text-primary-foreground border-primary hover:bg-primary-hover"
                        )}
                      >
                        {sz.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Styles and Alignment */}
              <div className="flex gap-2">
                {/* Style toggles */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-0.5 h-7">
                    <button
                      onClick={() =>
                        updateSelectedShapesStyle((s: any) => ({
                          fontWeight: s.fontWeight === "bold" ? "normal" : "bold",
                        }))
                      }
                      className={cn(
                        "flex-1 h-full rounded-md border border-panel-border bg-background hover:bg-surface-hover flex items-center justify-center transition text-foreground",
                        (baseline as any).fontWeight === "bold" && "bg-primary text-primary-foreground border-primary"
                      )}
                    >
                      <Bold className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() =>
                        updateSelectedShapesStyle((s: any) => ({
                          fontStyle: s.fontStyle === "italic" ? "normal" : "italic",
                        }))
                      }
                      className={cn(
                        "flex-1 h-full rounded-md border border-panel-border bg-background hover:bg-surface-hover flex items-center justify-center transition text-foreground",
                        (baseline as any).fontStyle === "italic" && "bg-primary text-primary-foreground border-primary"
                      )}
                    >
                      <Italic className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() =>
                        updateSelectedShapesStyle((s: any) => ({
                          textDecoration: s.textDecoration === "underline" ? "none" : "underline",
                        }))
                      }
                      className={cn(
                        "flex-1 h-full rounded-md border border-panel-border bg-background hover:bg-surface-hover flex items-center justify-center transition text-foreground",
                        (baseline as any).textDecoration === "underline" && "bg-primary text-primary-foreground border-primary"
                      )}
                    >
                      <Underline className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Alignment */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-0.5 h-7">
                    {[
                      { align: "left", icon: AlignLeft },
                      { align: "center", icon: AlignCenter },
                      { align: "right", icon: AlignRight },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      const currentAlign = (baseline as any).textAlign || (baseline.type === "sticky" ? "center" : "left");
                      return (
                        <button
                          key={btn.align}
                          onClick={() => updateSelectedShapesStyle({ textAlign: btn.align as any })}
                          className={cn(
                            "flex-1 h-full rounded-md border border-panel-border bg-background hover:bg-surface-hover flex items-center justify-center transition text-foreground",
                            currentAlign === btn.align && "bg-primary text-primary-foreground border-primary"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* ─── SECTION: Rectangle Options ─── */}
      {isRectOrRoundedRect && (
        <div className="flex flex-col gap-2">
          
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-foreground uppercase">
                <span>Corner Radius</span>
                <span>{(baseline as any).borderRadius ?? SHAPE_DEFAULTS.BORDER_RADIUS}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                step="2"
                value={(baseline as any).borderRadius ?? SHAPE_DEFAULTS.BORDER_RADIUS}
                onChange={(e) => updateSelectedShapesStyle({ borderRadius: parseInt(e.target.value) })}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          {/* )} */}
        </div>
      )}

      {/* ─── SECTION: Effects ─── */}
      <div className="flex flex-col gap-2">
        
          <div className="flex flex-col gap-3">
            {/* Shadow Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground uppercase">Drop Shadow</span>
              <button
                onClick={() => updateSelectedShapesStyle({ shadow: !baseline.shadow })}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  baseline.shadow ? "bg-primary" : "bg-panel-border"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    baseline.shadow ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Shadow Configurations */}
            {baseline.shadow && (
              <div className="flex flex-col gap-2.5">
                {/* Blur */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase">
                    <span>Blur</span>
                    <span>{baseline.shadowBlur ?? SHAPE_DEFAULTS.SHADOW_BLUR}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={baseline.shadowBlur ?? SHAPE_DEFAULTS.SHADOW_BLUR}
                    onChange={(e) => updateSelectedShapesStyle({ shadowBlur: parseInt(e.target.value) })}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Spread/Offset */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase">
                    <span>Spread / Offset</span>
                    <span>{baseline.shadowSpread ?? SHAPE_DEFAULTS.SHADOW_SPREAD}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={baseline.shadowSpread ?? SHAPE_DEFAULTS.SHADOW_SPREAD}
                    onChange={(e) => updateSelectedShapesStyle({ shadowSpread: parseInt(e.target.value) })}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            )}
          </div>
      </div>

      {/* ─── SECTION: Media Options ─── */}
      {isMedia && (
        <div className="flex flex-col gap-3">
          {/* <div className="text-[11px] text-foreground uppercase border-b border-panel-border pb-1">
            <span>Media Options</span>
          </div> */}

          {/* Lock Aspect Ratio */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground uppercase">Lock Aspect Ratio</span>
            <button
              onClick={() =>
                updateSelectedShapesStyle({
                  keepRatio: !(baseline as any).keepRatio,
                })
              }
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                (baseline as any).keepRatio ? "bg-primary" : "bg-panel-border"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  (baseline as any).keepRatio ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Crop Control */}
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between text-[11px] text-foreground uppercase">
              <span>Crop Media</span>
              <button
                onClick={() =>
                  updateSelectedShapesStyle({
                    crop: { top: 0, right: 0, bottom: 0, left: 0 },
                  })
                }
                className="text-[9px] font-bold text-primary hover:underline uppercase cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Crop Sliders */}
            {(["top", "bottom", "left", "right"] as const).map((dir) => {
              const currentCrop = (baseline as any).crop?.[dir] ?? 0;
              return (
                <div key={dir} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase">
                    <span>{dir}</span>
                    <span>{currentCrop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={currentCrop}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateSelectedShapesStyle((s: any) => ({
                        crop: {
                          top: s.crop?.top ?? 0,
                          right: s.crop?.right ?? 0,
                          bottom: s.crop?.bottom ?? 0,
                          left: s.crop?.left ?? 0,
                          [dir]: val,
                        },
                      }));
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SECTION: Layering & Arrange ─── */}
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center justify-between w-full text-[11px] text-foreground uppercase py-0.5"
        >
          <span>Layering</span>
        </button>

        
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => arrangeShapes(selectedShapeIds, "forward", shapesMap, boardId)}
              className="py-1 px-2.5 rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground flex items-center justify-center gap-1.5"
            >
              Forward
            </button>
            <button
              onClick={() => arrangeShapes(selectedShapeIds, "backward", shapesMap, boardId)}
              className="py-1 px-2.5 rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground flex items-center justify-center gap-1.5"
            >
              Backward
            </button>
            <button
              onClick={() => arrangeShapes(selectedShapeIds, "front", shapesMap, boardId)}
              className="py-1 px-2.5 rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground flex items-center justify-center gap-1.5"
            >
              Front
            </button>
            <button
              onClick={() => arrangeShapes(selectedShapeIds, "back", shapesMap, boardId)}
              className="py-1 px-2.5 rounded-md text-[10px] font-bold border border-panel-border bg-background hover:bg-surface-hover transition text-foreground flex items-center justify-center gap-1.5"
            >
              Back
            </button>
          </div>
      </div>
    </div>
  );
}
