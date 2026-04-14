import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { ROUTES, TIERS } from "@/lib/constants";
import { getOrCreatePersonalTeam, getTeamMembers } from "@/actions/team";
import { getStorageUsage } from "@/actions/assets";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — SketchBoard",
  description: "Manage your account, team, and storage",
};

/**
 * Settings page — server component.
 *
 * Fetches:
 * - Current user (Clerk) for profile section
 * - Personal team + members for workspace section
 * - Storage usage for the storage bar
 *
 * The heavy profile editing is delegated to Clerk's <UserProfile /> component.
 */
export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.SIGN_IN);

  // Parallel fetch: team + storage usage
  const teamResult = await getOrCreatePersonalTeam();
  const teamId = teamResult.success ? teamResult.data.teamId : null;

  const [membersResult, storageResult] = await Promise.all([
    teamId ? getTeamMembers(teamId) : Promise.resolve({ success: false as const, error: "No team" }),
    getStorageUsage(),
  ]);

  const members = membersResult.success ? membersResult.data : [];
  const storage = storageResult.success
    ? storageResult.data
    : { usedMB: 0, maxMB: TIERS.FREE.maxStorageMB, percentUsed: 0 };

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account, workspace, and storage
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile — Clerk handles this */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Profile
          </h2>
          <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-none bg-transparent",
                  navbar: "hidden",
                  pageScrollBox: "p-0",
                },
              }}
            />
          </div>
        </section>

        {/* Workspace & Team — client component for interactivity */}
        {teamId && (
          <SettingsClient
            teamId={teamId}
            initialMembers={members}
            storage={storage}
          />
        )}
      </div>
    </div>
  );
}
