"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, ShieldAlert, X } from "lucide-react";
import { getAssessment, type AssessmentQuestion } from "@/lib/content";
import { gradeAssessment, isCorrect, type AnswerValue } from "@/lib/assessment";
import { useStore } from "@/lib/store/store";
import type { AssessmentResult } from "@/lib/store/types";
import { cn, pct } from "@/lib/utils";
import { Notice, SKILL_LABEL } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface FlatQ {
  q: AssessmentQuestion;
  sectionTitle: string;
  skill: string;
  passage?: string;
}

export function AssessmentRunner({ id }: { id: string }) {
  const assessment = getAssessment(id)!;
  const { actions } = useStore();
  const router = useRouter();
  const flat: FlatQ[] = React.useMemo(
    () => assessment.sections.flatMap((s) => s.questions.map((q) => ({ q, sectionTitle: s.title, skill: s.skill, passage: s.passage }))),
    [assessment],
  );
  const [phase, setPhase] = React.useState<"intro" | "run" | "result">("intro");
  const [i, setI] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, AnswerValue>>({});
  const [result, setResult] = React.useState<AssessmentResult | null>(null);
  const [confirmExit, setConfirmExit] = React.useState(false);

  const cur = flat[i];
  const answered = cur ? answers[cur.q.id] !== undefined && answers[cur.q.id] !== "" : false;
  const answeredCount = flat.filter((f) => answers[f.q.id] !== undefined && answers[f.q.id] !== "").length;

  function finish() {
    const r = gradeAssessment(assessment, answers);
    actions.saveAssessment(r);
    setResult(r);
    setPhase("result");
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/assessments" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="size-3.5" /> Assessments
        </Link>
        <Card>
          <CardContent className="space-y-6 p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent" className="capitalize">{assessment.type}</Badge>
              {assessment.meta.sample && <SampleBadge kind="content" />}
            </div>
            <div>
              <h1 className="text-[26px] font-semibold tracking-[-0.025em]">{assessment.title}</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{assessment.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Questions", String(flat.length)],
                ["Time", `~${assessment.minutes} min`],
                ["Sections", String(assessment.sections.length)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-line bg-surface px-3 py-3">
                  <div className="text-[11.5px] text-subtle">{k}</div>
                  <div className="tabular mt-1 text-[16px] sm:text-[18px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-2 text-[13.5px] text-muted">
              {assessment.sections.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-line pb-2 last:border-0">
                  <span className="text-fg/90">{s.title}</span>
                  <span className="tabular">{s.questions.length} questions</span>
                </li>
              ))}
            </ul>
            {!assessment.validated && (
              <Notice icon={ShieldAlert} title="Starting snapshot only" tone="warning">
                Scores are raw percentages on demonstration items. They are not a CEFR placement.
              </Notice>
            )}
            <Button size="lg" className="w-full" onClick={() => setPhase("run")}>
              Begin assessment <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-6 p-7">
            <div className="text-center">
              <p className="text-[13px] font-medium text-muted">{assessment.title}</p>
              <div className="tabular mt-3 text-[56px] font-semibold leading-none tracking-[-0.04em]">{pct(result.score, result.total)}%</div>
              <p className="mt-2 text-[14px] text-muted">{result.score} of {result.total} correct</p>
            </div>
            <div className="space-y-3">
              {Object.entries(result.bySkill).map(([skill, v]) => (
                <div key={skill}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span>{SKILL_LABEL[skill]}</span>
                    <span className="tabular text-muted">{v.score}/{v.total} · {pct(v.score, v.total)}%</span>
                  </div>
                  <Progress value={pct(v.score, v.total)} />
                </div>
              ))}
            </div>
            {!assessment.validated && (
              <Notice icon={ShieldAlert} title="This is not a CEFR level" tone="warning">
                Use this result to compare with your future attempts. If you know your approximate level, you can set it in Settings.
              </Notice>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-[15px] font-medium">Review answers</h2>
            <ol className="space-y-3">
              {flat.map(({ q }, idx) => {
                const ok = isCorrect(q, answers[q.id]);
                const given = answers[q.id];
                const correct = q.type === "mcq" ? q.options[q.answer] : q.accepted[0];
                const givenText = q.type === "mcq" ? (typeof given === "number" ? q.options[given] : "—") : String(given ?? "—");
                return (
                  <li key={q.id} className="flex gap-3 rounded-md border border-line bg-surface px-3.5 py-3 text-[13.5px]">
                    <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                      {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-fg/90"><span className="tabular mr-1.5 text-subtle">{idx + 1}.</span>{q.prompt}</div>
                      {!ok && (
                        <div className="mt-1 text-[12.5px]">
                          <span className="text-danger">{givenText}</span>
                          <span className="mx-1.5 text-subtle">→</span>
                          <span className="text-success">{correct}</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/assessments" className={buttonVariants({ variant: "secondary" })}>All assessments</Link>
          <Link href="/progress" className={buttonVariants()}>View progress</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        {confirmExit ? (
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="text-muted">Leave? Answers will be lost.</span>
            <Button variant="danger" size="sm" onClick={() => router.push("/assessments")}>Leave</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmExit(false)}>Stay</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmExit(true)}>
            <X /> Exit
          </Button>
        )}
        <Progress value={((i + 1) / flat.length) * 100} />
        <span className="tabular shrink-0 text-[12px] text-muted">{i + 1} / {flat.length}</span>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{cur.sectionTitle}</Badge>
            <span className="flex items-center gap-1 text-[12px] text-subtle"><Clock className="size-3" /> {answeredCount}/{flat.length} answered</span>
          </div>
          {cur.passage && (
            <blockquote className="lang rounded-r-md border-l-2 border-accent bg-surface px-4 py-3 text-[17px] leading-relaxed text-fg">{cur.passage}</blockquote>
          )}
          <h2 className="lang text-[24px] leading-snug text-fg">{cur.q.prompt}</h2>

          {cur.q.type === "mcq" ? (
            <div className="grid gap-2">
              {cur.q.options.map((o, oi) => {
                const selected = answers[cur.q.id] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAnswers((a) => ({ ...a, [cur.q.id]: oi }))}
                    className={cn(
                      "lang flex h-12 cursor-pointer items-center gap-3 rounded-md border px-4 text-left text-[16.5px] transition-colors",
                      selected ? "border-accent-line bg-accent-muted text-fg" : "border-line bg-surface text-fg/85 hover:border-line-strong",
                    )}
                  >
                    <span className={cn("flex size-6 items-center justify-center rounded-full border font-sans text-[11.5px] font-medium", selected ? "border-accent bg-accent text-on-accent" : "border-line-strong text-subtle")}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {o}
                  </button>
                );
              })}
            </div>
          ) : (
            <Input
              autoFocus
              value={String(answers[cur.q.id] ?? "")}
              onChange={(e) => setAnswers((a) => ({ ...a, [cur.q.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !answered) return;
                if (i < flat.length - 1) setI(i + 1);
                else if (answeredCount === flat.length) finish();
              }}
              placeholder="Type your answer"
              aria-label="Your answer"
              className="lang h-12 text-[17px]"
            />
          )}

          <div className="flex items-center justify-between border-t border-line pt-5">
            <Button variant="ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
              <ArrowLeft /> Back
            </Button>
            {i < flat.length - 1 ? (
              <Button onClick={() => setI((x) => x + 1)} disabled={!answered}>
                Next <ArrowRight />
              </Button>
            ) : (
              <Button onClick={finish} disabled={answeredCount < flat.length}>
                Finish <Check />
              </Button>
            )}
          </div>
          {i === flat.length - 1 && answeredCount < flat.length && (
            <p className="text-right text-[12px] text-subtle">Answer all questions to finish ({flat.length - answeredCount} left).</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
