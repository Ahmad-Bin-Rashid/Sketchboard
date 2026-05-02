/**
 * Landing page — guest-first design.
 *
 * Primary action: create a new board instantly (no sign-up).
 * Secondary action: open an existing board by URL/ID.
 * Tertiary: sign in to access the dashboard and saved boards.
 *
 * Fully redesigned to look highly professional, visual, and premium.
 */

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/lib/constants";
import { 
  ArrowRight, 
  Pencil, 
  Users, 
  Download, 
  Sparkles, 
  Share2, 
  Shield, 
  Layers, 
  Clock, 
  CheckCircle,
  Cloud
} from "lucide-react";
import { BoardUrlInput } from "./url-input";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { BoardMockup } from "./board-mockup";
import { FAQAccordion } from "./faq-accordion";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      {/* ─── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
              <svg viewBox="0 0 16 16" className="h-4 w-4 text-white" fill="currentColor">
                <path d="M3 2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V3a1 1 0 00-1-1H3zm0 7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H3zm6-7a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1V3a1 1 0 00-1-1H9z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {APP_NAME}
            </span>
          </Link>

          {/* Nav actions */}
          <nav className="flex items-center gap-4">
            <Link
              href="/home"
              className="flex items-center gap-1.5 rounded-lg px-0 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            {userId ? (            
              <div className="flex items-center justify-center">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8 border border-border shadow-sm",
                    },
                  }}
                />
              </div>              
            ) : (
              <>
                <Link
                  href={ROUTES.SIGN_IN}
                  className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href={ROUTES.SIGN_UP}
                  className="rounded-xl bg-primary px-3 sm:px-4.5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/10 hover:bg-primary-hover hover:shadow-primary/20 transition-all hover:scale-[1.02] duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero Section ────────────────────────────────────── */}
      <main className="flex-1">
        {/* Background gradient decorative shapes */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[-10%] h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-primary/3 blur-3xl" />
          <div className="absolute top-[20%] right-[-10%] h-[350px] w-[350px] sm:h-[600px] sm:w-[600px] rounded-full bg-secondary/3 blur-3xl" />
        </div>

        <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-20 text-center sm:pt-24 md:pb-28">
          {/* Eyebrow badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light px-3 py-1 text-xs font-semibold text-primary animate-fade-in">
            <Pencil className="h-3.5 w-3.5" />
            Instant & No signup required
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1] text-balance">
            Visual collaboration,{" "}
            <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
              simplified.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed">
            Create whiteboards, draw shapes, and collaborate with your team in real time.
            Your work is saved locally in your browser automatically.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/board/new"
              className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary-hover hover:shadow-primary/20 hover:scale-[1.02] duration-200"
            >
              Create a board
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </Link>
            
          </div>
            {/* Open existing board wrapper */}
            <div className="w-full sm:w-150 mx-auto mt-5">
              <BoardUrlInput />
            </div>

          {/* Styled Canvas Visual Mockup */}
          <BoardMockup />
        </section>

        {/* ─── How it Works Section ───────────────────────────── */}
        <section className="border-t border-border/40 bg-surface/30 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-balance">
              Draw and share in three simple steps
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-muted-foreground">
              A frictionless workflow designed to get you and your team sketching instantly.
            </p>

            <div className="mt-14 grid gap-8 sm:grid-cols-3">
              <StepCard
                number="1"
                title="Create instantly"
                desc="Click the create button. A blank whiteboard will open immediately, requiring no email verification or registration details."
              />
              <StepCard
                number="2"
                title="Share the link"
                desc="Copy the unique URL from the browser bar or use the built-in share option to invite your colleagues, clients, or classmates."
              />
              <StepCard
                number="3"
                title="Collaborate live"
                desc="Watch each other's custom color cursor tracks live. Draw shapes, write notes, upload assets, and export your drawings."
              />
            </div>
          </div>
        </section>

        {/* ─── Detailed Features Grid ─────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Powering your creative process
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-muted-foreground">
              Loaded with modern collaboration tools, flexible storage choices, and sleek graphics.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeaturePillar
              icon={<Users className="h-5 w-5 text-primary" />}
              title="Real-time cursors"
              desc="View live pointers of active collaborators on the canvas with custom name labels and signature color accents."
            />
            <FeaturePillar
              icon={<Pencil className="h-5 w-5 text-primary" />}
              title="Complete tldraw canvas"
              desc="Earthy tones meet functional geometries. Utilize rectangles, freehand drawing, lines, text, and sticky notes."
            />
            <FeaturePillar
              icon={<Download className="h-5 w-5 text-primary" />}
              title="Local backups"
              desc="Export your entire whiteboard workspace as a file. Drag and drop it back into the app anytime to restore."
            />
            <FeaturePillar
              icon={<Cloud className="h-5 w-5 text-primary" />}
              title="Guest-to-cloud bridge"
              desc="Work anonymously as a guest. Authenticate to sync and save all local browser boards securely to the cloud."
            />
            <FeaturePillar
              icon={<Layers className="h-5 w-5 text-primary" />}
              title="Dashboard management"
              desc="Organize, duplicate, delete, and view all your cloud-saved boards from a single, clean dashboard interface."
            />
            <FeaturePillar
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              title="Polished aesthetics"
              desc="Features custom glassmorphism components and styling designed to feel premium, natural, and visually calming."
            />
          </div>
        </section>

        {/* ─── Interactive FAQ Accordion Section ──────────────── */}
        <section className="border-t border-border/40 bg-surface/20 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 mb-14 max-w-md text-sm sm:text-base text-muted-foreground">
              Everything you need to know about anonymous drawing, cloud synchronizations, and team access.
            </p>

            <FAQAccordion />
          </div>
        </section>

        {/* ─── Bottom Call-to-Action ──────────────────────────── */}
        <section className="relative overflow-hidden border-t border-border/40 bg-gradient-to-b from-background to-surface/40 py-20 md:py-28 text-center">
          <div className="absolute inset-0 z-0 opacity-40 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-3xl px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to start sketching?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
              Join thousands of makers who use our canvas for wireframing, architecture maps, and team brainstorms.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/board/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/10 hover:bg-primary-hover hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200"
              >
                Create your board now
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/30 bg-background/50 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-muted-foreground">
              {APP_NAME}
            </span>
            <span className="text-xs text-muted-foreground/60">© {new Date().getFullYear()}</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {userId ? (
              <>
                Signed in. Go to your{" "}
                <Link href="/home" className="text-primary hover:underline font-medium">
                  dashboard
                </Link>{" "}
                to access all your cloud-synced boards.
              </>
            ) : (
              <>
                For advanced features,{" "}
                <Link href={ROUTES.SIGN_UP} className="text-primary hover:underline font-medium">
                  create an account
                </Link>{" "}
                to unlock cloud storage, teams, and sharing rules.
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative flex flex-col items-center p-6 text-center rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary mb-4 select-none">
        {number}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{desc}</p>
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
    <div className="group rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all hover:scale-[1.01] duration-200 text-left">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
