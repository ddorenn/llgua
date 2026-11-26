"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, BookOpen, Headphones, Mic, PenLine, Pause, RotateCcw, Shapes, Spline } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, plural } from "@/lib/utils";
import type { Answer, PlacementView, SectionId, Step } from "@/lib/placement/types";
import { ScriptPlayer } from "./audio";

const SECTION: Record<SectionId, { title: string; icon: React.ElementType; intro: string }> = {
  zero: { title: "Первые шаги", icon: Shapes, intro: "Несколько самых простых заданий: слова и короткие фразы. Если не знаете ответ — так и отметьте." },
  vocabulary: { title: "Словарь", icon: Shapes, intro: "Значения слов и слова в контексте. Задания подстраиваются под ваши ответы: верно — сложнее, ошибка — проще." },
  grammar: { title: "Грамматика", icon: Spline, intro: "Выберите или впишите нужную форму. Без подсказок по ходу — разбор будет в отчёте." },
  reading: { title: "Чтение", icon: BookOpen, intro: "Короткие тексты, к каждому — четыре вопроса. Текст можно перечитывать сколько угодно." },
  listening: {
    title: "Аудирование",
    icon: Headphones,
    intro: "Диалоги и сообщения, к каждому — четыре вопроса. Число прослушиваний ограничено. Наденьте наушники или включите звук.",
  },
  writing: { title: "Письмо", icon: PenLine, intro: "Одно задание по вашему уровню. Пишите сами, без переводчика — так маршрут будет точнее." },
  speaking: { title: "Устная речь", icon: Mic, intro: "" },
};

export const SECTION_TITLE = (s: SectionId) => SECTION[s].title;

export function Runner({
  view,
  order,
  busy,
  error,
  onAnswer,
  onRestart,
}: {
  view: PlacementView;
  order: SectionId[];
  busy: boolean;
  error: string | null;
  onAnswer: (a: Omit<Answer, "seq">) => void;
  onRestart: () => void;
}) {
  const step = view.step;
  const reduce = useReducedMotion();
  const section = step.kind === "done" ? null : step.progress.section;
  // Show a short intro card each time a new section begins (per placement, survives reloads).
  const introKey = section ? `lingua:placement:intro:${view.id}:${section}` : "";
  const [introSeen, setIntroSeen] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    if (!introKey) return;
    try {
      if (sessionStorage.getItem(introKey)) setIntroSeen((s) => ({ ...s, [introKey]: true }));
    } catch {
      /* ignore */
    }
  }, [introKey]);
  const showIntro = !!section && section !== "speaking" && !introSeen[introKey] && step.kind !== "done" && step.progress.answered === 0;
  const dismissIntro = () => {
    try {
      sessionStorage.setItem(introKey, "1");
    } catch {
      /* ignore */
    }
    setIntroSeen((s) => ({ ...s, [introKey]: true }));
  };

  if (step.kind === "done") return null;

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <SectionRail order={order} current={step.progress.section} />
      <div className="mt-6 flex items-center gap-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${Math.min(100, (step.progress.answered / Math.max(1, step.progress.planned)) * 100)}%` }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          />
        </div>
        <span className="tabular text-[12px] text-subtle">
          {SECTION[step.progress.section].title} · {step.progress.sectionNo}/{step.progress.sectionCount}
        </span>
      </div>

      <div className="mt-8 min-h-[440px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={showIntro ? `intro-${section}` : step.itemId}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {showIntro ? (
              <SectionIntro section={step.progress.section} onGo={dismissIntro} />
            ) : (
              <StepView step={step} busy={busy} error={error} onAnswer={onAnswer} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-subtle">
        <span>Ответы сохраняются сразу. Продолжить можно в течение 48 часов.</span>
        <div className="flex gap-2">
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Pause /> Пауза
          </Link>
          <Button variant="ghost" size="sm" onClick={onRestart} disabled={busy}>
            <RotateCcw /> Начать заново
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionRail({ order, current }: { order: SectionId[]; current: SectionId }) {
  if (order.length < 2) return null;
  const idx = order.indexOf(current);
  return (
    <ol className="flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Разделы диагностики">
      {order.map((s, i) => {
        const Icon = SECTION[s].icon;
        const state = i < idx ? "done" : i === idx ? "now" : "next";
        return (
          <li
            key={s}
            aria-current={state === "now" ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-colors",
              state === "now" && "bg-primary text-on-primary",
              state === "done" && "text-fg",
              state === "next" && "text-subtle",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className={cn(state !== "now" && "hidden sm:inline")}>{SECTION[s].title}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SectionIntro({ section, onGo }: { section: SectionId; onGo: () => void }) {
  const S = SECTION[section];
  const Icon = S.icon;
  return (
    <div className="mx-auto max-w-[560px] py-6 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-card text-accent-soft">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-6 text-[36px] font-semibold tracking-[-0.04em] text-fg sm:text-[44px]">{S.title}</h2>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{S.intro}</p>
      <Button size="lg" className="mt-8" onClick={onGo} autoFocus>
        Начать раздел <ArrowRight />
      </Button>
    </div>
  );
}

function StepView({ step, busy, error, onAnswer }: { step: Exclude<Step, { kind: "done" }>; busy: boolean; error: string | null; onAnswer: (a: Omit<Answer, "seq">) => void }) {
  const started = React.useRef(Date.now());
  React.useEffect(() => {
    started.current = Date.now();
  }, [step.itemId]);
  const ms = () => Date.now() - started.current;

  if (step.kind === "writing") return <WritingStep step={step} busy={busy} error={error} onSubmit={(a) => onAnswer({ ...a, ms: ms() })} />;
  if (step.kind === "speaking") return <SpeakingStep consent={step.consent} busy={busy} onContinue={() => onAnswer({ itemId: step.itemId, skip: true, ms: ms() })} />;
  if (step.kind === "input") return <InputStep step={step} busy={busy} error={error} onSubmit={(a) => onAnswer({ ...a, ms: ms() })} />;
  return <ChoiceStep step={step} busy={busy} error={error} onSubmit={(a) => onAnswer({ ...a, ms: ms() })} />;
}

/** Render "___" gaps in English prompts as a visible blank. */
function Prompt({ text, className }: { text: string; className?: string }) {
  const isRu = /[А-Яа-яЁё]/.test(text.replace(/\(.*?\)/g, "")) && !/___/.test(text);
  const parts = text.split(/(_{2,}|\b[a-zA-Z]_{2,})/g);
  return (
    <p data-prompt={text} className={cn(isRu ? "text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]" : "lang text-[24px] leading-snug sm:text-[30px]", "text-fg", className)}>
      {parts.map((p, i) =>
        /_{2,}/.test(p) ? (
          <span key={i} className="mx-0.5 inline-block min-w-[3.2em] border-b-2 border-accent text-center text-accent-soft">
            {p.replace(/_+/g, "")}
            {" "}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </p>
  );
}

function ChoiceStep({ step, busy, error, onSubmit }: { step: Extract<Step, { kind: "choice" }>; busy: boolean; error: string | null; onSubmit: (a: Omit<Answer, "seq" | "ms">) => void }) {
  const [picked, setPicked] = React.useState<number | null>(null);
  React.useEffect(() => setPicked(null), [step.itemId]);
  const submit = (choice: number | null) => {
    if (busy) return;
    if (choice === null) onSubmit({ itemId: step.itemId, dontKnow: true });
    else onSubmit({ itemId: step.itemId, choice });
  };
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const n = Number(e.key);
      if (n >= 1 && n <= step.options.length) setPicked(n - 1);
      if (e.key === "Enter" && picked !== null) submit(picked);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const body = (
    <div>
      {step.questionNo && <p className="mb-3 text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Вопрос {step.questionNo} из 4</p>}
      <Prompt text={step.prompt} className={step.stimulus ? "!text-[20px] sm:!text-[22px]" : undefined} />
      <div className="mt-7 flex flex-col gap-2.5" role="radiogroup" aria-label="Варианты ответа">
        {step.options.map((o, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={picked === i}
            onClick={() => setPicked(i)}
            className={cn(
              "group flex min-h-14 items-center gap-4 rounded-xl border px-4 py-3 text-left transition-[border-color,background-color] duration-150",
              picked === i ? "border-accent bg-accent-muted" : "border-line bg-card hover:border-line-strong",
            )}
          >
            <span
              className={cn(
                "tabular flex size-7 shrink-0 items-center justify-center rounded-md border text-[12px] transition-colors",
                picked === i ? "border-accent bg-accent text-on-accent" : "border-line text-subtle",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("text-[16px] text-fg", !/[А-Яа-яЁё]/.test(o) && "lang text-[17px]")}>{o}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-[14px] text-danger" role="alert">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => picked !== null && submit(picked)} disabled={picked === null || busy}>
          Ответить <ArrowRight />
        </Button>
        {step.dontKnow && (
          <Button variant="ghost" size="lg" onClick={() => submit(null)} disabled={busy}>
            Не знаю
          </Button>
        )}
      </div>
    </div>
  );

  if (!step.stimulus) return <div className="mx-auto max-w-[680px]">{body}</div>;
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
      <Stimulus step={step} onSkip={() => onSubmit({ itemId: step.itemId, skip: true })} busy={busy} />
      {body}
    </div>
  );
}

function Stimulus({ step, onSkip, busy }: { step: Extract<Step, { kind: "choice" }>; onSkip: () => void; busy: boolean }) {
  const s = step.stimulus!;
  const [unavailable, setUnavailable] = React.useState(false);
  const markUnavailable = React.useCallback(() => setUnavailable(true), []);
  if (s.type === "text") {
    return (
      <article className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Текст</p>
        <h3 className="lang mt-2 text-[22px] text-fg">{s.title}</h3>
        <div className="mt-4 max-h-[52vh] overflow-y-auto rounded-2xl border border-line bg-card p-5 lg:max-h-[60vh]">
          {s.text.split("\n").map((p, i) => (
            <p key={i} className="lang mb-3 text-[16.5px] leading-[1.7] text-muted last:mb-0">
              {p}
            </p>
          ))}
        </div>
      </article>
    );
  }
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Запись</p>
      <h3 className="lang mt-2 text-[22px] text-fg">{s.title}</h3>
      <div className="mt-4">
        <ScriptPlayer testletId={s.testletId} lines={s.lines} rate={s.rate} maxPlays={s.maxPlays} onUnavailable={markUnavailable} />
      </div>
      <button
        type="button"
        onClick={() => {
          if (unavailable || window.confirm("Пропустить аудирование? Этот навык останется неоценённым.")) onSkip();
        }}
        disabled={busy}
        className={cn("mt-4 text-[13px] underline underline-offset-4", unavailable ? "text-fg" : "text-subtle hover:text-fg")}
      >
        Не могу прослушать — пропустить раздел
      </button>
    </div>
  );
}

function InputStep({ step, busy, error, onSubmit }: { step: Extract<Step, { kind: "input" }>; busy: boolean; error: string | null; onSubmit: (a: Omit<Answer, "seq" | "ms">) => void }) {
  const [text, setText] = React.useState("");
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    setText("");
    ref.current?.focus();
  }, [step.itemId]);
  const ru = /[Ѐ-ӿ]/.test(text);
  return (
    <div className="mx-auto max-w-[680px]">
      <p className="mb-4 text-[13px] text-subtle">Впишите пропущенное слово или форму{/\b[a-zA-Z]_{2,}/.test(step.prompt) ? " — первая буква уже стоит" : ""}.</p>
      <Prompt text={step.prompt} />
      <form
        className="mt-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && text.trim()) onSubmit({ itemId: step.itemId, text });
        }}
      >
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="en"
          aria-label="Ответ"
          placeholder="Ваш ответ"
          className={cn(
            "lang h-14 w-full rounded-xl border bg-card px-5 text-[19px] text-fg outline-none transition-colors placeholder:font-sans placeholder:text-[16px] placeholder:text-subtle",
            ru ? "border-warning" : "border-line focus:border-accent",
          )}
        />
        {ru && <p className="mt-2 text-[13px] text-warning">Включена русская раскладка — переключите на английскую.</p>}
        {error && <p className="mt-3 text-[14px] text-danger" role="alert">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={!text.trim() || busy}>
            Ответить <ArrowRight />
          </Button>
          <Button variant="ghost" size="lg" onClick={() => onSubmit({ itemId: step.itemId, dontKnow: true })} disabled={busy}>
            Не знаю
          </Button>
        </div>
      </form>
    </div>
  );
}

function WritingStep({ step, busy, error, onSubmit }: { step: Extract<Step, { kind: "writing" }>; busy: boolean; error: string | null; onSubmit: (a: Omit<Answer, "seq" | "ms">) => void }) {
  const draftKey = `lingua:placement:draft:${step.itemId}`;
  const [text, setText] = React.useState("");
  const [pasted, setPasted] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    try {
      setText(localStorage.getItem(draftKey) ?? "");
    } catch {
      /* ignore */
    }
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [draftKey]);
  React.useEffect(() => {
    try {
      localStorage.setItem(draftKey, text);
    } catch {
      /* ignore */
    }
  }, [draftKey, text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const [min, max] = step.words;
  const over = elapsed >= step.timeMin * 60;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const clear = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mx-auto max-w-[760px]">
      <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">{step.title}</p>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">{step.instruction}</p>
      <p className="lang mt-4 rounded-xl border border-line bg-surface p-4 text-[18px] leading-relaxed text-fg">{step.prompt}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => setPasted((p) => p + e.clipboardData.getData("text").length)}
        rows={9}
        lang="en"
        spellCheck={false}
        aria-label="Ваш текст"
        placeholder="Start writing here…"
        className="lang mt-5 w-full resize-y rounded-xl border border-line bg-card p-4 text-[17px] leading-relaxed text-fg outline-none placeholder:text-subtle focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className={cn("tabular", words < min ? "text-subtle" : words > max * 1.3 ? "text-warning" : "text-success")}>
          {words} {plural(words, "слово", "слова", "слов")} · цель {min}–{max}
        </span>
        <span className={cn("tabular", over ? "text-warning" : "text-subtle")}>
          {mm}:{ss} {over ? "· рекомендуемое время вышло — можно завершать" : `· около ${step.timeMin} мин`}
        </span>
      </div>
      {pasted > 40 && <p className="mt-3 text-[13px] text-warning">Текст вставлен из буфера. Такая работа будет помечена как ненадёжная — лучше написать самостоятельно.</p>}
      {error && <p className="mt-3 text-[14px] text-danger" role="alert">{error}</p>}
      <p className="mt-5 text-[13px] leading-relaxed text-subtle">
        Текст сохранится в вашем профиле. Автоматическая оценка письма по рубрике ещё не подключена — в отчёте навык будет отмечен как неоценённый.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={!text.trim() || busy}
          onClick={() => {
            clear();
            onSubmit({ itemId: step.itemId, text, pastedChars: pasted });
          }}
        >
          Отправить текст <ArrowRight />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          disabled={busy}
          onClick={() => {
            clear();
            onSubmit({ itemId: step.itemId, skip: true });
          }}
        >
          Пропустить
        </Button>
      </div>
    </div>
  );
}

function SpeakingStep({ consent, busy, onContinue }: { consent: boolean; busy: boolean; onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-[600px] py-4 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-card text-accent-soft">
        <Mic className="size-6" />
      </span>
      <h2 className="mt-6 text-[34px] font-semibold tracking-[-0.04em] text-fg">Устная речь — в следующей версии</h2>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        Интервью, монолог и чтение вслух для произношения появятся, когда будет готова надёжная запись и проверка речи. Сейчас навык будет
        отмечен как <span className="text-fg">неоценённый</span> — без придуманных баллов.
      </p>
      <p className="mt-3 text-[14px] text-subtle">
        {consent ? "Ваше согласие на запись голоса сохранено и пригодится позже." : "Согласие на запись голоса не дано — его можно изменить позже."}
      </p>
      <Button size="lg" className="mt-8" onClick={onContinue} disabled={busy} autoFocus>
        Завершить и посмотреть результат <ArrowRight />
      </Button>
    </div>
  );
}
