export type ShapeType = "rectangle" | "ellipse" | "draw" | "text" | "sticky" | "image" | "embed";
export type ToolType = ShapeType | "select";

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  index: string; // Lexical fractional ordering string for z-index layering
}

export interface RectShape extends BaseShape {
  type: "rectangle";
}

export interface EllipseShape extends BaseShape {
  type: "ellipse";
}

export interface DrawShape extends BaseShape {
  type: "draw";
  points: [number, number, number][]; // [x, y, pressure] for perfect-freehand
}

export interface TextShape extends BaseShape {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface StickyShape extends BaseShape {
  type: "sticky";
  text: string;
  fontSize: number;
}

export interface ImageShape extends BaseShape {
  type: "image";
  src: string; // CDN or base64 URL
}

export interface EmbedShape extends BaseShape {
  type: "embed";
  src: string; // Embed source URL (YouTube, Figma, Loom, Google Maps)
}

export type CustomShape =
  | RectShape
  | EllipseShape
  | DrawShape
  | TextShape
  | StickyShape
  | ImageShape
  | EmbedShape;
