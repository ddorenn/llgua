"use client";

import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStore, useT } from "@/lib/store/store";

/** Badge for demonstration content/data. Always visible wherever sample material is shown. */
export function SampleBadge({ kind = "data", className }: { kind?: "data" | "content"; className?: string }) {
  const t = useT();
  return (
    <Badge variant="warning" className={className} title="Демонстрационные материалы — не настоящие результаты">
      <FlaskConical /> {kind === "data" ? t.common.sampleData : t.common.sampleContent}
    </Badge>
  );
}

export function SamplePreviewBanner() {
  const { state, actions } = useStore();
  const t = useT();
  if (!state.settings.samplePreview) return null;
  return (
    <div className="flex flex-col gap-2 rounded-r-md border-l-2 border-warning bg-surface px-4 py-3 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-warning" />
        {t.common.samplePreviewOn}
      </span>
      <button
        type="button"
        onClick={() => actions.updateSettings({ samplePreview: false })}
        className="shrink-0 cursor-pointer self-start font-medium text-fg underline-offset-4 hover:underline sm:self-auto"
      >
        {t.common.showMyData}
      </button>
    </div>
  );
}

/** Returns true when the page should render demonstration analytics. */
export function useSamplePreview() {
  return useStore().state.settings.samplePreview;
}
