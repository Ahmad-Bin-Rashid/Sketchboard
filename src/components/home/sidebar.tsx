"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Image, Menu } from "lucide-react";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getGuestIdentity } from "@/lib/guest";

interface SidebarProps {
  userName?: string;
  avatarUrl?: string;
}

const NAV_ITEMS = [
  {
    id: "boards",
    label: "Boards",
    icon: LayoutGrid,
    href: ROUTES.HOME,
  },
  {
    id: "media",
    label: "Media Vault",
    icon: Image,
    href: ROUTES.MEDIA,
  },
] as const;

export function Sidebar({ userName = "User", avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState(userName);
  const [displayAvatar, setDisplayAvatar] = useState(avatarUrl || "/user-avatar.svg");

  useEffect(() => {
    const updateName = () => {
      if (avatarUrl === "/user-avatar.svg" || !avatarUrl) {
        const identity = getGuestIdentity();
        setDisplayName(identity.guestName);
        setDisplayAvatar("/user-avatar.svg");
      } else {
        setDisplayName(userName);
        setDisplayAvatar(avatarUrl);
      }
    };

    updateName();
    window.addEventListener("guest-name-updated", updateName);
    return () => window.removeEventListener("guest-name-updated", updateName);
  }, [userName, avatarUrl, pathname]);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border/50 bg-sidebar-bg text-sidebar-foreground transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Top Header Row: Logo & Toggle Button */}
      <div className={cn("flex h-14 items-center px-4", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <Link href={ROUTES.HOME} className="flex items-center gap-2.5">
            {/* Logo mark — sage green */}
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm3 2a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H5zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/75 hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors",
            isCollapsed ? "" : "ml-2"
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          // Check if active:
          const isActive =
            item.id === "boards"
              ? pathname === ROUTES.HOME || pathname.startsWith("/board/")
              : pathname === ROUTES.MEDIA;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group",
                isActive
                  ? "bg-sidebar-active text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground",
                isCollapsed ? "justify-center" : ""
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}

              
            </Link>
          );
        })}
      </nav>

      {/* User Section (clickable, opens settings page) */}
      <div className="border-t border-sidebar-hover/50 p-3">
        <Link
          href={ROUTES.SETTINGS}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-hover transition-colors group relative",
            pathname === ROUTES.SETTINGS ? "bg-sidebar-active text-sidebar-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            isCollapsed ? "justify-center" : ""
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          {displayAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayAvatar}
              alt={displayName}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover bg-surface-hover "
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
              {displayName[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 text-left">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {displayName}
              </span>
              <span className="text-[12px] text-sidebar-foreground/50">
                Settings
              </span>
            </div>
          )}

          
        </Link>
      </div>
    </aside>
  );
}
