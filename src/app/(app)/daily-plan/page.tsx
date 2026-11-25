"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Pause, Play, RotateCcw, Settings2, Timer } from "lucide-react";
import { dailyPlan } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { last7Days, resolveBlock, todayProgress } from "@/lib/store/selectors";
import { cn } from "@/lib/utils";
import { PageHeader, SKILL_LABEL } from "@/components/shared/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress";

function FocusTimer({ blockTitle, minutes, onFinish }: { blockTitle: string; minutes: number; onFinish: () => void }) {
  const [remaining, setRemaining] = React.useState(minutes * 60);
  const [running, setRunning] = React.useState(false);
  const finishRef = React.useRef(onFinish);
  finishRef.current = onFinish;

  React.useEffect(() => {
    setRemaining(minutes * 60);
    setRunning(false);
  }, [minutes, blockTitle]);

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          finishRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pctDone = 100 - Math.round((remaining / (minutes * 60)) * 100);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Timer className="size-4 text-accent-soft" /> Focus timer
          </CardTitle>
          <CardDescription>{blockTitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5">
        <ProgressRing value={pctDone} size={148} stroke={6}>
          <span className="tabular font-mono text-[32px] font-medium tracking-tight" aria-live="polite">
            {mm}:{ss}
          </span>
        </ProgressRing>
        <div className="flex gap-2">
          <Button onClick={() => setRunning((r) => !r)} disabled={remaining === 0}>
            {running ? <><Pause /> Pause</> : <><Play /> {remaining === minutes * 60 ? "Start" : "Resume"}</>}
          </Button>
          <Button variant="secondary" size="icon" aria-label="Reset timer" onClick={() => { setRunning(false); setRemaining(minutes * 60); }}>
            <RotateCcw />
          </Button>
        </div>
        <p className="text-center text-[12px] text-subtle">When the timer ends the block is marked as done.</p>
      </CardContent>
    </Card>
  );
}

export default function DailyPlanPage() {
  const { state, actions } = useStore();
  const today = todayProgress(state);
  const week = last7Days(state);
  const firstOpen = today.blocks.find((b) => !today.done.includes(b.id)) ?? today.blocks[0];
  const [focusId, setFocusId] = React.useState(firstOpen.id);
  const focus = resolveBlock(today.blocks.find((b) => b.id === focusId) ?? firstOpen);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Daily Plan"
        description={`${dailyPlan.title}: ${today.total} minutes across ${today.blocks.length} focused blocks. Tick blocks off as you go.`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => actions.resetPlanDay()} disabled={!today.done.length}>
              <RotateCcw /> Reset today
            </Button>
            <Link href="/settings#goals" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Settings2 /> Adjust duration
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="items-center">
            <div>
              <CardTitle>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</CardTitle>
              <CardDescription>
                {today.minutesDone} of {today.total} minutes · {today.done.length}/{today.blocks.length} blocks
              </CardDescription>
            </div>
            <ProgressRing value={today.percent} size={56} stroke={5}>
              <span className="tabular text-[13px] font-semibold">{today.percent}%</span>
            </ProgressRing>
          </CardHeader>
          <CardContent>
            {/* proportional timeline */}
            <div className="mb-6 flex h-2 gap-[2px] overflow-hidden rounded-full" aria-hidden>
              {today.blocks.map((b) => (
                <div
                  key={b.id}
                  className={cn("h-full transition-colors duration-300", today.done.includes(b.id) ? "bg-accent" : "bg-elevated")}
                  style={{ flexGrow: b.minutes }}
                />
              ))}
            </div>

            <ol className="space-y-2">
              {today.blocks.map((b, i) => {
                const r = resolveBlock(b);
                const done = today.done.includes(b.id);
                const isFocus = focusId === b.id;
                return (
                  <li
                    key={b.id}
                    className={cn(
                      "flex flex-wrap items-start gap-x-4 gap-y-3 rounded-lg border p-4 transition-colors sm:flex-nowrap",
                      done ? "border-line bg-surface/60" : isFocus ? "border-accent/50 bg-accent-muted/40" : "border-line bg-surface",
                    )}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={`Mark ${r.title} ${done ? "not done" : "done"}`}
                      onClick={() => actions.togglePlanBlock(b.id, r.title)}
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
                        done ? "border-accent bg-accent text-white" : "border-line-strong text-subtle hover:border-accent/60",
                      )}
                    >
                      {done ? <Check className="size-4" strokeWidth={3} /> : <span className="tabular text-[11px]">{i + 1}</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className={cn("text-[15px] font-medium", done && "text-muted line-through decoration-subtle")}>{r.title}</span>
                        <span className="tabular text-[12px] text-subtle">{b.minutes} min</span>
                        {b.rotation && (
                          <span className="text-[11px] text-subtle">
                            {SKILL_LABEL[b.skill]} · tomorrow: {r.alt.map((a) => a.title).join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{b.description}</p>
                    </div>
                    <div className="ml-11 flex w-full shrink-0 items-center gap-1.5 sm:ml-0 sm:w-auto">
                      {!done && (
                        <Button variant={isFocus ? "secondary" : "ghost"} size="sm" onClick={() => setFocusId(b.id)} aria-label={`Focus on ${r.title}`}>
                          <Timer /> <span>Focus</span>
                        </Button>
                      )}
                      {r.href && (
                        <Link href={r.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Open <ArrowUpRight />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <FocusTimer
            blockTitle={`${focus.title} · ${focus.minutes} min`}
            minutes={focus.minutes}
            onFinish={() => {
              if (!today.done.includes(focus.id)) actions.togglePlanBlock(focus.id, focus.title);
            }}
          />
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Last 7 days</CardTitle>
                <CardDescription>Minutes from completed blocks</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5">
                {week.map((d) => {
                  const ratio = Math.min(1, d.minutes / today.total);
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1.5" title={`${d.date}: ${d.minutes} min`}>
                      <div className="flex h-20 w-full items-end overflow-hidden rounded-[4px] bg-elevated">
                        <div className="w-full rounded-t-[4px] bg-accent transition-[height] duration-500" style={{ height: `${ratio * 100}%` }} />
                      </div>
                      <span className="text-[10.5px] text-subtle">{d.day.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-subtle">
                The plan structure lives in <code className="font-mono text-muted">content/daily-plan/default.json</code>. Duration scales
                proportionally from Settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
