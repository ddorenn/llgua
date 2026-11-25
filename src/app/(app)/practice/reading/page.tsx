"use client";

import * as React from "react";
import { BookOpen, Type } from "lucide-react";
import { readingFile } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { ExercisePicker } from "@/components/practice/exercise-picker";
import { QuestionSet } from "@/components/practice/question-set";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReadingPage() {
  const { state, actions } = useStore();
  const exercises = readingFile.exercises;
  const [id, setId] = React.useState(exercises[0].id);
  const [large, setLarge] = React.useState(false);
  const ex = exercises.find((e) => e.id === id)!;
  const prev = state.reading[id];
  const words = ex.text.split(/\s+/).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reading"
        description="Read the text carefully, then answer the questions. Your best attempt is saved."
        actions={readingFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />
      <ExercisePicker
        value={id}
        onChange={setId}
        items={exercises.map((e) => ({ ...e, done: state.reading[e.id] ? `${state.reading[e.id].score}/${state.reading[e.id].total}` : undefined }))}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="items-center">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="accent">Level {ex.level}</Badge>
                <span className="text-[12px] text-subtle">{words} words · ~{Math.max(1, Math.round(words / 150))} min read</span>
              </div>
              <CardTitle className="text-[20px] font-semibold">{ex.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon-sm" aria-pressed={large} aria-label="Toggle large text" title="Text size" onClick={() => setLarge((l) => !l)}>
              <Type />
            </Button>
          </CardHeader>
          <CardContent>
            <article className={cn("space-y-4 font-[450] text-fg/90", large ? "text-[18px] leading-[1.85]" : "text-[15.5px] leading-[1.8]")}>
              {ex.text.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </article>
          </CardContent>
        </Card>
        <Card className="self-start lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-accent-soft" /> Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionSet key={id} questions={ex.questions} previous={prev} onSubmit={(r) => actions.savePractice("reading", id, ex.title, r)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
