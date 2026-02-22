import type { Metadata } from "next";
import { DashboardContent } from "./dashboard-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard page — shows user's boards.
 * Server component that passes data to the client-side grid.
 *
 * Phase 7 will add:
 * - Fetch boards from DB for current user
 * - Search and filtering
 * - Favorites
 */
export default function DashboardPage() {
  // TODO (Phase 7): Fetch boards from DB
  const mockBoards = [
    { id: "demo-board-1", name: "Project Brainstorm", updatedAt: "2 hours ago", activeUsers: 2 },
    { id: "demo-board-2", name: "Sprint Planning", updatedAt: "Yesterday", activeUsers: 0 },
    { id: "demo-board-3", name: "User Flow Mapping", updatedAt: "3 days ago", activeUsers: 0 },
  ];

  return <DashboardContent boards={mockBoards} />;
}
