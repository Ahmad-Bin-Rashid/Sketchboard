"use client";

import { Sidebar } from "@/components/dashboard";

/**
 * Dashboard layout — sidebar + main content area.
 * Wraps /dashboard/* pages with navigation and user controls.
 *
 * This layout is only visible to authenticated users (protected by proxy).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
