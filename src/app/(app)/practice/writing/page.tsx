"use client";

import * as React from "react";
import { CheckCircle2, Clock, FileText, Send, Sparkles } from "lucide-react";
import { getRubric, writingFile } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { cn, countWords, formatDate } from "@/lib/utils";
import { PageHeader, Notice } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { ExercisePicker } from "@/components/practice/exercise-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function WritingPage() {
  const { state, actions } = useStore();
  const tasks = writingFile.tasks;
  const [id, setId] = React.useState(tasks[0].id);
  const task = tasks.find((t) => t.id === id)!;
  const entry = state.writing[id];
  const rubric = getRubric(task.rubricId);
  const [text, setText] = React.useState(entry?.draft ?? "");
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState<"idle" | "saving" | "saved">("idle");

  React.useEffect(() => {
    setText(state.writing[id]?.draft ?? "");
    setError(undefined);
    setSaved("idle");
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave of drafts.
  React.useEffect(() => {
    if (text === (state.writing[id]?.draft ?? "")) return;
    setSaved("saving");
    const t = setTimeout(() => {
      actions.saveWritingDraft(id, text);
      setSaved("saved");
    }, 700);
    return () => clearTimeout(t);
  }, [text, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const words = countWords(text);
  const ratio = Math.min(100, (words / task.minWords) * 100);
  const over = words > task.maxWords;
  const inRange = words >= task.minWords && !over;

  function submit() {
    if (words < task.minWords) return setError(`Write at least ${task.minWords} words (currently ${words}).`);
    if (over) return setError(`Keep it under ${task.maxWords} words (currently ${words}).`);
    setError(undefined);
    actions.submitWriting(id, task.title, text.trim());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Writing"
        description="Plan, write and submit. Drafts save automatically in your browser."
        actions={writingFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />
      <ExercisePicker
        value={id}
        onChange={setId}
        items={tasks.map((t) => ({ ...t, done: state.writing[t.id]?.submittedAt ? "Submitted" : undefined }))}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="accent">Level {task.level}</Badge>
                <Badge variant="outline" className="capitalize">{task.type}</Badge>
                <Badge variant="outline"><Clock /> {task.minutes} min</Badge>
              </div>
              <CardTitle className="text-[20px] font-semibold">{task.title}</CardTitle>
              <p className="mt-2 text-[14.5px] leading-relaxed text-fg/85">{task.instructions}</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Your text"
              aria-invalid={Boolean(error)}
              spellCheck
              placeholder="Start writing…"
              className="min-h-[340px] w-full flex-1 resize-y rounded-md border border-line bg-surface px-4 py-3.5 text-[15.5px] leading-[1.8] text-fg placeholder:text-subtle focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className={cn("tabular", over ? "text-danger" : inRange ? "text-success" : "text-muted")}>
                  {words} words · target {task.minWords}–{task.maxWords}
                </span>
                <span className="text-subtle">
                  {saved === "saving" ? "Saving…" : saved === "saved" ? "Draft saved" : entry?.updatedAt ? `Draft from ${formatDate(entry.updatedAt)}` : ""}
                </span>
              </div>
              <Progress value={ratio} barClassName={over ? "bg-danger" : inRange ? "bg-success" : undefined} label="Word target" />
            </div>
            <FieldError>{error}</FieldError>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={!text.trim()}>
                <Send /> {entry?.submittedAt ? "Resubmit" : "Submit"}
              </Button>
              {entry?.submittedAt && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-success">
                  <CheckCircle2 className="size-3.5" /> Submitted {formatDate(entry.submittedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-accent-soft" /> AI feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {entry?.submittedAt ? (
                <Notice icon={Sparkles} title="Submission received — awaiting AI review">
                  Automatic feedback (corrections, rubric scores, suggestions) will appear here once an AI provider is connected. Your text is saved.
                </Notice>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted">Submit your text to request feedback. The AI Examiner will evaluate it against the rubric below.</p>
              )}
            </CardContent>
          </Card>
          {rubric && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><FileText className="size-4 text-muted" /> {rubric.title}</CardTitle>
                  <p className="mt-1 text-[12px] text-subtle">Scale {rubric.scale.min}–{rubric.scale.max} per criterion · editable in content/rubrics</p>
                </div>
                {rubric.meta.sample && <SampleBadge kind="content" />}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {rubric.criteria.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-soft" />
                      <div>
                        <div className="text-[13.5px] font-medium">{c.title}</div>
                        <div className="text-[12.5px] text-muted">{c.description}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
