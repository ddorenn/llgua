"use client";

import * as React from "react";
import { AlertCircle, Lightbulb, Mic, MessageSquareText, RotateCcw, Square, Trash2 } from "lucide-react";
import { getRubric, speakingFile } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { cn, plural } from "@/lib/utils";
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
      setError("Этот браузер не поддерживает запись.");
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
      setError("Нет доступа к микрофону или микрофон не найден.");
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
          aria-label={rec === "recording" ? "Остановить запись" : "Начать запись"}
          className={cn(
            "relative flex size-20 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:opacity-50",
            rec === "recording" ? "border-danger/50 bg-danger text-on-accent" : "border-accent-line bg-accent text-on-accent hover:bg-accent-hover",
          )}
        >
          {rec === "recording" ? <Square className="size-6 fill-current" /> : <Mic className="size-7" />}
        </button>
      </div>
      <div className="tabular font-mono text-[22px] text-fg" aria-live="polite">{mm}:{ss}</div>
      <p className="text-[13px] text-muted">
        {rec === "idle" && "Нажми, чтобы записать ответ"}
        {rec === "requesting" && "Ждём разрешения на микрофон…"}
        {rec === "recording" && "Идёт запись… нажми, чтобы остановить"}
        {rec === "recorded" && "Запись сохранена в этой вкладке. Прослушай её ниже."}
        {rec === "error" && "Запись недоступна"}
      </p>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-danger"><AlertCircle className="size-3.5" />{error}</p>
      )}
      {url && rec === "recorded" && (
        <div className="flex w-full items-center gap-2">
          <audio controls src={url} className="h-10 flex-1" />
          <Button variant="ghost" size="icon-sm" aria-label="Удалить запись" onClick={() => { URL.revokeObjectURL(url); setUrl(undefined); setRec("idle"); setSeconds(0); }}>
            <Trash2 />
          </Button>
        </div>
      )}
      {rec === "recorded" && (
        <Button variant="secondary" size="sm" onClick={start}><RotateCcw /> Записать снова</Button>
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
        title="Разговорная практика"
        description="Прочитай задание, подготовься минуту и запиши ответ. Прослушивание себя — один из самых быстрых способов прогресса."
        actions={speakingFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />
      <ExercisePicker
        value={id}
        onChange={setId}
        items={tasks.map((t) => ({ ...t, done: state.speaking[t.id]?.recordings ? `${state.speaking[t.id].recordings} ${plural(state.speaking[t.id].recordings, "запись", "записи", "записей")}` : undefined }))}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="accent">Уровень {task.level}</Badge>
                  <Badge variant="outline" className="capitalize">{task.type}</Badge>
                  <Badge variant="outline">{task.minutes} мин</Badge>
                </div>
                <CardTitle className="text-[20px] font-semibold">{task.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="lang text-[18px] leading-relaxed text-fg">{task.prompt}</p>
              {task.hints.length > 0 && (
                <div className="rounded-md border border-line bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted"><Lightbulb className="size-3.5" /> Полезные фразы</div>
                  <ul className="flex flex-wrap gap-2">
                    {task.hints.map((h) => (
                      <li key={h} className="lang rounded-md border border-line bg-card px-2.5 py-1 text-[14.5px] text-fg">{h}</li>
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
              <CardTitle className="flex items-center gap-2"><MessageSquareText className="size-4 text-accent-soft" /> Отзыв</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Notice icon={Mic} title="Автоматический анализ речи пока не подключён">
                Распознавание речи и оценка произношения появятся позже. Записи хранятся только в этой вкладке и никуда не отправляются.
              </Notice>
              <div>
                <Label htmlFor="sp-notes">Заметки для себя</Label>
                <Textarea
                  id="sp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => actions.saveSpeaking(id, { notes })}
                  placeholder="Что получилось? Какие слова или конструкции дались тяжело?"
                />
                <p className="mt-1.5 text-[11.5px] text-subtle">Сохраняется автоматически, когда выходишь из поля.</p>
              </div>
            </CardContent>
          </Card>
          {rubric && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{rubric.title}</CardTitle>
                  <p className="mt-1 text-[12px] text-subtle">Шкала {rubric.scale.min}–{rubric.scale.max}, для будущей проверки AI</p>
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
