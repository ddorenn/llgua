"use client";

import * as React from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { PracticeQuestion } from "@/lib/content";
import type { PracticeResult } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Answer = number | boolean;

function isCorrect(q: PracticeQuestion, a: Answer | undefined) {
  return a !== undefined && a === q.answer;
}

/** Renders comprehension questions, validates completion, scores and shows results. */
export function QuestionSet({
  questions,
  previous,
  onSubmit,
}: {
  questions: PracticeQuestion[];
  previous?: PracticeResult;
  onSubmit: (result: PracticeResult) => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, Answer>>(previous?.answers ?? {});
  const [submitted, setSubmitted] = React.useState(Boolean(previous));
  const [error, setError] = React.useState<string>();

  const score = questions.filter((q) => isCorrect(q, answers[q.id])).length;
  const unanswered = questions.filter((q) => answers[q.id] === undefined).length;

  function submit() {
    if (unanswered) return setError(`Answer all questions — ${unanswered} left.`);
    setError(undefined);
    setSubmitted(true);
    onSubmit({ answers, score, total: questions.length, completedAt: new Date().toISOString() });
  }

  function option(q: PracticeQuestion, value: Answer, label: string) {
    const selected = answers[q.id] === value;
    const correct = submitted && q.answer === value;
    const wrong = submitted && selected && q.answer !== value;
    return (
      <button
        key={String(value)}
        type="button"
        disabled={submitted}
        aria-pressed={selected}
        onClick={() => {
          setAnswers((a) => ({ ...a, [q.id]: value }));
          setError(undefined);
        }}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[13.5px] transition-colors disabled:cursor-default",
          correct ? "border-success/50 bg-success/10 text-fg"
          : wrong ? "border-danger/50 bg-danger/10 text-fg"
          : selected ? "border-accent/70 bg-accent-muted text-fg"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
        )}
      >
        <span>{label}</span>
        {correct && <Check className="size-4 shrink-0 text-success" />}
        {wrong && <X className="size-4 shrink-0 text-danger" />}
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {submitted && (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border px-4 py-3",
            score === questions.length ? "border-success/30 bg-success/[0.07]" : "border-line bg-surface",
          )}
          role="status"
        >
          <div>
            <div className="text-[12px] uppercase tracking-[0.12em] text-muted">Result</div>
            <div className="tabular text-[22px] font-semibold">
              {score} / {questions.length}
              <span className="ml-2 text-[14px] font-normal text-muted">{Math.round((score / questions.length) * 100)}%</span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
          >
            <RotateCcw /> Try again
          </Button>
        </div>
      )}

      {questions.map((q, i) => (
        <fieldset key={q.id}>
          <legend className="mb-2 text-[14px] text-fg">
            <span className="tabular mr-2 text-subtle">{i + 1}.</span>
            {q.prompt}
            {q.type === "truefalse" && <span className="ml-2 text-[12px] text-subtle">True or false?</span>}
          </legend>
          <div className={cn("grid gap-2", q.type === "truefalse" ? "grid-cols-2" : "sm:grid-cols-2")}>
            {q.type === "mcq" ? q.options.map((o, oi) => option(q, oi, o)) : [option(q, true, "True"), option(q, false, "False")]}
          </div>
        </fieldset>
      ))}

      {!submitted && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button onClick={submit}>Submit answers</Button>
          {error ? <span role="alert" className="text-[12.5px] text-danger">{error}</span> : <span className="text-[12px] text-subtle">{questions.length - unanswered}/{questions.length} answered</span>}
        </div>
      )}
    </div>
  );
}
