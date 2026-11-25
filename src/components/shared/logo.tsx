import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-surface)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="var(--color-line-strong)" />
      <path d="M11 8v16h10" fill="none" stroke="var(--color-accent-soft)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="10" r="2" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && <span className="text-[15px] font-semibold tracking-[0.18em] text-fg">LINGUA</span>}
    </span>
  );
}
