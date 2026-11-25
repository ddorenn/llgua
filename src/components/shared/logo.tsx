import { cn } from "@/lib/utils";

/** Compact brand mark: a heavy "L" on a charcoal tile (for small spaces and app icons). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[#1c1b19] font-[family-name:var(--font-display)] text-[16px] font-bold leading-none text-[#e9e4da] dark:bg-[#e9e4da] dark:text-[#111110]",
        className,
      )}
    >
      L
    </span>
  );
}

/** The LINGUA wordmark. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  if (compact) return <LogoMark className={className} />;
  return (
    <span className={cn("inline-flex items-baseline font-[family-name:var(--font-display)] text-[19px] font-bold leading-none tracking-[-0.04em] text-fg", className)}>
      LINGUA
    </span>
  );
}
