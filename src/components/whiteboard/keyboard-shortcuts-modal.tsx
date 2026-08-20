"use client";

import React, { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  action: string;
  keys: string[];
}

const SHORTCUTS: ShortcutRow[] = [
  { action: "Select", keys: ["S"] },
  { action: "Pencil", keys: ["D"] },
  { action: "Rectangle", keys: ["R"] },
  { action: "Ellipse", keys: ["O"] },
  { action: "Text", keys: ["T"] },
  { action: "Sticky Note", keys: ["N"] },
  { action: "Hand", keys: ["H"] },
  { action: "Eraser", keys: ["E"] },
  { action: "Arrow", keys: ["A"] },
  { action: "Frame", keys: ["F"] },
  { action: "Undo", keys: ["Ctrl", "Z"] },
  { action: "Redo", keys: ["Ctrl", "Shift", "Z"] },
  { action: "Duplicate", keys: ["Ctrl", "D"] },
  { action: "Delete", keys: ["Del", "Backspace"] },
  { action: "Select All", keys: ["Ctrl", "A"] },
  { action: "Copy", keys: ["Ctrl", "C"] },
  { action: "Paste", keys: ["Ctrl", "V"] },
  { action: "Fit to Screen", keys: ["Ctrl", "Shift", "H"] },
  { action: "Zoom In", keys: ["Ctrl", "Shift", "="] },
  { action: "Zoom Out", keys: ["Ctrl", "Shift", "-"] },
  { action: "Escape", keys: ["Deselect / Cancel"] },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside modal content
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-500 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-2xl bg-panel-bg p-6 border border-panel-border shadow-2xl backdrop-blur-md flex flex-col gap-4 max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-light text-primary">
              <Keyboard className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-bold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted-foreground">
                Speed up your workflow with canvas controls.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable table container */}
        <div className="overflow-y-auto max-h-[60vh] pr-1.5 custom-scrollbar border border-panel-border rounded-xl bg-surface/30">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-panel-border bg-surface/50 text-[10px] uppercase font-semibold text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5 text-right">Shortcut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border/40">
              {SHORTCUTS.map((shortcut, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-surface-hover/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {shortcut.action}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 justify-end flex-wrap">
                      {shortcut.keys.map((key, keyIdx) => {
                        // Check if key is a standalone note or modifier
                        const isDeselect = key.includes("/");
                        if (isDeselect) {
                          return (
                            <span
                              key={keyIdx}
                              className="text-[10px] text-muted-foreground font-normal italic"
                            >
                              {key}
                            </span>
                          );
                        }

                        // Determine separator (or display individual keycaps)
                        if (key === "Del" || key === "Backspace") {
                          return (
                            <React.Fragment key={keyIdx}>
                              <kbd className="inline-block px-1.5 py-0.5 rounded border border-panel-border bg-surface shadow-sm font-sans font-semibold text-[10px] text-foreground">
                                {key}
                              </kbd>
                              {keyIdx === 0 && (
                                <span className="text-[10px] text-muted-foreground px-0.5">
                                  /
                                </span>
                              )}
                            </React.Fragment>
                          );
                        }

                        return (
                          <React.Fragment key={keyIdx}>
                            <kbd className="inline-block px-1.5 py-0.5 rounded border border-panel-border bg-surface shadow-sm font-sans font-semibold text-[10px] text-foreground">
                              {key}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-[10px] text-muted-foreground/60">
                                +
                              </span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
