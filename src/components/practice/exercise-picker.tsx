"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface PickerItem {
  id: string;
  title: string;
  level: string;
  minutes: number;
  done?: string;
}

export function ExercisePicker({ items, value, onChange }: { items: PickerItem[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-pressed={active}
            className={cn(
              "flex min-w-[220px] shrink-0 cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
              active ? "border-accent-line bg-accent-muted" : "border-line bg-card hover:border-line-strong",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{it.title}</div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-subtle">
                <Badge variant="outline">{it.level}</Badge> {it.minutes} min
                {it.done && <span className="text-success">· {it.done}</span>}
              </div>
            </div>
            {it.done && <CheckCircle2 className="mt-0.5 size-4 text-success" />}
          </button>
        );
      })}
    </div>
  );
}
