export type ShapeType =
  | "rectangle"
  | "ellipse"
  | "draw"
  | "text"
  | "sticky"
  | "image"
  | "embed"
  | "line"
  | "arrow"
  | "triangle"
  | "diamond"
  | "parallelogram"
  | "hexagon"
  | "octagon"
  | "cylinder"
  | "rounded-rectangle"
  | "speech-bubble"
  | "frame";
export type ToolType = ShapeType | "select" | "hand" | "laser";

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
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  shadow?: boolean;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowColor?: string;
}

export interface RectShape extends BaseShape {
  type: "rectangle";
  borderRadius?: number;
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
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
}

export interface StickyShape extends BaseShape {
  type: "sticky";
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
}

export interface ImageShape extends BaseShape {
  type: "image";
  src: string; // CDN or base64 URL
}

export interface EmbedShape extends BaseShape {
  type: "embed";
  src: string; // Embed source URL (YouTube, Figma, Loom, Google Maps)
}

export interface LineShape extends BaseShape {
  type: "line";
  x1n: number;
  y1n: number;
  x2n: number;
  y2n: number;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  x1n: number;
  y1n: number;
  x2n: number;
  y2n: number;
}

export interface TriangleShape extends BaseShape {
  type: "triangle";
}

export interface DiamondShape extends BaseShape {
  type: "diamond";
}

export interface ParallelogramShape extends BaseShape {
  type: "parallelogram";
}

export interface HexagonShape extends BaseShape {
  type: "hexagon";
}

export interface OctagonShape extends BaseShape {
  type: "octagon";
}

export interface CylinderShape extends BaseShape {
  type: "cylinder";
}

export interface RoundedRectangleShape extends BaseShape {
  type: "rounded-rectangle";
  borderRadius?: number;
}

export interface SpeechBubbleShape extends BaseShape {
  type: "speech-bubble";
}

export interface FrameShape extends BaseShape {
  type: "frame";
  name: string;
}

export type CustomShape =
  | RectShape
  | EllipseShape
  | DrawShape
  | TextShape
  | StickyShape
  | ImageShape
  | EmbedShape
  | LineShape
  | ArrowShape
  | TriangleShape
  | DiamondShape
  | ParallelogramShape
  | HexagonShape
  | OctagonShape
  | CylinderShape
  | RoundedRectangleShape
  | SpeechBubbleShape
  | FrameShape;
