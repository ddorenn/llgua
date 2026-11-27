"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runTutorTask } from "@/lib/ai/client";
import { useStore } from "@/lib/store/store";
import type { TaskOutputOf } from "@/lib/ai/tasks";
import { cn } from "@/lib/utils";

/**
 * Contextual tutor actions inside a lesson. Not a chat window: each action is a specific role task
 * with a validated, structured answer. The server builds the learner model; in local/demo mode a small
 * snapshot of the browser state is sent instead.
 */
function useSnapshot() {
  const { state, syncMode } = useStore();
  return React.useMemo(() => {
    if (syncMode === "remote") return undefined;
    return {
      lessonSessions: state.lessonSessions ?? {},
      srsErrors: Object.values(state.srs ?? {})
        .filter((i) => i.kind === "error")
        .slice(0, 10)
        .map((i) => `${i.front} → ${i.back}`),
      teachingLanguage: state.settings.teachingLanguage,
    };
  }, [state.lessonSessions, state.srs, state.settings.teachingLanguage, syncMode]);
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
      className="mt-4 rounded-2xl border border-accent/30 bg-accent-muted/40 p-4"
    >
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium tracking-[0.1em] text-accent-soft uppercase">
        <Sparkles className="size-3.5" /> {title}
      </p>
      {children}
    </motion.div>
  );
}

function useTask<T>() {
  const [state, setState] = React.useState<{ busy: boolean; data: T | null; error: string | null }>({ busy: false, data: null, error: null });
  const run = async (task: string, payload: Record<string, unknown>, snapshot: unknown) => {
    setState({ busy: true, data: null, error: null });
    const r = await runTutorTask<T>(task, payload, snapshot);
    setState({ busy: false, data: r.ok ? r.data : null, error: r.ok ? null : r.error });
  };
  return { ...state, run };
}

/** Teacher: explain a mistake differently. */
export function TutorExplain({ lessonId, akey, answer }: { lessonId: string; akey: string; answer: string }) {
  const snapshot = useSnapshot();
  const t = useTask<TaskOutputOf<"explain_mistake">>();
  if (!t.data && !t.error)
    return (
      <button type="button" onClick={() => t.run("explain_mistake", { lessonId, key: akey, answer }, snapshot)} disabled={t.busy} className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] text-accent-soft hover:text-fg">
        {t.busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {t.busy ? "Наставник думает…" : "Объяснить по-другому"}
      </button>
    );
  if (t.error) return <p className="mt-3 text-[13px] text-subtle">{t.error}</p>;
  const d = t.data!;
  return (
    <Panel title="Наставник · объяснение">
      <p className="text-[14.5px] leading-relaxed text-fg">{d.explanation}</p>
      <p className="mt-2 text-[13.5px] text-muted">
        <span className="font-medium text-fg">Правило:</span> {d.rule}
      </p>
      <p className="lang mt-2 text-[15px] text-fg">{d.example.en}</p>
      {d.example.ru && <p className="text-[13px] text-subtle">{d.example.ru}</p>}
      <p className="mt-2 text-[13.5px] text-muted">Подсказка: {d.hint}</p>
    </Panel>
  );
}

const CRIT: Record<string, string> = { task: "Выполнение задачи", range: "Словарный запас и структуры", coherence: "Связность", accuracy: "Точность" };
const CONF: Record<string, string> = { low: "низкая", medium: "средняя", high: "высокая" };

/** Examiner: rubric-based feedback on the learner's text. Preliminary; never changes the level. */
export function WritingEvaluation({ lessonId, blockId, text, ai, saved, onResult }: { lessonId: string; blockId: string; text: string; ai: boolean; saved?: unknown; onResult: (d: unknown) => void }) {
  const snapshot = useSnapshot();
  const t = useTask<TaskOutputOf<"evaluate_writing">>();
  const data = (t.data ?? (saved as TaskOutputOf<"evaluate_writing"> | undefined)) ?? null;
  React.useEffect(() => {
    if (t.data) onResult(t.data);
  }, [t.data, onResult]);
  if (!ai)
    return <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-[13.5px] leading-relaxed text-muted">AI-проверка письма сейчас недоступна. Сверьтесь со списком «Проверьте себя» — текст сохранён и может быть оценён позже.</p>;
  if (!data)
    return (
      <div className="mt-4">
        <Button variant="secondary" onClick={() => t.run("evaluate_writing", { lessonId, blockId, text }, snapshot)} disabled={t.busy}>
          {t.busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {t.busy ? "Проверяем по рубрике…" : "Проверить с наставником"}
        </Button>
        {t.error && <p className="mt-2 text-[13px] text-subtle">{t.error}</p>}
      </div>
    );
  return (
    <Panel title="Экзаменатор · разбор по рубрике">
      <ul className="divide-y divide-line/60">
        {data.criteria.map((c) => (
          <li key={c.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
            <span className="w-[200px] shrink-0 text-[13.5px] text-muted">{CRIT[c.name]}</span>
            <span className="text-[13.5px] text-fg">
              <span className="font-medium">{c.level}</span> — {c.comment}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13.5px] text-muted">
        Ориентир по тексту: <span className="font-medium text-fg">{data.estimated_level}</span> · уверенность {CONF[data.confidence]}. Это предварительная AI-оценка одного текста — она не меняет ваш уровень.
      </p>
      {data.strengths.length > 0 && <p className="mt-3 text-[14px] text-fg">Получилось: {data.strengths.join("; ")}</p>}
      {data.corrections.length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.corrections.map((c, i) => (
            <li key={i} className="rounded-xl bg-card px-3 py-2 text-[14px]">
              <span className="lang text-subtle line-through">{c.original}</span> → <span className="lang text-fg">{c.corrected}</span>
              <span className="block text-[13px] text-muted">{c.why}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[13.5px] text-muted">Следующий шаг: {data.next_step}</p>
    </Panel>
  );
}

/** Speaking Partner: short free practice after the scripted dialogue (text, turn-limited). */
export function FreeDialogue({ lessonId, blockId, partner, ai }: { lessonId: string; blockId: string; partner: string; ai: boolean }) {
  const snapshot = useSnapshot();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; content: string; correction?: { original: string; better: string; why: string } | null }[]>([]);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [goal, setGoal] = React.useState(false);
  if (!ai) return null;
  const send = async () => {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setText("");
    setBusy(true);
    setError(null);
    const r = await runTutorTask<TaskOutputOf<"dialogue_turn">>("dialogue_turn", { lessonId, blockId, messages: next.map(({ role, content }) => ({ role, content })) }, snapshot);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setMessages([...next.slice(0, -1), { ...next[next.length - 1], correction: r.data.correction ?? null }, { role: "assistant", content: r.data.reply }]);
    if (r.data.goal_reached) setGoal(true);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 border-t border-line pt-6">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-fg">Свободная практика с {partner}</p>
            <p className="text-[13px] text-subtle">Тот же сценарий, но без готовых реплик. До 10 ответов, текстом.</p>
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Sparkles /> Начать
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[13px] text-subtle">Пишите по-английски. Собеседник поправит только то, что мешает пониманию.</p>
          <div className="space-y-2.5">
            {messages.length === 0 && <p className="lang rounded-2xl rounded-tl-md border border-line bg-card px-4 py-2.5 text-[16px] text-fg">Hi! So, what are your plans for the weekend?</p>}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <p className={cn("lang max-w-[88%] rounded-2xl px-4 py-2.5 text-[16px]", m.role === "user" ? "rounded-tr-md bg-primary text-on-primary" : "rounded-tl-md border border-line bg-card text-fg")}>{m.content}</p>
                {m.correction && (
                  <p className="mt-1 max-w-[88%] text-right text-[13px] text-muted">
                    <span className="lang text-fg">{m.correction.better}</span> — {m.correction.why}
                  </p>
                )}
              </div>
            ))}
            {busy && <p className="text-[13px] text-subtle">{partner} печатает…</p>}
          </div>
          {goal && <p className="mt-3 text-[13.5px] text-success">Цель диалога достигнута.</p>}
          {error && <p className="mt-3 text-[13px] text-subtle">{error}</p>}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} lang="en" aria-label="Реплика" className="lang h-11 flex-1 rounded-xl border border-line bg-card px-4 text-[16px] text-fg outline-none focus:border-accent" />
            <Button type="submit" disabled={!text.trim() || busy}>
              <ArrowRight />
            </Button>
          </form>
        </div>
      )}
    </motion.div>
  );
}

/** Planner: what to do next, from the learner's data. */
export function NextPlan({ ai }: { ai: boolean }) {
  const snapshot = useSnapshot();
  const t = useTask<TaskOutputOf<"plan_next">>();
  if (!ai) return null;
  if (!t.data)
    return (
      <div>
        <Button variant="ghost" onClick={() => t.run("plan_next", {}, snapshot)} disabled={t.busy}>
          {t.busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {t.busy ? "Планируем…" : "Что делать на следующем занятии?"}
        </Button>
        {t.error && <p className="mt-2 text-[13px] text-subtle">{t.error}</p>}
      </div>
    );
  return (
    <Panel title="Планировщик · следующее занятие">
      <p className="text-[14px] text-fg">Фокус: {t.data.focus.join("; ")}</p>
      <ol className="mt-2 space-y-1.5">
        {t.data.next_steps.map((s, i) => (
          <li key={i} className="text-[13.5px] text-muted">
            <span className="tabular text-fg">{s.minutes} мин</span> · <span className="text-fg">{s.title}</span> — {s.why}
          </li>
        ))}
      </ol>
      {t.data.note && <p className="mt-2 text-[13px] text-subtle">{t.data.note}</p>}
    </Panel>
  );
}
