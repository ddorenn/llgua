"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardCheck, Clock, FileAudio, FileText, Inbox, MessageSquareText, RotateCcw, Send } from "lucide-react";
import { homeworkFile, type Homework } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { cn, countWords, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, Notice, SKILL_LABEL } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

function dueLabel(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return days <= 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due ${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
}

function Detail({ hw }: { hw: Homework }) {
  const { state, actions } = useStore();
  const submission = state.homework[hw.id];
  const sample = state.settings.samplePreview;
  const [text, setText] = React.useState(submission?.text ?? "");
  const [error, setError] = React.useState<string>();
  const words = countWords(text);

  React.useEffect(() => {
    setText(state.homework[hw.id]?.text ?? "");
    setError(undefined);
  }, [hw.id, state.homework]);

  function submit() {
    if (!text.trim()) return setError("Write your answer before submitting.");
    if (hw.minWords && words < hw.minWords) return setError(`Minimum ${hw.minWords} words — you have ${words}.`);
    setError(undefined);
    actions.submitHomework(hw.id, hw.title, text.trim());
  }

  return (
    <Card className="lg:sticky lg:top-20">
      <CardContent className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{hw.level}</Badge>
            <Badge variant="outline">{SKILL_LABEL[hw.skill]}</Badge>
            <Badge variant="outline">
              {hw.submission === "audio" ? <FileAudio /> : <FileText />} {hw.submission === "audio" ? "Audio" : "Text"}
            </Badge>
          </div>
          <h2 className="mt-3 text-[18px] font-semibold tracking-tight">{hw.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <CalendarClock className="size-3.5" /> {submission ? `Submitted ${formatDate(submission.submittedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : dueLabel(hw.dueInDays)}
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface px-4 py-3 text-[14px] leading-relaxed text-fg/90">{hw.instructions}</div>
        {hw.lessonId && (
          <Link href={`/learning/${hw.lessonId}`} className="inline-block text-[13px] text-accent-soft hover:text-fg">
            Review the related lesson →
          </Link>
        )}

        {hw.submission === "audio" && (
          <Notice icon={FileAudio} title="Audio submissions are coming soon">
            Recording upload will be added together with speech analysis. For now, write notes of what you said.
          </Notice>
        )}

        {!submission ? (
          <div>
            <Label htmlFor="hw-answer">Your answer</Label>
            <Textarea
              id="hw-answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={Boolean(error)}
              className="lang min-h-44 text-[16px]"
              placeholder="Write here…"
            />
            <div className="mt-1.5 flex items-center justify-between text-[12px] text-subtle">
              <FieldError>{error}</FieldError>
              <span className={cn("tabular ml-auto", hw.minWords && words >= hw.minWords && "text-success")}>
                {words}
                {hw.minWords ? ` / ${hw.minWords}+` : ""} words
              </span>
            </div>
            <Button className="mt-3" onClick={submit}>
              <Send /> Submit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[13px] font-medium text-muted">Your submission</div>
              <div className="whitespace-pre-wrap rounded-md border border-line bg-surface px-4 py-3 text-[14px] leading-relaxed text-fg/90">{submission.text}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => actions.withdrawHomework(hw.id)}>
              <RotateCcw /> Withdraw and edit
            </Button>
          </div>
        )}

        <div className="border-t border-line pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
              <MessageSquareText className="size-3.5" /> Feedback
            </div>
            {sample && hw.sampleFeedback && <SampleBadge />}
          </div>
          {sample && hw.sampleFeedback ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="tabular text-[28px] font-semibold">{hw.sampleFeedback.score}</span>
                <span className="text-[13px] text-muted">/ 100</span>
              </div>
              <p className="text-[13.5px] text-fg/90">{hw.sampleFeedback.summary}</p>
              {hw.sampleFeedback.corrections.map((c, i) => (
                <div key={i} className="rounded-md border border-line bg-surface p-3 text-[13px]">
                  <div className="text-danger line-through decoration-danger/50">{c.original}</div>
                  <div className="mt-1 text-success">{c.corrected}</div>
                  <div className="mt-1.5 text-muted">{c.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">
              {submission
                ? "Awaiting review. Automatic checking will be performed by the AI Examiner once an AI provider is connected."
                : "Feedback and a score will appear here after your submission is reviewed."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomeworkPage() {
  const { state } = useStore();
  const [tab, setTab] = React.useState<"pending" | "submitted">("pending");
  const all = homeworkFile.assignments;
  const pending = all.filter((h) => !state.homework[h.id]);
  const submitted = all.filter((h) => state.homework[h.id]);
  const list = tab === "pending" ? pending : submitted;
  const [selectedId, setSelectedId] = React.useState<string | undefined>(all[0]?.id);
  const selected = all.find((h) => h.id === selectedId) ?? list[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Homework"
        description="Assignments linked to your lessons. Submit text now; audio submissions are prepared for a later version."
        actions={homeworkFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Submitted", value: submitted.length, icon: CheckCircle2 },
          { label: "Reviewed", value: Object.values(state.homework).filter((h) => h.status === "reviewed").length, icon: ClipboardCheck },
        ].map((s) => (
          <div key={s.label} className="border-t border-line pt-3">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              <s.icon className="size-3.5 text-subtle" /> {s.label}
            </div>
            <div className="tabular mt-1 text-[26px] font-semibold tracking-[-0.03em]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "pending", label: "Pending", count: pending.length },
              { value: "submitted", label: "Completed", count: submitted.length },
            ]}
          />
          {list.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={tab === "pending" ? "All caught up" : "Nothing submitted yet"}
              description={tab === "pending" ? "You have no pending assignments." : "Submitted assignments will appear here."}
            />
          ) : (
            <ul className="space-y-2">
              {list.map((h) => {
                const active = selected?.id === h.id;
                const sub = state.homework[h.id];
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(h.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                        active ? "border-accent-line bg-accent-muted" : "border-line bg-card hover:border-line-strong",
                      )}
                    >
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", sub ? "bg-success" : h.dueInDays <= 1 ? "bg-warning" : "bg-line-strong")} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-fg">{h.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-subtle">
                          <span>{SKILL_LABEL[h.skill]}</span>·<span>{h.level}</span>·
                          <span>{sub ? "Submitted" : dueLabel(h.dueInDays)}</span>
                        </span>
                      </span>
                      <Badge variant={sub ? "success" : h.dueInDays <= 1 ? "warning" : "default"}>
                        {sub ? "Submitted" : h.dueInDays <= 1 ? "Due soon" : "Pending"}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {selected ? <Detail hw={selected} /> : null}
      </div>
    </div>
  );
}
