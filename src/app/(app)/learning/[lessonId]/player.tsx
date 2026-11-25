"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Hourglass, Lightbulb, Lock, RotateCcw, Target, X } from "lucide-react";
import { allLessons, course, getLesson, getModule, type LessonBlock } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { lessonState } from "@/lib/learning";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, SKILL_LABEL } from "@/components/shared/page";
import { RichText } from "@/components/shared/rich-text";
import { SampleBadge } from "@/components/shared/sample";

type QuizBlock = Extract<LessonBlock, { type: "quiz" }>;

function Quiz({ block, onResult }: { block: QuizBlock; onResult: (score: number, total: number) => void }) {
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [checked, setChecked] = React.useState(false);
  const score = block.questions.filter((q) => answers[q.id] === q.answer).length;
  const allAnswered = block.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="space-y-5">
      {block.questions.map((q, qi) => (
        <fieldset key={q.id}>
          <legend className="lang mb-2.5 text-[17px] text-fg">
            <span className="tabular mr-2 text-subtle">{qi + 1}.</span>
            {q.prompt}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {q.options.map((opt, oi) => {
              const selected = answers[q.id] === oi;
              const correct = checked && oi === q.answer;
              const wrong = checked && selected && oi !== q.answer;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={checked}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  aria-pressed={selected}
                  className={cn(
                    "lang flex h-11 cursor-pointer items-center justify-between rounded-md border px-3 text-left text-[15.5px] transition-colors disabled:cursor-default",
                    correct ? "border-success/50 bg-success/10 text-fg"
                    : wrong ? "border-danger/50 bg-danger/10 text-fg"
                    : selected ? "border-accent-line bg-accent-muted text-fg"
                    : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  {opt}
                  {correct && <Check className="size-4 text-success" />}
                  {wrong && <X className="size-4 text-danger" />}
                </button>
              );
            })}
          </div>
          {checked && q.explanation && <RichText text={q.explanation} className="mt-2 text-[12.5px] text-muted" />}
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {!checked ? (
          <Button
            disabled={!allAnswered}
            onClick={() => {
              setChecked(true);
              onResult(score, block.questions.length);
            }}
          >
            Check answers
          </Button>
        ) : (
          <>
            <span className={cn("text-[14px] font-medium", score === block.questions.length ? "text-success" : "text-fg")}>
              {score} / {block.questions.length} correct
            </span>
            <Button variant="ghost" size="sm" onClick={() => { setAnswers({}); setChecked(false); }}>
              <RotateCcw /> Retry
            </Button>
          </>
        )}
        {!allAnswered && !checked && <span className="text-[12px] text-subtle">Answer every question to check.</span>}
      </div>
    </div>
  );
}

export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const { state, actions } = useStore();
  const lesson = getLesson(lessonId)!;
  const mod = getModule(lesson.moduleId)!;
  const ls = lessonState(state, lessonId);
  const [quiz, setQuiz] = React.useState<{ score: number; total: number } | null>(null);

  React.useEffect(() => {
    if (ls === "available") actions.startLesson(lessonId);
  }, [ls, lessonId, actions]);

  const idx = allLessons.findIndex((l) => l.id === lessonId);
  const next = allLessons.slice(idx + 1).find((l) => l.blocks.length > 0);
  const completed = ls === "completed";

  const header = (
    <div className="space-y-4">
      <Link href="/learning" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> My Learning
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{lesson.level}</Badge>
        <Badge variant="outline">{SKILL_LABEL[lesson.skill]}</Badge>
        <span className="text-[12px] text-subtle">{mod.title} · {lesson.minutes} min</span>
        {course.meta.sample && <SampleBadge kind="content" />}
      </div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em]">{lesson.title}</h1>
    </div>
  );

  if (ls === "locked" || ls === "pending") {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        {header}
        <EmptyState
          icon={ls === "locked" ? Lock : Hourglass}
          title={ls === "locked" ? "This lesson is locked" : "Lesson content pending"}
          description={ls === "locked" ? "Complete the previous lesson on your path to unlock it." : "This lesson is part of the planned structure. Its content will be added from your study materials."}
          action={<Link href="/learning" className={buttonVariants({ variant: "secondary", size: "sm" })}>Back to path</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {header}

      {lesson.objectives.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted">
              <Target className="size-3.5" /> Objectives
            </div>
            <ul className="space-y-1.5">
              {lesson.objectives.map((o) => (
                <li key={o} className="flex gap-2 text-[14px] text-fg/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent-soft" /> {o}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {lesson.blocks.map((b, i) => (
        <section key={i}>
          {b.type === "text" && (
            <>
              {b.title && <h2 className="mb-3 text-[16px] font-medium">{b.title}</h2>}
              <RichText text={b.body} className="max-w-[64ch] text-[16px] leading-[1.75] text-fg/90" />
            </>
          )}
          {b.type === "examples" && (
            <>
              {b.title && <h2 className="mb-3 text-[16px] font-medium">{b.title}</h2>}
              <div className="overflow-hidden rounded-lg border border-line">
                {b.items.map((ex, j) => (
                  <div key={j} className="grid gap-1 border-b border-line bg-card px-4 py-3 last:border-0 sm:grid-cols-2 sm:gap-6">
                    <span className="lang text-[17px] text-fg">{ex.en}</span>
                    {ex.ru && <span className="text-[14px] text-muted">{ex.ru}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
          {b.type === "tip" && (
            <div className="flex gap-3 rounded-lg border border-accent-line bg-accent-muted px-4 py-3.5 text-[14px] text-fg/90">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent-soft" />
              <RichText text={b.body} />
            </div>
          )}
          {b.type === "quiz" && (
            <Card>
              <CardContent>
                <h2 className="mb-4 text-[16px] font-medium">{b.title ?? "Practice"}</h2>
                <Quiz block={b} onResult={(score, total) => setQuiz({ score, total })} />
              </CardContent>
            </Card>
          )}
        </section>
      ))}

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        {completed ? (
          <div className="flex items-center gap-2 text-[14px] text-success">
            <CheckCircle2 className="size-4" /> Lesson completed
            {state.lessons[lessonId]?.total ? (
              <span className="text-muted">· quiz {state.lessons[lessonId]?.score}/{state.lessons[lessonId]?.total}</span>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Finished reading and practising? Mark the lesson complete to unlock the next one.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {completed ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => actions.resetLesson(lessonId)}>
                <RotateCcw /> Reset
              </Button>
              {next && (
                <Link href={`/learning/${next.id}`} className={buttonVariants({ size: "sm" })}>
                  Next lesson <ArrowRight />
                </Link>
              )}
            </>
          ) : (
            <Button onClick={() => actions.completeLesson(lessonId, lesson.title, quiz?.score, quiz?.total)}>
              <Check /> Mark complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
