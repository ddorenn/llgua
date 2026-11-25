"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, BookA, Clock, ClipboardList, Flame, GraduationCap, Table2 } from "lucide-react";
import { allLessons, sampleData, vocabularyFile, assessments as assessmentDefs } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import {
  last7Days, lessonsCompleted, minutesForDay, mistakeStats, overallCourseProgress, skillSnapshot, studyStreak, totalStudyMinutes, vocabCounts,
} from "@/lib/store/selectors";
import type { LinguaState } from "@/lib/store/types";
import { formatDate, pct } from "@/lib/utils";
import { PageHeader, EmptyState, SKILL_LABEL, StatCard } from "@/components/shared/page";
import { SampleBadge, SamplePreviewBanner } from "@/components/shared/sample";
import { CHART, ColumnChart, CompareBars, GrowthArea, Legend, RankedBars, TrendLine } from "@/components/charts/charts";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";

/** Accuracy per grammar tag across all assessments (real data). */
function grammarTopics(state: LinguaState) {
  const tally = new Map<string, { ok: number; total: number }>();
  for (const r of state.assessments) {
    const def = assessmentDefs.find((a) => a.id === r.assessmentId);
    if (!def) continue;
    const wrong = new Set(r.mistakes.map((m) => m.questionId));
    for (const s of def.sections.filter((x) => x.skill === "grammar")) {
      for (const q of s.questions) {
        const key = q.tag ?? "general";
        const t = tally.get(key) ?? { ok: 0, total: 0 };
        t.total++;
        if (!wrong.has(q.id)) t.ok++;
        tally.set(key, t);
      }
    }
  }
  return [...tally.entries()].map(([topic, t]) => ({ topic: topic.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()), mastery: pct(t.ok, t.total) }));
}

/** Cumulative learned words by week, using the date each word was last reviewed. */
function vocabGrowth(state: LinguaState) {
  const learned = Object.values(state.vocabulary).filter((v) => v.status === "learned" && v.lastReviewed);
  const weeks: { week: string; words: number }[] = [];
  for (let w = 4; w >= 0; w--) {
    const end = new Date();
    end.setDate(end.getDate() - w * 7);
    weeks.push({
      week: w === 0 ? "This wk" : `−${w} wk`,
      words: learned.filter((v) => new Date(v.lastReviewed!).getTime() <= end.getTime()).length,
    });
  }
  return weeks;
}

function NoData({ text, href, cta }: { text: string; href?: string; cta?: string }) {
  return (
    <EmptyState
      icon={BarChart3}
      title="Not enough data yet"
      description={text}
      action={href && cta ? <Link href={href} className={buttonVariants({ variant: "secondary", size: "sm" })}>{cta}</Link> : undefined}
      className="py-10"
    />
  );
}

export default function ProgressPage() {
  const { state } = useStore();
  const sample = state.settings.samplePreview;
  const [showTable, setShowTable] = React.useState(false);
  const [range, setRange] = React.useState<"week" | "all">("week");

  const firstSnap = skillSnapshot(state, "first");
  const latestSnap = skillSnapshot(state, "latest");
  const skills = sample
    ? sampleData.skills
    : Object.keys(latestSnap).map((k) => ({ skill: SKILL_LABEL[k] ?? k, initial: firstSnap[k] ?? 0, current: latestSnap[k] }));

  const weekly = sample ? sampleData.weeklyActivity : last7Days(state).map((d) => ({ day: d.day, minutes: d.minutes }));
  const allTime = React.useMemo(() => {
    const dates = Object.keys(state.dailyPlans).sort();
    return dates.slice(-30).map((d) => ({ day: formatDate(d), minutes: minutesForDay(state, d) }));
  }, [state]);

  const topics = sample ? sampleData.grammarTopics : grammarTopics(state);
  const growth = sample ? sampleData.vocabularyGrowth : vocabGrowth(state);
  const history = sample
    ? sampleData.assessments.map((a) => ({ date: formatDate(a.date), score: a.score, title: a.title }))
    : [...state.assessments].reverse().map((a) => ({ date: formatDate(a.completedAt), score: pct(a.score, a.total), title: a.title }));
  const mistakes = sample ? sampleData.mistakes : mistakeStats(state);

  const kpi = sample
    ? { overall: sampleData.overallProgress, minutes: sampleData.studyMinutesWeek, streak: sampleData.streak, words: sampleData.wordsLearned, lessons: sampleData.lessonsCompleted }
    : {
        overall: overallCourseProgress(state),
        minutes: last7Days(state).reduce((s, d) => s + d.minutes, 0),
        streak: studyStreak(state),
        words: vocabCounts(state, vocabularyFile.words.length).learned,
        lessons: lessonsCompleted(state),
      };

  const badge = sample ? <SampleBadge /> : undefined;
  const hasWeekly = weekly.some((d) => d.minutes > 0);

  return (
    <div className="space-y-8">
      <SamplePreviewBanner />
      <PageHeader
        title="Progress"
        description="Your learning analytics. Everything here is computed from your own activity and assessments."
        actions={
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-pressed={showTable}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Table2 /> {showTable ? "Show charts" : "Table view"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-5 p-5">
            <ProgressRing value={kpi.overall} size={84} stroke={6}>
              <span className="tabular text-[18px] font-semibold">{kpi.overall}%</span>
            </ProgressRing>
            <div>
              <div className="text-[12px] text-muted">Overall course progress</div>
              <div className="mt-1 text-[13px] text-subtle">
                {kpi.lessons} {sample ? "lessons" : `of ${allLessons.length} lessons`} completed
              </div>
              {badge && <div className="mt-2">{badge}</div>}
            </div>
          </CardContent>
        </Card>
        <StatCard label="Study time · 7 days" icon={Clock} value={`${kpi.minutes} min`} hint={sample ? "Sample figure" : `${totalStudyMinutes(state)} min all-time`} />
        <StatCard label="Study streak" icon={Flame} value={`${kpi.streak} d`} hint="Consecutive days" />
        <StatCard label="Words learned" icon={BookA} value={kpi.words} hint={sample ? "Sample figure" : `of ${vocabularyFile.words.length}`} />
      </div>

      {showTable ? (
        <Card>
          <CardHeader><CardTitle>Data table</CardTitle>{badge}</CardHeader>
          <CardContent className="space-y-6 overflow-x-auto text-[13px]">
            <table className="w-full min-w-[420px] text-left">
              <thead className="text-[11.5px] uppercase tracking-[0.1em] text-subtle"><tr><th className="py-2">Skill</th><th>Initial</th><th>Current</th><th>Change</th></tr></thead>
              <tbody className="divide-y divide-line">
                {skills.map((s) => (
                  <tr key={s.skill}><td className="py-2">{s.skill}</td><td className="tabular">{s.initial}%</td><td className="tabular">{s.current}%</td><td className="tabular">{s.current - s.initial >= 0 ? "+" : ""}{s.current - s.initial}</td></tr>
                ))}
                {!skills.length && <tr><td colSpan={4} className="py-3 text-subtle">No assessment data.</td></tr>}
              </tbody>
            </table>
            <table className="w-full min-w-[420px] text-left">
              <thead className="text-[11.5px] uppercase tracking-[0.1em] text-subtle"><tr><th className="py-2">Day</th><th>Minutes</th></tr></thead>
              <tbody className="divide-y divide-line">
                {weekly.map((d) => <tr key={d.day}><td className="py-2">{d.day}</td><td className="tabular">{d.minutes}</td></tr>)}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Weekly activity</CardTitle>
                  <CardDescription>Minutes from completed daily-plan blocks</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {badge}
                  {!sample && <Tabs size="sm" value={range} onChange={setRange} items={[{ value: "week", label: "7d" }, { value: "all", label: "30d" }]} />}
                </div>
              </CardHeader>
              <CardContent>
                {hasWeekly || sample ? (
                  <ColumnChart data={range === "all" && !sample ? allTime : weekly} x="day" y="minutes" name="Study time" unit=" min" />
                ) : (
                  <NoData text="Complete blocks in your daily plan to build this chart." href="/daily-plan" cta="Open daily plan" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Skill development</CardTitle>
                  <CardDescription>First vs most recent assessment, % correct</CardDescription>
                </div>
                {badge}
              </CardHeader>
              <CardContent className="space-y-3">
                {skills.length ? (
                  <>
                    <Legend items={[{ label: "Initial", color: CHART.baseline }, { label: "Current", color: CHART.accent }]} />
                    <CompareBars data={skills} category="skill" a="initial" b="current" aName="Initial" bName="Current" />
                  </>
                ) : (
                  <NoData text="Take the Initial Assessment, then a later one, to compare." href="/assessments" cta="Go to assessments" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Grammar progress</CardTitle>
                  <CardDescription>Accuracy by topic</CardDescription>
                </div>
                {badge}
              </CardHeader>
              <CardContent>
                {topics.length ? <RankedBars unit="%" data={topics.map((t) => ({ label: t.topic, value: t.mastery }))} /> : <NoData text="Grammar accuracy appears after an assessment." />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Vocabulary progress</CardTitle>
                  <CardDescription>Cumulative words learned</CardDescription>
                </div>
                {badge}
              </CardHeader>
              <CardContent>
                {growth.some((g) => g.words > 0) ? (
                  <GrowthArea data={growth} x="week" y="words" name="Words learned" height={200} />
                ) : (
                  <NoData text="Mark words as learned in flashcard reviews." href="/vocabulary" cta="Review words" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Mistake statistics</CardTitle>
                  <CardDescription>Most frequent error areas</CardDescription>
                </div>
                {badge}
              </CardHeader>
              <CardContent>
                {mistakes.length ? (
                  <RankedBars data={mistakes.slice(0, 6).map((m) => ({ label: m.category.replace(/-/g, " "), value: m.count }))} />
                ) : (
                  <NoData text="Mistakes from assessments are grouped here." />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Assessment history</CardTitle>
                <CardDescription>Overall score per attempt</CardDescription>
              </div>
              {badge}
            </CardHeader>
            <CardContent>
              {history.length >= 2 ? (
                <TrendLine data={history} x="date" y="score" name="Score" unit="%" domain={[0, 100]} />
              ) : history.length === 1 ? (
                <div className="flex items-center gap-4 rounded-md border border-line bg-surface p-4 text-[13px]">
                  <ClipboardList className="size-5 text-accent-soft" />
                  <span>
                    Baseline recorded: <strong className="tabular font-medium">{history[0].score}%</strong> on {history[0].date}. Take the 14-Day Progress Assessment to see a trend.
                  </span>
                </div>
              ) : (
                <NoData text="Your assessment scores will be plotted over time." href="/assessments" cta="Start initial assessment" />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!sample && (
        <p className="flex items-center gap-2 text-[12px] text-subtle">
          <GraduationCap className="size-3.5" /> Data stored locally in this browser. Connect Supabase to sync across devices.
        </p>
      )}
    </div>
  );
}
