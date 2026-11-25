"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { dailyPlan } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { last7Days, resolveBlock, todayProgress } from "@/lib/store/selectors";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page";
import { Button, buttonVariants } from "@/components/ui/button";

type BlockState = "completed" | "in_progress" | "upcoming";

interface TimerState {
  blockId: string;
  remaining: number;
  total: number;
  running: boolean;
}

const STATE_LABEL: Record<BlockState, string> = { completed: "Completed", in_progress: "In progress", upcoming: "Upcoming" };

function fmt(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function StateMark({ state }: { state: BlockState }) {
  if (state === "completed")
    return (
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        className="flex size-6 items-center justify-center rounded-full bg-accent text-on-accent"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </motion.span>
    );
  if (state === "in_progress")
    return (
      <span className="relative flex size-6 items-center justify-center rounded-full border-2 border-accent">
        <span className="size-2 rounded-full bg-accent" />
      </span>
    );
  return <span className="block size-6 rounded-full border-2 border-line-strong" />;
}

export default function DailyPlanPage() {
  const { state, actions } = useStore();
  const reduce = useReducedMotion();
  const today = todayProgress(state);
  const week = last7Days(state);
  const firstOpen = today.blocks.find((b) => !today.done.includes(b.id));
  const [timer, setTimer] = React.useState<TimerState | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | undefined>(firstOpen?.id);

  const selected = today.blocks.find((b) => b.id === (timer?.blockId ?? selectedId)) ?? firstOpen ?? today.blocks[0];
  const selectedR = resolveBlock(selected);
  const selectedDone = today.done.includes(selected.id);

  // Tick
  React.useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => {
      setTimer((t) => (t ? { ...t, remaining: Math.max(0, t.remaining - 1) } : t));
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  // Finish → mark done
  React.useEffect(() => {
    if (timer && timer.running && timer.remaining === 0) {
      const b = today.blocks.find((x) => x.id === timer.blockId);
      if (b && !today.done.includes(b.id)) actions.togglePlanBlock(b.id, resolveBlock(b).title);
      setTimer(null);
    }
  }, [timer, today.blocks, today.done, actions]);

  const blockState = (id: string): BlockState =>
    today.done.includes(id) ? "completed" : timer?.blockId === id ? "in_progress" : "upcoming";

  function start(id: string) {
    const b = today.blocks.find((x) => x.id === id)!;
    setSelectedId(id);
    setTimer((t) => (t && t.blockId === id ? { ...t, running: true } : { blockId: id, remaining: b.minutes * 60, total: b.minutes * 60, running: true }));
  }

  function complete(id: string, title: string) {
    if (!today.done.includes(id)) actions.togglePlanBlock(id, title);
    if (timer?.blockId === id) setTimer(null);
    const next = today.blocks.find((b) => b.id !== id && !today.done.includes(b.id));
    if (next) setSelectedId(next.id);
  }

  const activeTimer = timer && timer.blockId === selected.id ? timer : null;
  const remaining = activeTimer?.remaining ?? selected.minutes * 60;
  const total = activeTimer?.total ?? selected.minutes * 60;
  const elapsedPct = ((total - remaining) / total) * 100;
  const nextAfter = today.blocks.find((b) => b.id !== selected.id && !today.done.includes(b.id));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title="Daily plan"
        description={`${today.total} minutes in ${today.blocks.length} blocks. ${dailyPlan.title}.`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => { actions.resetPlanDay(); setTimer(null); }} disabled={!today.done.length}>
              <RotateCcw /> Reset today
            </Button>
            <Link href="/settings#goals" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Change duration
            </Link>
          </>
        }
      />

      {/* The hour, as a timeline */}
      <section aria-label="Today's hour">
        <div className="flex items-baseline justify-between text-[14px]">
          <span className="font-medium text-fg">
            {today.minutesDone} of {today.total} minutes
          </span>
          <span className="tabular text-muted">{today.percent}%</span>
        </div>
        <div className="mt-3 flex gap-1">
          {today.blocks.map((b) => {
            const st = blockState(b.id);
            const r = resolveBlock(b);
            const fill = st === "completed" ? 1 : st === "in_progress" && timer ? (timer.total - timer.remaining) / timer.total : 0;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                style={{ flexGrow: b.minutes, flexBasis: 0 }}
                className="group min-w-0 cursor-pointer text-left"
                aria-label={`${r.title}, ${b.minutes} minutes, ${STATE_LABEL[st]}`}
              >
                <span className="relative block h-3 overflow-hidden rounded-sm bg-elevated">
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-accent"
                    initial={false}
                    animate={{ width: `${fill * 100}%` }}
                    transition={{ duration: reduce ? 0 : 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                  />
                </span>
                <span className={cn("mt-2 hidden truncate text-[12.5px] sm:block", selected.id === b.id ? "font-semibold text-fg" : "text-muted group-hover:text-fg")}>{r.title}</span>
                <span className="tabular hidden text-[12px] text-subtle sm:block">{b.minutes} min</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        {/* Blocks */}
        <ol className="border-t border-line">
          {today.blocks.map((b) => {
            const r = resolveBlock(b);
            const st = blockState(b.id);
            const isSel = selected.id === b.id;
            return (
              <li
                key={b.id}
                className={cn(
                  "-mx-3 flex items-start gap-4 border-b border-line px-3 py-5 transition-colors sm:-mx-4 sm:px-4",
                  isSel && "rounded-md border-transparent bg-surface",
                )}
              >
                <button
                  type="button"
                  onClick={() => (st === "completed" ? actions.togglePlanBlock(b.id, r.title) : complete(b.id, r.title))}
                  aria-label={st === "completed" ? `Mark ${r.title} as not done` : `Mark ${r.title} as done`}
                  className="mt-0.5 shrink-0 cursor-pointer rounded-full"
                >
                  <StateMark state={st} />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => setSelectedId(b.id)} className="cursor-pointer text-left">
                    <span className={cn("text-[16px] font-semibold tracking-[-0.01em]", st === "completed" ? "text-muted" : "text-fg")}>{r.title}</span>
                  </button>
                  <p className="mt-1 max-w-[56ch] text-[14px] leading-relaxed text-muted">{b.description}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                    <span className={cn(st === "completed" ? "text-success" : st === "in_progress" ? "text-accent-soft" : "text-subtle")}>{STATE_LABEL[st]}</span>
                    <span className="tabular text-subtle">{b.minutes} min</span>
                    {r.alt.length > 0 && <span className="text-subtle">Tomorrow: {r.alt.map((a) => a.title).join(" or ")}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {r.href && (
                    <Link href={r.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Open
                    </Link>
                  )}
                  {st !== "completed" && (
                    <Button variant={st === "in_progress" ? "secondary" : "outline"} size="sm" onClick={() => start(b.id)}>
                      <Play /> {st === "in_progress" ? "Resume" : "Start"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Timer */}
        <aside className="order-first lg:order-none lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-line bg-card p-6 shadow-lift">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-medium text-fg">{selectedR.title}</span>
              <span className={cn("text-[13px]", selectedDone ? "text-success" : activeTimer ? "text-accent-soft" : "text-subtle")}>
                {selectedDone ? "Completed" : activeTimer ? (activeTimer.running ? "In progress" : "Paused") : "Not started"}
              </span>
            </div>
            <div className="tabular mt-6 text-[64px] font-semibold leading-none tracking-[-0.04em] text-fg" aria-live="polite" aria-label={`${Math.ceil(remaining / 60)} minutes left`}>
              {selectedDone ? "Done" : fmt(remaining)}
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-elevated">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={false}
                animate={{ width: `${selectedDone ? 100 : elapsedPct}%` }}
                transition={{ duration: reduce ? 0 : 0.9, ease: "linear" }}
              />
            </div>
            <div className="tabular mt-2 flex justify-between text-[12.5px] text-subtle">
              <span>{fmt(total - remaining)}</span>
              <span>{selected.minutes} min</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {selectedDone ? (
                <Button variant="secondary" onClick={() => actions.togglePlanBlock(selected.id, selectedR.title)}>
                  <RotateCcw /> Mark as not done
                </Button>
              ) : (
                <>
                  {activeTimer?.running ? (
                    <Button onClick={() => setTimer((t) => (t ? { ...t, running: false } : t))}>
                      <Pause /> Pause
                    </Button>
                  ) : (
                    <Button onClick={() => start(selected.id)}>
                      <Play /> {activeTimer ? "Resume" : "Start block"}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => complete(selected.id, selectedR.title)}>
                    <Check /> Mark done
                  </Button>
                  {activeTimer && (
                    <Button variant="ghost" size="icon" aria-label="Reset timer" onClick={() => setTimer(null)}>
                      <RotateCcw />
                    </Button>
                  )}
                </>
              )}
            </div>

            <AnimatePresence initial={false}>
              {nextAfter && (
                <motion.p key={nextAfter.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 border-t border-line pt-4 text-[13.5px] text-muted">
                  After this: <span className="text-fg">{resolveBlock(nextAfter).title}</span>, {nextAfter.minutes} min
                </motion.p>
              )}
            </AnimatePresence>
            <p className="mt-3 text-[12.5px] text-subtle">The block is marked done when the timer reaches zero.</p>
          </div>

          <div className="mt-8">
            <h2 className="text-[14px] font-medium text-fg">Last 7 days</h2>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {week.map((d) => {
                const ratio = Math.min(1, d.minutes / today.total);
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1.5" title={`${d.date}: ${d.minutes} min`}>
                    <div className="flex h-14 w-full items-end overflow-hidden rounded-sm bg-elevated">
                      <div className="w-full bg-accent transition-[height] duration-500" style={{ height: `${ratio * 100}%` }} />
                    </div>
                    <span className="text-[11.5px] text-subtle">{d.day.slice(0, 2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
