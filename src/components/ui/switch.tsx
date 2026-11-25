"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:opacity-40",
        checked ? "border-accent bg-accent" : "border-line-strong bg-elevated",
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full bg-card shadow transition-transform duration-200",
          checked ? "translate-x-[18px] bg-on-accent" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
