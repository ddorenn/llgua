"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, Clock, History, ListChecks, ShieldAlert } from "lucide-react";
import { assessments } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { formatDate, pct } from "@/lib/utils";
import { PageHeader, EmptyState, Notice, SectionTitle, SKILL_LABEL } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_ICON = { initial: ListChecks, weekly: CalendarDays, progress: History } as const;

export default function AssessmentsPage() {
  const { state } = useStore();
  const history = state.assessments;
  const hasInitial = history.some((h) => h.type === "initial");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assessments"
        description="Snapshots of your skills over time. Results compare your own attempts with each other."
      />

      <Notice icon={ShieldAlert} title="Not a validated placement test" tone="warning">
        These assessments use demonstration items and simple raw scoring. They give a useful starting snapshot but do not determine your
        CEFR level. A validated item bank and scoring model will replace them later.
      </Notice>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {assessments.map((a) => {
          const Icon = TYPE_ICON[a.type];
          const attempts = history.filter((h) => h.assessmentId === a.id);
          const last = attempts[0];
          const qCount = a.sections.reduce((s, x) => s + x.questions.length, 0);
          const recommended = a.type === "initial" ? !hasInitial : hasInitial;
          return (
            <Card key={a.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-md border border-line bg-surface text-accent-soft">
                    <Icon className="size-[18px]" />
                  </div>
                  <div className="flex gap-1.5">
                    {a.meta.sample && <SampleBadge kind="content" />}
                    {recommended && <Badge variant="accent">Recommended</Badge>}
                  </div>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight">{a.title}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{a.description}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-subtle">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> ~{a.minutes} min</span>
                  <span>{qCount} questions</span>
                  <span>{a.sections.map((s) => SKILL_LABEL[s.skill]).join(" · ")}</span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                  <span className="text-[12px] text-muted">
                    {last ? <>Last: <span className="tabular text-fg">{pct(last.score, last.total)}%</span> · {formatDate(last.completedAt)}</> : "Not taken yet"}
                  </span>
                  <Link href={`/assessments/${a.id}`} className={buttonVariants({ size: "sm", variant: recommended ? "primary" : "secondary" })}>
                    {last ? "Retake" : "Start"} <ArrowRight />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section>
        <SectionTitle action={history.length ? <Link href="/progress" className="text-[12px] text-accent-soft hover:text-fg">Compare in Progress →</Link> : undefined}>
          Assessment history
        </SectionTitle>
        {history.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No results yet" description="Start with the Initial Assessment to create your baseline." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-line bg-surface text-[13px] font-medium text-subtle">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Assessment</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">By skill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-muted">{formatDate(h.completedAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-fg">{h.title}</td>
                    <td className="tabular px-4 py-3 font-medium">{pct(h.score, h.total)}% <span className="font-normal text-subtle">({h.score}/{h.total})</span></td>
                    <td className="px-4 py-3 text-muted">
                      {Object.entries(h.bySkill).map(([k, v]) => `${SKILL_LABEL[k]} ${pct(v.score, v.total)}%`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
