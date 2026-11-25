import { cn } from "@/lib/utils";

/** Brand mark: a serif italic "L" with the proof-reader's insertion caret — the product corrects and adds. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--c-accent)" />
      <text
        x="11.5"
        y="23"
        fill="var(--c-on-accent)"
        style={{ font: "italic 600 19px var(--font-literata), Georgia, serif" }}
      >
        L
      </text>
      <path d="M20.5 12.5 23 8.5l2.5 4" fill="none" stroke="var(--c-on-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">Lingua</span>}
    </span>
  );
}
