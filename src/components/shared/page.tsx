import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-accent-soft">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

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
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center", className)}>
      <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-line bg-surface text-muted">
        <Icon className="size-[18px]" />
      </div>
      <p className="text-[14px] font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

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
    neutral: "border-line bg-surface text-muted",
    accent: "border-accent/30 bg-accent-muted text-accent-soft",
    warning: "border-warning/25 bg-warning/[0.06] text-warning",
  };
  return (
    <div className={cn("flex gap-3 rounded-md border px-3.5 py-3 text-[13px]", tones[tone], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-fg">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed text-muted">{children}</div>}
      </div>
    </div>
  );
}

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
    <div className={cn("rounded-lg border border-line bg-card px-4 py-4", className)}>
      <div className="flex items-center justify-between text-[12px] text-muted">
        <span>{label}</span>
        {Icon && <Icon className="size-3.5 text-subtle" />}
      </div>
      <div className="tabular mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg">{value}</div>
      {hint && <div className="mt-2 text-[12px] text-subtle">{hint}</div>}
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
