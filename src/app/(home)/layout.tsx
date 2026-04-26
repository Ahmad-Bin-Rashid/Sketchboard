import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/home";
import { ROUTES } from "@/lib/constants";

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
    <div className="flex h-screen bg-background">
      <Suspense>
        <Sidebar
          userName={userName}
          avatarUrl={avatarUrl}
        />
      </Suspense>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
