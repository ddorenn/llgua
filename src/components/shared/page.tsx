import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page title block. Large, quiet, left-aligned — no eyebrow labels. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional context line (e.g. a date). Sentence case, never a shouting label. */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13.5px] text-muted">{eyebrow}</div>}
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-fg sm:text-[36px]">{title}</h1>
        {description && <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Section heading: a hairline rule, a plain title, an optional action on the right. */
export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-baseline justify-between gap-3 border-t border-line pt-4", className)}>
      <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-fg">{children}</h2>
      {action && <div className="text-[13px]">{action}</div>}
    </div>
  );
}

/** Empty state: an invitation to act, not a decoration. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start rounded-lg bg-surface px-5 py-6 sm:px-6", className)}>
      <Icon className="mb-3 size-5 text-subtle" aria-hidden />
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A note in the margin: a coloured rule on the left, quiet text. */
export function Notice({
  icon: Icon,
  title,
  children,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  tone?: "neutral" | "accent" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "border-line-strong",
    accent: "border-accent",
    warning: "border-warning",
  };
  const iconTone = { neutral: "text-subtle", accent: "text-accent-soft", warning: "text-warning" };
  return (
    <div className={cn("flex gap-3 rounded-r-md border-l-2 bg-surface px-4 py-3 text-[13.5px]", tones[tone], className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconTone[tone])} aria-hidden />
      <div className="min-w-0">
        <p className="font-medium text-fg">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed text-muted">{children}</div>}
      </div>
    </div>
  );
}

/** A figure set in type, separated by a hairline — not a box. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-line pt-3.5", className)}>
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        {Icon && <Icon className="size-3.5 text-subtle" aria-hidden />}
        <span>{label}</span>
      </div>
      <div className="tabular mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.03em] text-fg">{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-subtle">{hint}</div>}
    </div>
  );
}

export const SKILL_LABEL: Record<string, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  review: "Review",
  rotation: "Rotation",
};
