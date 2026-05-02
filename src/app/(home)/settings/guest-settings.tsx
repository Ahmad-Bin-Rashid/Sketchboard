"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { getGuestIdentity, setGuestName } from "@/lib/guest";
import { LogIn, UserPlus } from "lucide-react";

export function GuestSettings() {
  const [mounted, setMounted] = useState(false);
  const [guestName, setGuestNameState] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    const identity = getGuestIdentity();
    setGuestNameState(identity.guestName);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed) return;

    setGuestName(trimmed);
    setSuccessMsg("Username updated successfully!");
    
    // Dispatch event to notify the Sidebar to update
    window.dispatchEvent(new Event("guest-name-updated"));

    setTimeout(() => {
      setSuccessMsg("");
    }, 3000);
  };

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Guest Profile
        </h2>
        <div className="rounded-2xl border border-card-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="guest-username" className="block text-sm font-medium text-foreground mb-1.5">
                Username
              </label>
              <input
                id="guest-username"
                type="text"
                value={guestName}
                onChange={(e) => setGuestNameState(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter guest username"
              />
            </div>
            
            {successMsg && (
              <p className="text-xs text-primary font-medium">{successMsg}</p>
            )}

            <button
              type="submit"
              disabled={!mounted || !guestName.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Save Username
            </button>
          </form>
        </div>
      </section>

      {/* Cloud Upgrade Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Go Collaborative
        </h2>
        <div className="rounded-2xl border border-card-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Save your boards in the cloud</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Guests boards are saved in local browser storage only. Sign up for a free account to back them up to the cloud and collaborate with others in real time!
            </p>
          </div>
          
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href={ROUTES.SIGN_IN}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </Link>
            <Link
              href={ROUTES.SIGN_UP}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
