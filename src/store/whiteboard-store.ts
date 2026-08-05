import { create } from "zustand";
import type { CustomShape, ToolType } from "@/types/whiteboard";

export interface WhiteboardState {
  // Viewport navigation
  pan: { x: number; y: number };
  zoom: number;

  // Active drawing/selection tools & selections
  activeTool: ToolType;
  selectedShapeIds: string[];

  // Local synced mirror of Yjs shapes Map
  shapes: Record<string, CustomShape>;

  // Temporary local drawing/drag states (not synced to Yjs during creation)
  draftShape: CustomShape | null;
  rubberBandRect: { x: number; y: number; width: number; height: number } | null;

  // Viewport Actions
  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;

  // Tool & Selection Actions
  setActiveTool: (tool: ToolType) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;

  // Shapes Sync Actions
  setShapes: (shapes: Record<string, CustomShape>) => void;
  upsertShape: (shape: CustomShape) => void;
  deleteShape: (id: string) => void;

  // Transient Actions
  setDraftShape: (shape: CustomShape | null) => void;
  setRubberBandRect: (
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  pan: { x: 0, y: 0 },
  zoom: 1,
  activeTool: "select",
  selectedShapeIds: [],
  shapes: {},
  draftShape: null,
  rubberBandRect: null,

  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setSelectedShapeIds: (selectedShapeIds) => set({ selectedShapeIds }),
  addToSelection: (id) =>
    set((state) => {
      const selected = new Set(state.selectedShapeIds);
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      return { selectedShapeIds: Array.from(selected) };
    }),
  clearSelection: () => set({ selectedShapeIds: [] }),
  setShapes: (shapes) => set({ shapes }),
  upsertShape: (shape) =>
    set((state) => ({
      shapes: { ...state.shapes, [shape.id]: shape },
    })),
  deleteShape: (id) =>
    set((state) => {
      const nextShapes = { ...state.shapes };
      delete nextShapes[id];
      const nextSelection = state.selectedShapeIds.filter((selId) => selId !== id);
      return { shapes: nextShapes, selectedShapeIds: nextSelection };
    }),
  setDraftShape: (draftShape) => set({ draftShape }),
  setRubberBandRect: (rubberBandRect) => set({ rubberBandRect }),
}));
