"use client";

import React, { useState } from "react";
import {
  Play,
  Film,
  Video,
  Music,
  Layout,
  Code,
  MapPin,
  ArrowLeft,
} from "lucide-react";

const validateUrlByCategory = (url: string, category: string): boolean => {
  try {
    const lower = url.trim().toLowerCase();
    if (!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("<iframe")) {
      return false;
    }
    switch (category) {
      case "youtube":
        return lower.includes("youtube.com") || lower.includes("youtu.be");
      case "vimeo":
        return lower.includes("vimeo.com");
      case "loom":
        return lower.includes("loom.com");
      case "spotify":
        return lower.includes("spotify.com");
      case "figma":
        return lower.includes("figma.com");
      case "codepen":
        return lower.includes("codepen.io");
      case "google-maps":
        return lower.includes("google.com/maps") || (lower.includes("google.co") && lower.includes("/maps")) || lower.startsWith("<iframe");
      default:
        return false;
    }
  } catch {
    return false;
  }
};

const getCategoryDisplayName = (category: string): string => {
  const map: Record<string, string> = {
    "youtube": "YouTube",
    "vimeo": "Vimeo",
    "loom": "Loom",
    "spotify": "Spotify",
    "figma": "Figma",
    "codepen": "CodePen",
    "google-maps": "Google Maps",
  };
  return map[category] || category;
};

interface EmbedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, category: string) => void;
}

export function EmbedDialog({ isOpen, onClose, onInsert }: EmbedDialogProps) {
  const [embedStep, setEmbedStep] = useState<"category" | "url">("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setEmbedUrl("");
    setSelectedCategory(null);
    setEmbedStep("category");
    setValidationError(null);
    onClose();
  };

  const handleInsertEmbed = () => {
    if (!embedUrl.trim() || !selectedCategory) return;

    const isValid = validateUrlByCategory(embedUrl, selectedCategory);
    if (!isValid) {
      setValidationError(`Invalid URL. The link does not match the format for ${getCategoryDisplayName(selectedCategory)}.`);
      return;
    }

    setValidationError(null);
    onInsert(embedUrl.trim(), selectedCategory);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-panel-bg p-6 border border-panel-border shadow-xl backdrop-blur-md flex flex-col gap-4">
        
        {embedStep === "category" ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-foreground">Insert Embeded Media</h2>
              <p className="text-xs text-muted-foreground">Select a media platform/provider below to embed on the canvas.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2">
              {[
                { id: "youtube", name: "YouTube", icon: Play, desc: "Video streaming", color: "text-red-500 bg-red-500/10" },
                { id: "vimeo", name: "Vimeo", icon: Film, desc: "High-quality video", color: "text-blue-400 bg-blue-400/10" },
                { id: "loom", name: "Loom", icon: Video, desc: "Screencasts & recordings", color: "text-purple-500 bg-purple-500/10" },
                { id: "spotify", name: "Spotify", icon: Music, desc: "Music tracks & albums", color: "text-green-500 bg-green-500/10" },
                { id: "figma", name: "Figma", icon: Layout, desc: "Design frames & prototypes", color: "text-orange-500 bg-orange-500/10" },
                { id: "codepen", name: "CodePen", icon: Code, desc: "Front-end code sandboxes", color: "text-sky-500 bg-sky-500/10" },
                { id: "google-maps", name: "Google Maps", icon: MapPin, desc: "Interactive maps", color: "text-emerald-500 bg-emerald-500/10" },
              ].map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setEmbedStep("url");
                    }}
                    className="flex flex-col items-start gap-2 p-3 text-left rounded-xl border border-panel-border hover:border-primary hover:bg-surface-hover transition cursor-pointer group"
                  >
                    <div className={`p-2 rounded-lg ${cat.color} group-hover:scale-105 transition-transform`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{cat.name}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{cat.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEmbedStep("category");
                  setValidationError(null);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-bold text-foreground">
                  Embed {getCategoryDisplayName(selectedCategory || "")}
                </h2>
                <p className="text-[10px] text-muted-foreground">Only secure {getCategoryDisplayName(selectedCategory || "")} links are permitted.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 my-2">
              <label className="text-xs font-medium text-muted-foreground">Paste URL:</label>
              <input
                type="text"
                placeholder={
                  selectedCategory === "youtube" ? "https://www.youtube.com/watch?v=..." :
                  selectedCategory === "vimeo" ? "https://vimeo.com/..." :
                  selectedCategory === "loom" ? "https://www.loom.com/share/..." :
                  selectedCategory === "spotify" ? "https://open.spotify.com/track/..." :
                  selectedCategory === "figma" ? "https://www.figma.com/file/..." :
                  selectedCategory === "codepen" ? "https://codepen.io/..." :
                  "https://www.google.com/maps/..."
                }
                value={embedUrl}
                onChange={(e) => {
                  setEmbedUrl(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInsertEmbed();
                  if (e.key === "Escape") handleClose();
                }}
              />
              {validationError && (
                <span className="text-[11px] text-destructive leading-tight bg-destructive/10 border border-destructive/20 rounded-lg p-2 mt-1">
                  {validationError}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setEmbedStep("category");
                  setValidationError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleInsertEmbed}
                disabled={!embedUrl.trim()}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 rounded-xl transition cursor-pointer"
              >
                Insert
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
