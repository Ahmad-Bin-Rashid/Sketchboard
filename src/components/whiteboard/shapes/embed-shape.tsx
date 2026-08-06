import React from "react";
import type { EmbedShape as EmbedShapeType } from "@/types/whiteboard";
import { useWhiteboardStore } from "@/store/whiteboard-store";

interface EmbedShapeProps {
  shape: EmbedShapeType;
  onUpdate?: (id: string, updates: Partial<EmbedShapeType>) => void;
  isReadOnly?: boolean;
}

export function EmbedShape({ shape, onUpdate, isReadOnly = false }: EmbedShapeProps) {
  const selectedShapeIds = useWhiteboardStore((s) => s.selectedShapeIds);
  const isSelected = selectedShapeIds.includes(shape.id);

  // Clean and normalize URLs into standard embed URLs
  const getEmbedUrl = (url: string): string => {
    try {
      const cleanUrl = url.trim();
      
      // 1. YouTube
      if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
        let videoId = "";
        if (cleanUrl.includes("youtu.be/")) {
          videoId = cleanUrl.split("youtu.be/")[1].split(/[?#]/)[0];
        } else if (cleanUrl.includes("v=")) {
          videoId = cleanUrl.split("v=")[1].split("&")[0];
        } else if (cleanUrl.includes("embed/")) {
          videoId = cleanUrl.split("embed/")[1].split(/[?#]/)[0];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : cleanUrl;
      }

      // 2. Loom
      if (cleanUrl.includes("loom.com/share/")) {
        const videoId = cleanUrl.split("loom.com/share/")[1].split(/[?#]/)[0];
        return videoId ? `https://www.loom.com/embed/${videoId}` : cleanUrl;
      }

      // 3. Figma
      if (cleanUrl.includes("figma.com/")) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(cleanUrl)}`;
      }

      // 4. Google Maps
      if (cleanUrl.includes("google.com/maps")) {
        if (cleanUrl.includes("iframe")) {
          // Extract src from iframe string if user pasted embed code
          const match = cleanUrl.match(/src="([^"]+)"/);
          if (match && match[1]) return match[1];
        }
        return cleanUrl;
      }

      // 5. Vimeo
      if (cleanUrl.includes("vimeo.com")) {
        const match = cleanUrl.match(/vimeo\.com\/(\d+)/);
        if (match && match[1]) {
          return `https://player.vimeo.com/video/${match[1]}`;
        }
        return cleanUrl;
      }

      // 6. Spotify
      if (cleanUrl.includes("spotify.com")) {
        if (!cleanUrl.includes("/embed")) {
          return cleanUrl.replace("open.spotify.com/", "open.spotify.com/embed/");
        }
        return cleanUrl;
      }

      // 7. CodePen
      if (cleanUrl.includes("codepen.io")) {
        if (cleanUrl.includes("/pen/")) {
          return cleanUrl.replace("/pen/", "/embed/");
        }
        return cleanUrl;
      }

      return cleanUrl;
    } catch {
      return url;
    }
  };

  const embedSrc = getEmbedUrl(shape.src);

  return (
    <div className="w-full h-full relative rounded-lg border border-panel-border overflow-hidden bg-panel-bg shadow-sm">
      {/* Render standard iframe embed */}
      <iframe
        src={embedSrc}
        className="w-full h-full border-none"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Web whiteboard embed"
        style={{ pointerEvents: isSelected && !isReadOnly ? "auto" : "none" }}
      />

      {/* Pointer overlay blocker to allow selecting/dragging the shape when not selected */}
      {(!isSelected || isReadOnly) && (
        <div className="absolute inset-0 bg-transparent z-[10] cursor-grab active:cursor-grabbing" />
      )}
    </div>
  );
}
