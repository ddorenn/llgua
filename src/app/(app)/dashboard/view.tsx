"use client";

import Link from "next/link";
import {
  ArrowRight, BookA, CalendarCheck, Check, CircleDot, ClipboardList, Flame, GraduationCap, NotebookPen, Sparkles, Target, TrendingDown,
} from "lucide-react";
import { allLessons, vocabularyFile, sampleData, levels } from "@/lib/content";
import { useStore, useT } from "@/lib/store/store";
import {
  lessonsCompleted, overallCourseProgress, resolveBlock, studyStreak, todayProgress, vocabCounts, mistakeStats,
} from "@/lib/store/selectors";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { EmptyState, Notice, SectionTitle, StatCard } from "@/components/shared/page";
import { SampleBadge, SamplePreviewBanner } from "@/components/shared/sample";

function greeting(t: ReturnType<typeof useT>) {
  const h = new Date().getHours();
  return h < 12 ? t.dashboard.greeting_morning : h < 18 ? t.dashboard.greeting_afternoon : t.dashboard.greeting_evening;
}

const ACTIVITY_ICON = {
  lesson: GraduationCap,
  vocabulary: BookA,
  homework: NotebookPen,
  assessment: ClipboardList,
  practice: CircleDot,
  plan: CalendarCheck,
} as const;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return formatDate(iso);
}

export function DashboardView() {
  const { state, actions } = useStore();
  const t = useT();
  const sample = state.settings.samplePreview;
  const today = todayProgress(state);

  const real = {
    streak: studyStreak(state),
    words: vocabCounts(state, vocabularyFile.words.length).learned,
    lessons: lessonsCompleted(state),
    overall: overallCourseProgress(state),
  };
  const stats = sample
    ? { streak: sampleData.streak, words: sampleData.wordsLearned, lessons: sampleData.lessonsCompleted, overall: sampleData.overallProgress }
    : real;

  const level = sample ? sampleData.level : state.settings.currentLevel;
  const levelInfo = levels.find((l) => l.id === level);

  const nextLesson = allLessons.find((l) => state.lessons[l.id]?.status !== "completed" && l.blocks.length > 0);
  const firstOpenBlock = today.blocks.find((b) => !today.done.includes(b.id));
  const continueHref = firstOpenBlock ? resolveBlock(firstOpenBlock).href ?? "/daily-plan" : nextLesson ? `/learning/${nextLesson.id}` : "/learning";

  const weakAreas = sample ? sampleData.weakAreas : mistakeStats(state).slice(0, 3).map((m) => m.category);
  const activity = sample
    ? sampleData.recentActivity.map((a, i) => ({ id: String(i), type: a.type as keyof typeof ACTIVITY_ICON, label: a.label, when: a.when }))
    : state.activity.slice(0, 5).map((a) => ({ id: a.id, type: a.type, label: a.label, when: timeAgo(a.at) }));

  return (
    <div className="space-y-8">
      <SamplePreviewBanner />

      {/* Hero */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/10 blur-3xl" />
          <CardContent className="relative flex h-full flex-col justify-between gap-8 p-6 sm:p-7">
            <div>
              <p className="text-[13px] text-muted">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
                {greeting(t)}, {state.settings.displayName || "Student"}.
              </h1>
              <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-muted">
                {today.percent === 100
                  ? "Today's plan is complete. Great work — a short review keeps it fresh."
                  : today.minutesDone > 0
                    ? `You've done ${today.minutesDone} of ${today.total} minutes today. Keep the momentum.`
                    : `Your ${today.total}-minute plan is ready. Start with ${firstOpenBlock ? resolveBlock(firstOpenBlock).title.toLowerCase() : "today's first block"}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={continueHref} className={buttonVariants({ size: "lg" })}>
                Continue learning <ArrowRight />
              </Link>
              <Link href="/daily-plan" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                View today’s plan
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.14em] text-muted">Current level</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-fg">{level ?? "—"}</span>
                  {levelInfo && <span className="text-[14px] text-muted">{levelInfo.name}</span>}
                </div>
              </div>
              {sample ? <SampleBadge /> : <Badge variant="outline">{level ? "Self-reported" : "Not set"}</Badge>}
            </div>
            {level ? (
              <p className="text-[13px] leading-relaxed text-muted">{levelInfo?.summary}</p>
            ) : (
              <p className="text-[13px] leading-relaxed text-muted">
                Take the initial assessment for a starting snapshot, or set your level in Settings. A validated CEFR placement is not
                available yet.
              </p>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span>Course progress</span>
                <span className="tabular text-fg">{stats.overall}%</span>
              </div>
              <Progress value={stats.overall} label="Course progress" />
            </div>
            {!level && !sample && (
              <Link href="/assessments" className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
                Start initial assessment
              </Link>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Stats */}
      <section>
        <SectionTitle action={sample ? <SampleBadge /> : undefined}>At a glance</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Daily goal"
            icon={Target}
            value={
              <span>
                {today.minutesDone}
                <span className="text-[15px] font-normal text-muted"> / {today.total} min</span>
              </span>
            }
            hint={<Progress value={today.percent} className="mt-1" label="Daily goal" />}
          />
          <StatCard label="Study streak" icon={Flame} value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`} hint="Days with at least one block done" />
          <StatCard label="Words learned" icon={BookA} value={stats.words} hint={sample ? "Sample figure" : `of ${vocabularyFile.words.length} in your list`} />
          <StatCard label="Lessons completed" icon={GraduationCap} value={stats.lessons} hint={sample ? "Sample figure" : `of ${allLessons.length} in the course`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Today's plan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Today’s learning plan</CardTitle>
              <CardDescription>
                {today.done.length} of {today.blocks.length} blocks complete · {today.total} minutes
              </CardDescription>
            </div>
            <ProgressRing value={today.percent} size={44} stroke={4}>
              <span className="tabular text-[11px] font-semibold">{today.percent}%</span>
            </ProgressRing>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-line">
              {today.blocks.map((b) => {
                const r = resolveBlock(b);
                const done = today.done.includes(b.id);
                return (
                  <li key={b.id} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => actions.togglePlanBlock(b.id, r.title)}
                      role="checkbox"
                      aria-checked={done}
                      aria-label={`Mark ${r.title} as ${done ? "not done" : "done"}`}
                      className={cn(
                        "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
                        done ? "border-accent bg-accent text-white" : "border-line-strong hover:border-accent/60",
                      )}
                    >
                      {done && <Check className="size-3.5" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-[14px] font-medium", done ? "text-muted line-through decoration-subtle" : "text-fg")}>{r.title}</div>
                      <div className="truncate text-[12px] text-subtle">{b.description}</div>
                    </div>
                    <span className="tabular shrink-0 text-[12px] text-muted">{b.minutes} min</span>
                    {r.href && (
                      <Link href={r.href} className="hidden shrink-0 text-[12px] text-accent-soft hover:text-fg sm:inline">
                        Open
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* AI tutor report */}
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent-soft" /> Latest tutor report
              </CardTitle>
              <CardDescription>{sample ? formatDate(sampleData.tutorReport.date, { day: "numeric", month: "long" }) : "Weekly AI summary"}</CardDescription>
            </div>
            {sample && <SampleBadge />}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-4">
            {sample ? (
              <>
                <p className="text-[13.5px] leading-relaxed text-fg/90">{sampleData.tutorReport.summary}</p>
                <ul className="mt-4 space-y-2">
                  {sampleData.tutorReport.recommendations.map((r) => (
                    <li key={r} className="flex gap-2 text-[13px] text-muted">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-accent-soft" />
                      {r}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No report yet"
                description="Reports will be generated by the AI tutor once an AI provider is connected and you have some activity."
                className="flex-1 py-8"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Weak areas */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="size-4 text-muted" /> Weak areas
              </CardTitle>
              <CardDescription>From your assessment mistakes</CardDescription>
            </div>
            {sample && <SampleBadge />}
          </CardHeader>
          <CardContent className="pt-4">
            {weakAreas.length ? (
              <ul className="space-y-2">
                {weakAreas.map((w, i) => (
                  <li key={w} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5 text-[13px]">
                    <span className="text-fg">{w}</span>
                    <span className="tabular text-[11px] text-subtle">#{i + 1}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={ClipboardList} title="Not enough data" description="Complete an assessment to see where to focus." className="py-8" />
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Everything you do in LINGUA is logged here</CardDescription>
            </div>
            {sample && <SampleBadge />}
          </CardHeader>
          <CardContent className="pt-4">
            {activity.length ? (
              <ul className="space-y-1">
                {activity.map((a) => {
                  const Icon = ACTIVITY_ICON[a.type] ?? CircleDot;
                  return (
                    <li key={a.id} className="flex items-center gap-3 rounded-md px-1 py-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-muted">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{a.label}</span>
                      <span className="shrink-0 text-[12px] text-subtle">{a.when}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title="No activity yet"
                description="Complete a daily block, a lesson or a vocabulary review and it will appear here."
                action={
                  <Link href="/daily-plan" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Open daily plan
                  </Link>
                }
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
      </section>

      {!sample && state.activity.length === 0 && (
        <Notice icon={Sparkles} title="Want to see the full experience first?" tone="accent">
          Turn on <strong className="font-medium text-fg">Sample preview</strong> in the top bar to fill dashboards with clearly labelled
          demonstration data.{" "}
          <Button variant="link" size="sm" onClick={() => actions.updateSettings({ samplePreview: true })}>
            Turn on now
          </Button>
        </Notice>
      )}
    </div>
  );
}
