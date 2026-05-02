import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Sidebar } from "@/components/home";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { MobileNav } from "./mobile-nav";

/**
 * Shared layout for authenticated and guest users inside dashboard/home sections.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  // If authenticated, use Clerk details. Otherwise, use Guest defaults.
  const userName = user 
    ? (user.username || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User")
    : "Guest";
  const avatarUrl = user ? user.imageUrl : "/user-avatar.svg";

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <Suspense>
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar
            userName={userName}
            avatarUrl={avatarUrl}
          />
        </div>
      </Suspense>

      {/* Mobile Top Header */}
      <header className="flex md:hidden h-14 items-center justify-between border-b border-border/40 bg-card px-4 flex-shrink-0 z-10">
        <Link href={ROUTES.HOME} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm3 2a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H5zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" />
            </svg>
          </div>
          <span className="text-[14px] font-bold tracking-tight">{APP_NAME}</span>
        </Link>
        {/* User profile / settings quick link */}
        <Link href={ROUTES.SETTINGS} className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-border">
          {avatarUrl && avatarUrl !== "/user-avatar.svg" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary-light text-xs font-semibold text-primary">
              {userName[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
