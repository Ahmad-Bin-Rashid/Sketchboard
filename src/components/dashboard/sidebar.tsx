"use client";

/**
 * Sidebar navigation component for the dashboard layout.
 *
 * Features:
 * - App logo
 * - Navigation links with active state
 * - Team selector (Phase 7)
 * - User section with Clerk UserButton
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Settings,
  Star,
  Search,
  ChevronsLeft,
} from "lucide-react";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled = clerkKey && !clerkKey.includes("placeholder");

function UserAvatar() {
  if (!isClerkEnabled) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-white">
        U
      </div>
    );
  }

  // Dynamically require Clerk only when configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { UserButton } = require("@clerk/nextjs");
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: "h-7 w-7",
        },
      }}
    />
  );
}

const NAV_ITEMS = [
  {
    label: "My Boards",
    href: ROUTES.DASHBOARD,
    icon: LayoutGrid,
  },
  {
    label: "Favorites",
    href: `${ROUTES.DASHBOARD}?filter=favorites`,
    icon: Star,
  },
  {
    label: "Settings",
    href: ROUTES.SETTINGS,
    icon: Settings,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-border/50 bg-sidebar-bg text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        <Link
          href={ROUTES.DASHBOARD}
          className="flex items-center gap-2.5"
        >
          {/* Logo mark — sage green dot */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-accent">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm3 2a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H5zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
      </div>

      {/* Search — placeholder */}
      <div className="px-3 pb-2">
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-hover">
          <Search className="h-3.5 w-3.5" />
          <span>Search boards...</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === ROUTES.DASHBOARD
              ? pathname === ROUTES.DASHBOARD
              : pathname.startsWith(item.href.split("?")[0]);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-active text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Team section — Phase 7 placeholder */}
      <div className="border-t border-sidebar-hover/50 px-3 py-3">
        <div className="mb-3 px-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Team
          </p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/60">
            Personal workspace
          </p>
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <UserAvatar />
          <span className="text-sm text-sidebar-foreground/80">Account</span>
        </div>
      </div>
    </aside>
  );
}
