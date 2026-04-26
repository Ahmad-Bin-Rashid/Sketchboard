import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { getBoards } from "@/actions/board";
import { getOrCreatePersonalTeam } from "@/actions/team";
import { HomeContent } from "./home-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home — SketchBoard",
  description: "Manage your collaborative and local whiteboards",
};

interface HomePageProps {
  searchParams: Promise<{ filter?: string; search?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await currentUser();

  // Parse URL params
  const params = await searchParams;
  const filter = (params.filter as "all" | "favorites" | "recent") ?? "all";
  const search = params.search ?? "";

  let boards: any[] = [];
  const isGuest = !user;

  if (!isGuest) {
    // Ensure personal team exists on first load
    await getOrCreatePersonalTeam();

    // Fetch boards from DB with filtering
    const boardsResult = await getBoards({ filter, search });
    boards = boardsResult.success ? boardsResult.data : [];
  }

  return (
    <Suspense>
      <HomeContent boards={boards} filter={filter} search={search} isGuest={isGuest} />
    </Suspense>
  );
}
