"use client";

import * as React from "react";
import {
  ArrowUp, BookA, CalendarRange, ClipboardCheck, GraduationCap, Info, LineChart, Loader2, MessagesSquare, Mic, PlugZap, Sparkles, Trash2,
  type LucideIcon,
} from "lucide-react";
import { tutorModesFile, vocabularyFile } from "@/lib/content";
import { fetchAIStatus, sendTutorMessage } from "@/lib/ai/client";
import type { AIStatus, LearningContext } from "@/lib/ai/types";
import { useStore } from "@/lib/store/store";
import { lessonsCompleted, mistakeStats, studyStreak, vocabCounts } from "@/lib/store/selectors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Markdown } from "@/components/shared/markdown";
import { motion, useReducedMotion } from "motion/react";

const ICONS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  "clipboard-check": ClipboardCheck,
  "calendar-range": CalendarRange,
  "line-chart": LineChart,
  "messages-square": MessagesSquare,
  "book-a": BookA,
};

export default function TutorPage() {
  const { state, actions } = useStore();
  const reduce = useReducedMotion();
  const modes = tutorModesFile.modes;
  const [modeId, setModeId] = React.useState(modes[0].id);
  const mode = modes.find((m) => m.id === modeId)!;
  const ModeIcon = ICONS[mode.icon] ?? Sparkles;
  const messages = state.tutor[modeId] ?? [];

  const [status, setStatus] = React.useState<AIStatus | null>(null);
  const [statusError, setStatusError] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [shareStats, setShareStats] = React.useState(true);
  const [voiceNote, setVoiceNote] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    fetchAIStatus().then(setStatus).catch(() => setStatusError(true));
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending, modeId]);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const context: LearningContext = {
    level: state.settings.currentLevel,
    teachingLanguage: state.settings.teachingLanguage,
    dailyMinutes: state.settings.dailyMinutes,
    goal: state.settings.mainGoal,
    targetExam: state.settings.targetExam,
    stats: shareStats
      ? {
          lessonsCompleted: lessonsCompleted(state),
          wordsLearned: vocabCounts(state, vocabularyFile.words.length).learned,
          streak: studyStreak(state),
          weakAreas: mistakeStats(state).slice(0, 5).map((m) => m.category),
        }
      : undefined,
  };

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    actions.appendTutorMessage(modeId, { role: "user", content, kind: "chat" });

    if (!status?.configured) {
      actions.appendTutorMessage(modeId, {
        role: "system",
        kind: "notice",
        content: "Сообщение сохранено, но AI пока не подключён, поэтому ответа не будет.",
      });
      return;
    }

    setSending(true);
    const history = [...messages, { role: "user" as const, content, kind: "chat" as const }]
      .filter((m) => m.kind !== "notice" && (m.role === "user" || m.role === "assistant"))
      .slice(-30)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const result = await sendTutorMessage({ mode: modeId, messages: history, context });
    setSending(false);
    if (result.ok) actions.appendTutorMessage(modeId, { role: "assistant", content: result.text, kind: "chat" });
    else actions.appendTutorMessage(modeId, { role: "system", kind: "notice", content: result.error });
  }

  const connected = status?.configured;

  return (
    <div className="-mx-4 -mb-28 -mt-6 grid h-[calc(100dvh-56px-56px)] grid-cols-1 sm:-mx-6 lg:-mx-8 lg:-mb-12 lg:-mt-8 lg:h-[calc(100dvh-56px)] lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_300px]">
      {/* Modes */}
      <aside className="hidden flex-col border-r border-line bg-surface lg:flex">
        <div className="px-4 pb-2 pt-6 text-[13px] text-muted">Выбери роль</div>
        <div className="space-y-0.5 px-2">
          {modes.map((m) => {
            const Icon = ICONS[m.icon] ?? Sparkles;
            const active = m.id === modeId;
            const count = (state.tutor[m.id] ?? []).filter((x) => x.role === "user").length;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModeId(m.id)}
                aria-pressed={active}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
                  active ? "bg-card shadow-lift dark:bg-elevated" : "hover:bg-elevated/70",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-accent-soft" : "text-subtle")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13.5px] font-medium", active ? "text-fg" : "text-fg/80")}>{m.name}</span>
                  <span className="block truncate text-[12px] text-subtle">{m.short}</span>
                </span>
                {count > 0 && <span className="tabular mt-0.5 text-[11px] text-subtle">{count}</span>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent-soft">
            <ModeIcon className="size-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-medium">{mode.name}</h1>
              {status === null && !statusError ? (
                <Badge><Loader2 className="animate-spin" /> Проверяем</Badge>
              ) : connected ? (
                <Badge variant="success">Подключён</Badge>
              ) : (
                <Badge variant="warning"><PlugZap /> AI не подключён</Badge>
              )}
            </div>
            <p className="truncate text-[12px] text-muted">{mode.short}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Очистить диалог"
            title="Очистить диалог"
            disabled={!messages.length}
            onClick={() => actions.clearTutor(modeId)}
          >
            <Trash2 />
          </Button>
        </header>

        {/* mobile mode picker */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2 lg:hidden">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModeId(m.id)}
              className={cn(
                "h-7 shrink-0 cursor-pointer rounded-full border px-3 text-[12px]",
                m.id === modeId ? "border-accent bg-accent-muted text-accent-soft" : "border-line text-muted",
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center py-2 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-muted text-accent-soft">
                <ModeIcon className="size-5" />
              </div>
              <h2 className="text-[20px] font-semibold tracking-tight">{mode.name}</h2>
              <p className="mt-1.5 text-[14px] text-muted">{mode.short}. Спроси что угодно или начни с подсказки.</p>
              <div className="mt-6 grid w-full gap-2">
                {mode.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="cursor-pointer rounded-lg border border-line bg-card px-4 py-3 text-left text-[14px] text-fg shadow-lift transition-colors hover:border-line-strong"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!connected && status && (
                <p className="mt-6 text-[12px] text-subtle">
                  Интерфейс готов, но AI пока не подключён. Сообщения сохраняются, пока не появится модель.
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-7">
              {messages.map((m) =>
                m.kind === "notice" ? (
                  <div key={m.id} className="flex items-start gap-2 rounded-r-md border-l-2 border-warning bg-surface px-3.5 py-2.5 text-[13px] text-muted">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    {m.content}
                  </div>
                ) : m.role === "user" ? (
                  <motion.div
                    key={m.id}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-elevated px-4 py-2.5 text-[14.5px] leading-relaxed text-fg"
                  >
                    {m.content}
                  </motion.div>
                ) : (
                  <motion.article
                    key={m.id}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-w-0 break-words border-l-2 border-accent pl-4 text-[15px] leading-[1.7] text-fg"
                  >
                    <div className="mb-1.5 text-[12.5px] font-medium text-accent-soft">{mode.name}</div>
                    <Markdown text={m.content} />
                  </motion.article>
                ),
              )}
              {sending && (
                <div className="border-l-2 border-accent pl-4" aria-label="Репетитор печатает">
                  <div className="mb-2 text-[12.5px] font-medium text-accent-soft">{mode.name}</div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 animate-pulse-dot rounded-full bg-accent-soft" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 pb-4 pt-3 sm:px-6">
          {voiceNote && (
            <div className="mx-auto mb-2 flex max-w-2xl items-start gap-2 rounded-r-md border-l-2 border-line-strong bg-surface px-3 py-2 text-[12.5px] text-muted">
              <Mic className="mt-0.5 size-3.5 shrink-0 text-accent-soft" />
              Голосовой режим в планах: речь будет превращаться в текст, а ответы — озвучиваться. Пока недоступно.
              <button type="button" className="ml-auto cursor-pointer text-subtle hover:text-fg" onClick={() => setVoiceNote(false)}>
                Закрыть
              </button>
            </div>
          )}
          <form
            className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-line bg-card p-2 shadow-lift transition-colors focus-within:border-accent"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Голосовой ввод (скоро)"
              title="Голосовой ввод — скоро"
              onClick={() => setVoiceNote((v) => !v)}
            >
              <Mic />
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={8000}
              placeholder={`Напиши: ${mode.name}…`}
              aria-label="Сообщение"
              className="max-h-[180px] min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[16px] text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-none sm:text-[14px]"
            />
            <Button type="submit" size="icon-sm" aria-label="Отправить" disabled={!input.trim() || sending}>
              {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            </Button>
          </form>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-subtle">Enter — отправить, Shift+Enter — новая строка</p>
        </div>
      </section>

      {/* Context */}
      <aside className="hidden min-h-0 overflow-y-auto border-l border-line bg-surface p-5 xl:block">
        <h2 className="text-[14px] font-semibold text-fg">Что знает репетитор</h2>
        <dl className="mt-3 space-y-3 text-[13px]">
          {[
            ["Уровень", state.settings.currentLevel ?? "Не задан"],
            ["Язык объяснений", state.settings.teachingLanguage === "ru+en" ? "Русский + английский" : "Только английский"],
            ["Время в день", `${state.settings.dailyMinutes} min`],
            ["Цель", state.settings.mainGoal],
            ["Экзамен", state.settings.targetExam === "none" ? "Пока нет" : state.settings.targetExam.toUpperCase()],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[12px] text-subtle">{k}</dt>
              <dd className="mt-0.5 text-fg/90">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2.5">
          <div>
            <div className="text-[13px] text-fg">Делиться статистикой</div>
            <div className="text-[11.5px] text-subtle">Только реальный прогресс, без демо-данных</div>
          </div>
          <Switch checked={shareStats} onChange={setShareStats} label="Делиться статистикой с репетитором" />
        </div>

        <h2 className="mt-8 text-[14px] font-semibold text-fg">Можно спросить</h2>
        <div className="mt-3 space-y-1.5">
          {mode.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="w-full cursor-pointer rounded-md px-2.5 py-2 text-left text-[12.5px] text-muted transition-colors hover:bg-card hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>

        <h2 className="mt-8 text-[14px] font-semibold text-fg">Модель</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {connected
            ? `${status?.provider} · ${status?.model}`
            : statusError
              ? "Не удалось связаться с репетитором."
              : "Не подключён. Нужен ключ GROQ_API_KEY или ANTHROPIC_API_KEY на сервере."}
        </p>
      </aside>
    </div>
  );
}
