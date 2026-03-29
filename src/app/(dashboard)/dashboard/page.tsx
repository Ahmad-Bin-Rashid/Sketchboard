import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getBoards } from "@/actions/board";
import { getOrCreatePersonalTeam } from "@/actions/team";
import { ROUTES, BOARD_DEFAULTS } from "@/lib/constants";
import { DashboardContent } from "./dashboard-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — SketchBoard",
  description: "Manage your collaborative whiteboards",
};

interface DashboardPageProps {
  searchParams: Promise<{ filter?: string; search?: string }>;
}

/**
 * Dashboard page — server component.
 *
 * Flow:
 * 1. Verify user is authenticated (redirect to sign-in if not)
 * 2. Ensure the user's personal team exists (idempotent)
 * 3. Fetch boards with optional search/filter from URL params
 * 4. Render DashboardContent client component with the data
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect(ROUTES.SIGN_IN);
  }

  // Ensure personal team exists on first load
  await getOrCreatePersonalTeam();

  // Parse URL params
  const params = await searchParams;
  const filter = (params.filter as "all" | "favorites" | "recent") ?? "all";
  const search = params.search ?? "";

  // Fetch boards from DB with filtering
  const boardsResult = await getBoards({ filter, search });
  const boards = boardsResult.success ? boardsResult.data : [];

  return (
    <Suspense>
      <DashboardContent boards={boards} filter={filter} search={search} />
    </Suspense>
  );
}
