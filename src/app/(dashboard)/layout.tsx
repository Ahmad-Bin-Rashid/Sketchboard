import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard";
import { getUserTeams } from "@/actions/team";
import { ROUTES } from "@/lib/constants";

/**
 * Dashboard layout — server component.
 *
 * Fetches the current user's team info to pass to the Sidebar.
 * Protects all dashboard routes — redirects to sign-in if not authenticated.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect(ROUTES.SIGN_IN);

  const userName = user.username || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User";
  const avatarUrl = user.imageUrl;

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
