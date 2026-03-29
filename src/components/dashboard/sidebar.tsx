"use client";

/**
 * Sidebar — left navigation panel for the dashboard.
 *
 * Features:
 * - App logo + branding
 * - Navigation links with active state (All Boards / Favorites / Recent)
 * - Team workspace section showing current team name
 * - User account section with Clerk UserButton
 *
 * Props:
 * - teamName: from the server component (personal team name or selected team)
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Settings,
  Star,
  Clock,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  teamName?: string;
  userEmail?: string;
}

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    id: "all",
    label: "My Boards",
    icon: LayoutGrid,
    href: ROUTES.DASHBOARD,
    filter: null,
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: Star,
    href: `${ROUTES.DASHBOARD}?filter=favorites`,
    filter: "favorites",
  },
  {
    id: "recent",
    label: "Recent",
    icon: Clock,
    href: `${ROUTES.DASHBOARD}?filter=recent`,
    filter: "recent",
  },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function Sidebar({ teamName = "Personal", userEmail }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter") ?? null;

  const isSettingsActive = pathname === ROUTES.SETTINGS;

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r border-border/50 bg-sidebar-bg text-sidebar-foreground">

      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2.5">
          {/* Logo mark — sage green */}
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm3 2a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H5zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Board filters */}
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === ROUTES.DASHBOARD && activeFilter === item.filter;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-active text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-sidebar-hover/50" />

        {/* Settings */}
        <Link
          href={ROUTES.SETTINGS}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isSettingsActive
              ? "bg-sidebar-active text-sidebar-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Settings
        </Link>
      </nav>

      {/* Workspace + User */}
      <div className="border-t border-sidebar-hover/50 px-3 py-3">
        {/* Team label */}
        <div className="mb-2 px-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Workspace
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-sidebar-foreground/70">
            {teamName}
          </p>
        </div>

        {/* User account row */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-7 w-7",
              },
            }}
          />
          {userEmail && (
            <span className="truncate text-xs text-sidebar-foreground/60">
              {userEmail}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
