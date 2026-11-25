"use client";

import * as React from "react";
import { AlertCircle, Lightbulb, Mic, MessageSquareText, RotateCcw, Square, Trash2 } from "lucide-react";
import { getRubric, speakingFile } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { PageHeader, Notice } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { ExercisePicker } from "@/components/practice/exercise-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";

type RecState = "idle" | "requesting" | "recording" | "recorded" | "error";

/**
 * Local recorder using MediaRecorder. Audio stays in the browser (object URL) and is
 * NOT uploaded or analysed. Integration point: send `blob` to a speech-to-text /
 * pronunciation service (see docs/ARCHITECTURE.md → Speech).
 */
function Recorder({ taskId, onRecorded }: { taskId: string; onRecorded: () => void }) {
  const [rec, setRec] = React.useState<RecState>("idle");
  const [error, setError] = React.useState<string>();
  const [url, setUrl] = React.useState<string>();
  const [seconds, setSeconds] = React.useState(0);
  const mediaRef = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = React.useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
  }, []);

  React.useEffect(() => {
    setRec("idle");
    setUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return undefined;
    });
    setSeconds(0);
    return cleanup;
  }, [taskId, cleanup]);

  async function start() {
    setError(undefined);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRec("error");
      setError("Recording isn’t supported in this browser.");
      return;
    }
    setRec("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setUrl((u) => {
          if (u) URL.revokeObjectURL(u);
          return URL.createObjectURL(blob);
        });
        setRec("recorded");
        onRecorded();
        cleanup();
      };
      mediaRef.current = mr;
      mr.start();
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRec("recording");
    } catch {
      setRec("error");
      setError("Microphone access was denied or no microphone is available.");
      cleanup();
    }
  }

  function stop() {
    mediaRef.current?.stop();
    if (timer.current) clearInterval(timer.current);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="relative">
        {rec === "recording" && <span className="absolute inset-0 animate-ping rounded-full bg-danger/25" />}
        <button
          type="button"
          onClick={rec === "recording" ? stop : start}
          disabled={rec === "requesting"}
          aria-label={rec === "recording" ? "Stop recording" : "Start recording"}
          className={cn(
            "relative flex size-20 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:opacity-50",
            rec === "recording" ? "border-danger/50 bg-danger text-white" : "border-accent/40 bg-accent text-white hover:bg-accent-hover",
          )}
        >
          {rec === "recording" ? <Square className="size-6 fill-current" /> : <Mic className="size-7" />}
        </button>
      </div>
      <div className="tabular font-mono text-[22px] text-fg" aria-live="polite">{mm}:{ss}</div>
      <p className="text-[13px] text-muted">
        {rec === "idle" && "Tap to start recording your answer"}
        {rec === "requesting" && "Waiting for microphone permission…"}
        {rec === "recording" && "Recording… tap to stop"}
        {rec === "recorded" && "Recording saved in this browser tab. Listen back below."}
        {rec === "error" && "Recording unavailable"}
      </p>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-danger"><AlertCircle className="size-3.5" />{error}</p>
      )}
      {url && rec === "recorded" && (
        <div className="flex w-full items-center gap-2">
          <audio controls src={url} className="h-10 flex-1" />
          <Button variant="ghost" size="icon-sm" aria-label="Discard recording" onClick={() => { URL.revokeObjectURL(url); setUrl(undefined); setRec("idle"); setSeconds(0); }}>
            <Trash2 />
          </Button>
        </div>
      )}
      {rec === "recorded" && (
        <Button variant="secondary" size="sm" onClick={start}><RotateCcw /> Record again</Button>
      )}
    </div>
  );
}

export default function SpeakingPage() {
  const { state, actions } = useStore();
  const tasks = speakingFile.tasks;
  const [id, setId] = React.useState(tasks[0].id);
  const task = tasks.find((t) => t.id === id)!;
  const entry = state.speaking[id];
  const rubric = getRubric(task.rubricId);
  const [notes, setNotes] = React.useState(entry?.notes ?? "");

  React.useEffect(() => setNotes(state.speaking[id]?.notes ?? ""), [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <PageHeader
        title="Speaking"
        description="Read the prompt, prepare for a minute, then record yourself. Listening back is one of the fastest ways to improve."
        actions={speakingFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />
      <ExercisePicker
        value={id}
        onChange={setId}
        items={tasks.map((t) => ({ ...t, done: state.speaking[t.id]?.recordings ? `${state.speaking[t.id].recordings} take${state.speaking[t.id].recordings > 1 ? "s" : ""}` : undefined }))}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="accent">Level {task.level}</Badge>
                  <Badge variant="outline" className="capitalize">{task.type}</Badge>
                  <Badge variant="outline">{task.minutes} min</Badge>
                </div>
                <CardTitle className="text-[20px] font-semibold">{task.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[15.5px] leading-relaxed text-fg/90">{task.prompt}</p>
              {task.hints.length > 0 && (
                <div className="rounded-md border border-line bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-muted"><Lightbulb className="size-3.5" /> Useful language</div>
                  <ul className="flex flex-wrap gap-2">
                    {task.hints.map((h) => (
                      <li key={h} className="rounded-[5px] border border-line bg-card px-2 py-1 text-[13px] text-fg/90">{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Recorder taskId={id} onRecorded={() => actions.saveSpeaking(id, { recorded: true }, task.title)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquareText className="size-4 text-accent-soft" /> Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Notice icon={Mic} title="Automatic speaking analysis is not connected">
                Speech-to-text, pronunciation and fluency scoring will be added later. Recordings are kept only in this browser tab and are not uploaded.
              </Notice>
              <div>
                <Label htmlFor="sp-notes">Self-review notes</Label>
                <Textarea
                  id="sp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => actions.saveSpeaking(id, { notes })}
                  placeholder="What went well? Which words or structures were difficult?"
                />
                <p className="mt-1.5 text-[11.5px] text-subtle">Saved automatically when you leave the field.</p>
              </div>
            </CardContent>
          </Card>
          {rubric && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{rubric.title}</CardTitle>
                  <p className="mt-1 text-[12px] text-subtle">Scale {rubric.scale.min}–{rubric.scale.max} · used for future AI evaluation</p>
                </div>
                {rubric.meta.sample && <SampleBadge kind="content" />}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {rubric.criteria.map((c) => (
                    <li key={c.id}>
                      <div className="text-[13.5px] font-medium">{c.title}</div>
                      <div className="text-[12.5px] text-muted">{c.description}</div>
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
