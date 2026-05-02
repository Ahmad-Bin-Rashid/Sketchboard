import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { TIERS } from "@/lib/constants";
import { getOrCreatePersonalTeam, getTeamMembers } from "@/actions/team";
import { getStorageUsage } from "@/actions/assets";
import { SettingsClient } from "./settings-client";
import { GuestSettings } from "./guest-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — SketchBoard",
  description: "Manage your account, team, and storage",
};

export default async function SettingsPage() {
  const user = await currentUser();
  const isGuest = !user;

  let teamId: string | null = null;
  let members: any[] = [];
  let storage = { usedMB: 0, maxMB: TIERS.FREE.maxStorageMB as number, percentUsed: 0 };

  if (!isGuest) {
    const teamResult = await getOrCreatePersonalTeam();
    teamId = teamResult.success ? teamResult.data.teamId : null;

    const [membersResult, storageResult] = await Promise.all([
      teamId ? getTeamMembers(teamId) : Promise.resolve({ success: false as const, error: "No team" }),
      getStorageUsage(),
    ]);

    members = membersResult.success ? membersResult.data : [];
    if (storageResult.success) {
      storage = storageResult.data;
    }
  }

  return (
    <div className="mx-auto max-w-237 px-4 sm:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isGuest
            ? "Manage your guest account preferences"
            : "Manage your account, workspace, and storage"}
        </p>
      </div>

      {isGuest ? (
        <GuestSettings />
      ) : (
        <div className="space-y-8">
          {/* Profile — Clerk handles this */}
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Profile
            </h2>
            <div className="overflow-auto w-full mx-auto rounded-2xl border border-card-border bg-card">
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
      )}
    </div>
  );
}
