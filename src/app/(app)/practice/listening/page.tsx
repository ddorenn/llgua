"use client";

import * as React from "react";
import { Eye, EyeOff, Headphones, Pause, Play, RotateCcw } from "lucide-react";
import { listeningFile, type ListeningExercise } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { speak, stopSpeaking, ttsSupported } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { PageHeader, Notice } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { ExercisePicker } from "@/components/practice/exercise-picker";
import { QuestionSet } from "@/components/practice/question-set";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";

const BARS = Array.from({ length: 48 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

function AudioPanel({ ex }: { ex: ListeningExercise }) {
  const [playing, setPlaying] = React.useState(false);
  const [rate, setRate] = React.useState("0.9");
  const [plays, setPlays] = React.useState(0);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    setSupported(ttsSupported());
    return () => stopSpeaking();
  }, []);
  React.useEffect(() => {
    stopSpeaking();
    setPlaying(false);
    setPlays(0);
  }, [ex.id]);

  if (ex.audioUrl) {
    return <audio controls src={ex.audioUrl} className="w-full" preload="metadata" />;
  }

  function toggle() {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    // Strip speaker labels ("Barista:") for a more natural read-aloud.
    const text = ex.transcript.replace(/\b[A-Z][a-z]+:\s/g, "");
    if (speak(text, { rate: Number(rate), onEnd: () => setPlaying(false) })) {
      setPlaying(true);
      setPlays((p) => p + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
        <Button size="icon" className="size-12 shrink-0 rounded-full" onClick={toggle} disabled={!supported} aria-label={playing ? "Stop" : "Play"}>
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </Button>
        <div className="flex h-12 flex-1 items-center gap-[3px]" aria-hidden>
          {BARS.map((h, i) => (
            <span
              key={i}
              className={cn("w-full rounded-full transition-colors", playing ? "animate-pulse-dot bg-accent-soft" : "bg-line-strong")}
              style={{ height: `${h * 100}%`, animationDelay: `${(i % 8) * 0.12}s` }}
            />
          ))}
        </div>
        <span className="tabular hidden shrink-0 text-[12px] text-muted sm:inline">~{ex.durationSec ?? 60}s</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs size="sm" value={rate} onChange={setRate} items={[{ value: "0.75", label: "0.75×" }, { value: "0.9", label: "0.9×" }, { value: "1.05", label: "1×" }]} />
        <span className="text-[12px] text-subtle">Played {plays}×</span>
      </div>
      <Notice icon={Headphones} title="Audio placeholder" tone="warning">
        {supported
          ? "No recording has been added for this exercise yet, so your browser’s text-to-speech voice reads the script. Add an audioUrl in the content file to use real audio."
          : "Your browser does not support text-to-speech, and no recording has been added yet. Use the transcript for now."}
      </Notice>
    </div>
  );
}

export default function ListeningPage() {
  const { state, actions } = useStore();
  const exercises = listeningFile.exercises;
  const [id, setId] = React.useState(exercises[0].id);
  const [showScript, setShowScript] = React.useState(false);
  const ex = exercises.find((e) => e.id === id)!;
  const prev = state.listening[id];

  React.useEffect(() => setShowScript(false), [id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listening"
        description="Listen first without the transcript, answer the questions, then check the script."
        actions={listeningFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />
      <ExercisePicker
        value={id}
        onChange={setId}
        items={exercises.map((e) => ({ ...e, done: state.listening[e.id] ? `${state.listening[e.id].score}/${state.listening[e.id].total}` : undefined }))}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <Badge variant="accent" className="mb-2">Level {ex.level}</Badge>
                <CardTitle className="text-[20px] font-semibold">{ex.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AudioPanel ex={ex} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="items-center">
              <CardTitle>Transcript</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => setShowScript((s) => !s)} aria-expanded={showScript}>
                {showScript ? <EyeOff /> : <Eye />} {showScript ? "Hide" : "Show"}
              </Button>
            </CardHeader>
            <CardContent>
              {showScript ? (
                <div className="space-y-2 text-[14.5px] leading-relaxed">
                  {ex.transcript.split(/(?=\b[A-Z][a-z]+:\s)/).map((line, i) => {
                    const m = line.match(/^([A-Z][a-z]+):\s([\s\S]*)$/);
                    return (
                      <p key={i} className="text-fg/90">
                        {m ? <><span className="mr-2 font-medium text-accent-soft">{m[1]}</span>{m[2]}</> : line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-subtle">Hidden. Try answering first{prev ? "" : " — you can reveal it any time"}.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="self-start lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Headphones className="size-4 text-accent-soft" /> Questions</CardTitle>
            {prev && (
              <span className="flex items-center gap-1 text-[12px] text-subtle"><RotateCcw className="size-3" /> Last attempt saved</span>
            )}
          </CardHeader>
          <CardContent>
            <QuestionSet key={id} questions={ex.questions} previous={prev} onSubmit={(r) => actions.savePractice("listening", id, ex.title, r)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
