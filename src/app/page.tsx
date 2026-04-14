/**
 * Landing page — guest-first design.
 *
 * Primary action: create a new board instantly (no sign-up).
 * Secondary action: open an existing board by URL/ID.
 * Tertiary: sign in to access the dashboard and saved boards.
 *
 * Also shows recently saved local boards (client-rendered, from localStorage).
 */

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, LogIn, Pencil, Users, Download } from "lucide-react";
import { GuestLandingClient } from "./landing-client";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
                <path d="M3 2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V3a1 1 0 00-1-1H3zm0 7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H3zm6-7a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1V3a1 1 0 00-1-1H9z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
          </div>

          {/* Nav actions */}
          <nav className="flex items-center gap-3">
            {userId ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dashboard
                </Link>
                <div className="flex items-center justify-center">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-7 w-7",
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <Link
                  href={ROUTES.SIGN_IN}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href={ROUTES.SIGN_UP}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-0 h-125 w-125 rounded-full bg-primary/4 blur-3xl" />
          <div className="absolute -bottom-32 left-0 h-100 w-100 rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-2xl text-center">
          {/* Eyebrow badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light px-3 py-1 text-xs font-medium text-primary">
            <Pencil className="h-3 w-3" />
            No account needed
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Sketch together,{" "}
            <span className="text-primary">instantly.</span>
          </h1>

          <p className="mb-10 text-base text-muted-foreground sm:text-lg">
            Create a board, share the link, and collaborate in real time.
            Your work saves to your browser — no sign-up required.
          </p>

          {/* Primary CTA */}
          <Link
            href="/board/new"
            className="group mb-4 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover hover:shadow-primary/20"
          >
            Create a board
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Open existing board */}
          <GuestLandingClient />

          {/* Feature pillars */}
          <div className="mt-16 grid grid-cols-3 gap-6 text-left">
            <FeaturePillar
              icon={<Users className="h-4 w-4 text-primary" />}
              title="Real-time cursors"
              desc="See everyone's cursor live as they draw and move."
            />
            <FeaturePillar
              icon={<Pencil className="h-4 w-4 text-primary" />}
              title="Full tldraw canvas"
              desc="Shapes, sticky notes, arrows, freehand — all built in."
            />
            <FeaturePillar
              icon={<Download className="h-4 w-4 text-primary" />}
              title="Save & reload"
              desc="Export your board as a file. Import it any time."
            />
          </div>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          {APP_NAME}
          {userId ? (
            <>
              {" "}· Signed in. Go to your{" "}
              <Link href="/dashboard" className="text-primary hover:underline">
                dashboard
              </Link>{" "}
              to access your boards.
            </>
          ) : (
            <>
              {" "}· For auth users:{" "}
              <Link href={ROUTES.SIGN_UP} className="text-primary hover:underline">
                create an account
              </Link>{" "}
              to access the dashboard and cloud saves.
            </>
          )}
        </p>
      </footer>
    </div>
  );
}

function FeaturePillar({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
        {icon}
      </div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
