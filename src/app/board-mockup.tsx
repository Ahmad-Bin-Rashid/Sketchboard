import { 
  MousePointer2, 
  Square, 
  Type, 
  StickyNote, 
  ArrowUpRight, 
  Hand, 
  Pencil, 
  Eraser, 
  Circle,
  Share2,
  Lock,
  ArrowRight
} from "lucide-react";

export function BoardMockup() {
  return (
    <div className="relative mx-auto mt-14 max-w-4xl w-full rounded-2xl border border-border/70 bg-card shadow-2xl overflow-hidden aspect-[16/10] sm:aspect-[16/9]">
      {/* Browser/App title bar */}
      <div className="flex h-10 w-full items-center justify-between border-b border-border/60 bg-surface/50 px-4">
        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-400/80" />
          <div className="h-3 w-3 rounded-full bg-amber-400/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
        </div>
        {/* Fake URL bar */}
        <div className="flex h-6 w-1/3 max-w-[280px] items-center justify-center rounded bg-background px-2 text-[10px] sm:text-xs text-muted-foreground/60 border border-border/40 select-none">
          sketchboard.io/board/arch-design
        </div>
        {/* Fake Status indicator */}
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary font-medium">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </div>
      </div>

      {/* Editor Main Canvas with Dotted Grid */}
      <div className="relative h-[calc(100%-40px)] w-full bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden select-none">
        
        {/* ─── Mockup Header ─── */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          {/* Logo/Home */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-bg shadow-sm border border-panel-border text-foreground">
            <span className="text-xs font-bold text-primary">S</span>
          </div>
          {/* Board Name Pill */}
          <div className="flex h-8 items-center gap-2 rounded-lg bg-panel-bg px-3 shadow-sm border border-panel-border">
            <span className="text-xs font-semibold text-foreground">Architecture Draft</span>
            <Lock className="h-3 w-3 text-muted-foreground/75" />
          </div>
        </div>

        {/* ─── Mockup Collaborators (Top Right) ─── */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <div className="flex -space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white border-2 border-card">JD</div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-medium text-white border-2 border-card">AM</div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white border-2 border-card">LH</div>
          </div>
          <button className="flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-white shadow-sm hover:bg-primary-hover transition-colors">
            <Share2 className="h-3 w-3" />
            Share
          </button>
        </div>

        {/* ─── Canvas Elements ─── */}
        
        {/* Sage Green Rectangle Box */}
        <div className="absolute left-[12%] top-[25%] sm:left-[15%] sm:top-[30%] flex h-14 w-28 sm:h-20 sm:w-40 flex-col justify-center rounded-xl border-2 border-primary bg-primary-light/40 p-2 text-center shadow-md transition-transform hover:scale-[1.02] duration-200">
          <span className="text-[10px] sm:text-xs font-bold text-primary">User Authentication</span>
          <span className="text-[8px] sm:text-[10px] text-muted-foreground/80">Clerk Middleware</span>
        </div>

        {/* Arrow Connector 1 */}
        <svg className="absolute left-[38%] top-[32%] sm:left-[35%] sm:top-[40%] w-[12%] h-[15%] text-primary-hover/50 overflow-visible" fill="none">
          <path d="M 0,0 C 30,10 50,10 80,5" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 2" />
          <polygon points="76,1 84,5 76,9" fill="var(--primary)" />
        </svg>

        {/* Warm Amber Sticky Note */}
        <div className="absolute left-[52%] top-[15%] sm:left-[48%] sm:top-[22%] rotate-[-2deg] flex h-24 w-24 sm:h-32 sm:w-32 flex-col justify-between bg-[#fef3c7] p-3 text-left shadow-lg border border-amber-200/50 transition-transform hover:rotate-[1deg] hover:scale-[1.02] duration-200">
          <span className="text-[9px] sm:text-xs font-medium text-amber-900 leading-tight">
            Idea: Add guest-to-auth DB migration bridge on login! 💡
          </span>
          <span className="text-[8px] text-amber-700/70 font-semibold text-right">#roadmap</span>
        </div>

        {/* Circle Node */}
        <div className="absolute left-[45%] top-[55%] sm:left-[45%] sm:top-[60%] flex h-16 w-16 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-secondary bg-secondary-light/40 text-center shadow-md transition-transform hover:scale-[1.02] duration-200">
          <span className="text-[8px] sm:text-[10px] font-bold text-secondary">PartyKit</span>
          <span className="text-[7px] sm:text-[8px] text-muted-foreground">Live Sync</span>
        </div>

        {/* Arrow Connector 2 */}
        <svg className="absolute left-[28%] top-[50%] sm:left-[30%] sm:top-[55%] w-[15%] h-[15%] text-primary-hover/50 overflow-visible" fill="none">
          <path d="M 0,10 C 20,-10 65,-20 80,0" stroke="var(--secondary)" strokeWidth="2" />
          <polygon points="76,-4 81,1 83,-7" fill="var(--secondary)" />
        </svg>

        {/* ─── Mockup Active Cursors ─── */}
        
        {/* Cursor: Jane Doe */}
        <div className="absolute left-[38%] top-[45%] z-20 flex flex-col items-start gap-1">
          <div className="flex items-center gap-1 rounded bg-rose-500 px-1.5 py-0.5 shadow-sm">
            <span className="text-[8px] font-semibold text-white">Jane</span>
          </div>
          <MousePointer2 className="h-4 w-4 text-rose-500 fill-rose-500 stroke-rose-500 rotate-[-90deg] -mt-1 -ml-1 drop-shadow-sm" />
        </div>

        {/* Cursor: Alex M */}
        <div className="absolute left-[65%] top-[65%] z-25 flex flex-col items-start gap-1">
          <div className="flex items-center gap-1 rounded bg-indigo-500 px-1.5 py-0.5 shadow-sm">
            <span className="text-[8px] font-semibold text-white">Alex (Editor)</span>
          </div>
          <MousePointer2 className="h-4 w-4 text-indigo-500 fill-indigo-500 stroke-indigo-500 rotate-[-90deg] -mt-1 -ml-1 drop-shadow-sm" />
        </div>

        {/* ─── Mockup Floating Toolbar (Bottom Center) ─── */}
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1 rounded-xl bg-panel-bg p-1.5 shadow-lg border border-panel-border">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <Hand className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <MousePointer2 className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary border border-primary/20">
            <Pencil className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <Square className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <Circle className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <StickyNote className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <Type className="h-4 w-4" />
          </button>
          <div className="h-5 w-[1px] bg-border/60 mx-1" />
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
            <Eraser className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
