"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Image as ImageIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

export function MobileNav() {
  const pathname = usePathname();

  const items = [
    {
      id: "boards",
      label: "Boards",
      icon: LayoutGrid,
      href: ROUTES.HOME,
      active: pathname === ROUTES.HOME || pathname.startsWith("/board/"),
    },
    {
      id: "media",
      label: "Media Vault",
      icon: ImageIcon,
      href: ROUTES.MEDIA,
      active: pathname === ROUTES.MEDIA,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: ROUTES.SETTINGS,
      active: pathname === ROUTES.SETTINGS,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 border-t border-border/40 bg-card/85 backdrop-blur-md flex md:hidden items-center justify-around px-4 z-50">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold w-16 h-full transition-colors cursor-pointer",
            item.active 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
