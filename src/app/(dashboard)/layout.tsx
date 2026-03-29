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

  // Fetch teams for sidebar workspace display
  const teamsResult = await getUserTeams();
  const teams = teamsResult.success ? teamsResult.data : [];
  const personalTeam = teams.find((t) => t.isPersonal);

  const primaryEmail = user.emailAddresses?.[0]?.emailAddress;

  return (
    <div className="flex h-screen bg-background">
      <Suspense>
        <Sidebar
          teamName={personalTeam?.name ?? "Personal"}
          userEmail={primaryEmail}
        />
      </Suspense>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
