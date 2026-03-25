"use client";

/**
 * GuestNameModal — shown to guests on first board visit.
 *
 * Prompts the user for a display name before joining.
 * The name is saved to localStorage via setGuestName() + markGuestNameSet().
 * Dismissable — if skipped, the random generated name is used.
 *
 * Rendered inside the Whiteboard component (guest mode only).
 * Disappears once submitted or dismissed.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGuestName, markGuestNameSet, getGuestIdentity } from "@/lib/guest";

interface GuestNameModalProps {
  /** Called when name is confirmed (or skipped). Passes the final name. */
  onConfirm: (name: string, color: string) => void;
}

export function GuestNameModal({ onConfirm }: GuestNameModalProps) {
  const identity = getGuestIdentity();
  const [name, setName] = useState(identity.guestName);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Focus input when modal appears
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    const finalName = trimmed || identity.guestName;
    const updated = setGuestName(finalName);
    markGuestNameSet();
    onConfirm(updated.guestName, updated.guestColor);
  }, [name, identity.guestName, identity.guestColor, onConfirm]);

  const handleSkip = useCallback(() => {
    markGuestNameSet();
    onConfirm(identity.guestName, identity.guestColor);
  }, [identity.guestName, identity.guestColor, onConfirm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") handleSkip();
  };

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-[500] flex items-center justify-center",
        "bg-background/60 backdrop-blur-sm transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl",
          "transition-all duration-200",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="Skip"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
          <Pencil className="h-5 w-5 text-primary" />
        </div>

        {/* Text */}
        <h2 className="mb-1 text-base font-semibold">What should we call you?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your name appears on your cursor. No account needed.
        </p>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={identity.guestName}
          maxLength={32}
          className={cn(
            "mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
            "placeholder:text-muted-foreground/50",
            "focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "transition-colors"
          )}
        />

        {/* Color preview */}
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: identity.guestColor }}
          />
          Your cursor color
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Join board
          </button>
        </div>
      </div>
    </div>
  );
}
