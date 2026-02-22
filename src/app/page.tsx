import Link from "next/link";
import { ROUTES, APP_NAME } from "@/lib/constants";
import {
  ArrowRight,
  Infinity,
  MousePointer2,
  Shapes,
  Zap,
} from "lucide-react";

/**
 * Landing page — public, no auth required.
 * Marketing/hero page with calm & natural design aesthetic.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm3 2a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H5zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              {APP_NAME}
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href={ROUTES.SIGN_IN}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href={ROUTES.SIGN_UP}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24">
        {/* Subtle background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 right-0 h-[600px] w-[600px] rounded-full bg-primary/[0.03] blur-3xl" />
          <div className="absolute -bottom-1/4 left-0 h-[500px] w-[500px] rounded-full bg-secondary/[0.04] blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            Real-time collaboration for teams
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Think together,{" "}
            <span className="text-primary">naturally</span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            A calm, collaborative whiteboard where your team brainstorms,
            plans, and creates — all on an infinite canvas with live presence.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={ROUTES.SIGN_UP}
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-md"
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* Canvas preview mockup */}
        <div className="relative z-10 mx-auto mt-16 w-full max-w-4xl">
          <div
            className="overflow-hidden rounded-xl border border-card-border bg-card shadow-lg"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {/* Mock toolbar */}
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <div className="ml-3 rounded bg-surface px-3 py-0.5 text-xs text-muted-foreground">
                Project Brainstorm
              </div>
            </div>
            {/* Mock canvas */}
            <div className="relative aspect-[16/8] bg-canvas-bg p-8">
              {/* Mock sticky notes */}
              <div className="absolute left-[10%] top-[15%] w-32 rotate-[-2deg] rounded-lg bg-[#fef3c7] p-3 shadow-sm">
                <p className="text-xs font-medium text-[#92400e]">User Research</p>
              </div>
              <div className="absolute left-[35%] top-[20%] w-32 rotate-[1deg] rounded-lg bg-[#dbeafe] p-3 shadow-sm">
                <p className="text-xs font-medium text-[#1e40af]">Define Goals</p>
              </div>
              <div className="absolute left-[60%] top-[12%] w-32 rotate-[-1deg] rounded-lg bg-[#dcfce7] p-3 shadow-sm">
                <p className="text-xs font-medium text-[#166534]">Prototype</p>
              </div>

              {/* Mock arrow lines */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 400">
                <path
                  d="M 175 95 C 240 80, 260 100, 300 100"
                  stroke="#a8a29e"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 4"
                />
                <path
                  d="M 400 100 C 440 80, 460 80, 500 70"
                  stroke="#a8a29e"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Mock cursors */}
              <div className="absolute left-[25%] top-[55%]">
                <MousePointer2 className="h-4 w-4 text-[#5b8a72]" />
                <span className="ml-3 -mt-0.5 inline-block rounded bg-[#5b8a72] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  You
                </span>
              </div>
              <div className="absolute left-[55%] top-[45%]">
                <MousePointer2 className="h-4 w-4 text-[#b8860b]" />
                <span className="ml-3 -mt-0.5 inline-block rounded bg-[#b8860b] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Alex
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section id="features" className="border-t bg-surface/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to think visually
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
              A focused toolkit designed for clarity, not clutter.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Infinity className="h-5 w-5" />}
              title="Infinite Canvas"
              description="Pan and zoom freely across an endless board. No boundaries, no limits — just space to think."
            />
            <FeatureCard
              icon={<MousePointer2 className="h-5 w-5" />}
              title="Live Presence"
              description="See your teammates' cursors in real-time. Always know who's where and what they're working on."
            />
            <FeatureCard
              icon={<Shapes className="h-5 w-5" />}
              title="Smart Objects"
              description="Shapes, sticky notes, and arrows that snap together. Build diagrams and flows intuitively."
            />
            <FeatureCard
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5z" />
                </svg>
              }
              title="Image Upload"
              description="Drag and drop images directly onto the canvas. Resize and position them alongside your work."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Instant Sync"
              description="Built with CRDTs so edits never conflict. Every change syncs instantly, even with shaky connections."
            />
            <FeatureCard
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              }
              title="Team Workspaces"
              description="Organize boards by team. Invite members, assign roles, and collaborate across your organization."
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="border-t px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to think better, together?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Get started for free. No credit card required.
          </p>
          <Link
            href={ROUTES.SIGN_UP}
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-md"
          >
            Create your first board
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t bg-surface/30 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-primary" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm3 2a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1H5zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" />
              </svg>
            </div>
            &copy; {new Date().getFullYear()} {APP_NAME}
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">Privacy</a>
            <a href="#" className="transition-colors hover:text-foreground">Terms</a>
            <a href="#" className="transition-colors hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Feature card component ──────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
