"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { PronounceButton } from "@/components/vocab/word-card";
import { ScriptPlayer } from "@/components/placement/audio";
import { cn, plural } from "@/lib/utils";
import { checkDialogue, checkGap, checkOrder, orderTokens, writingTargets } from "@/lib/lessons/engine";
import type { BlockOf } from "@/lib/lessons/schema";
import type { LessonAttempt, LessonSession, ReviewPlanItem, SrsItem } from "@/lib/store/types";
import { TutorExplain } from "./tutor";

export interface Ctx {
  lessonId: string;
  session: LessonSession;
  /** Record a graded answer (raw answer goes to the server, which grades it again). */
  record: (key: string, ok: boolean, answer: string, raw: { choice?: number; text?: string; wrong?: number }) => void;
  attempt: (key: string) => LessonAttempt | undefined;
  ai: boolean;
}

const EASE = [0.2, 0.7, 0.2, 1] as const;

/* ------------------------------------------------------------- shared */

export function BlockTitle({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <div className="mb-5">
      <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">{eyebrow}</p>
      {title && <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.025em] text-fg sm:text-[28px]">{title}</h2>}
    </div>
  );
}

function Verdict({ ok, children }: { ok: boolean; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn("mt-4 rounded-xl border px-4 py-3 text-[14.5px] leading-relaxed", ok ? "border-success/40 bg-success/5" : "border-danger/30 bg-danger/5")}
      role="status"
    >
      <p className={cn("flex items-center gap-2 font-medium", ok ? "text-success" : "text-danger")}>
        {ok ? <Check className="size-4" /> : <X className="size-4" />} {ok ? "Верно" : "Не совсем"}
      </p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </motion.div>
  );
}

/** Prompt with ___ rendered as a visible blank. */
function GapPrompt({ text }: { text: string }) {
  const parts = text.split(/(_{3,})/);
  return (
    <p className="lang text-[22px] leading-snug text-fg sm:text-[26px]">
      {parts.map((p, i) => (/_{3,}/.test(p) ? <span key={i} className="mx-1 inline-block min-w-[3em] border-b-2 border-accent align-baseline">&nbsp;</span> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </p>
  );
}

const isRu = (s: string) => /[А-Яа-яЁё]/.test(s);

/* ------------------------------------------------------------ explain */

export function ExplainBlock({ block }: { block: BlockOf<"explain"> }) {
  return (
    <div>
      <BlockTitle eyebrow="Объяснение" title={block.title} />
      <Markdown text={block.body} className="max-w-[62ch] text-[16px] leading-relaxed text-muted" />
      {block.examples && (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
          {block.examples.map((e) => (
            <li key={e.en} className="flex items-start gap-3 px-5 py-3.5">
              <PronounceButton text={e.en} className="-ml-1 mt-0.5 shrink-0" />
              <div>
                <p className="lang text-[17px] text-fg">{e.en}</p>
                {e.ru && <p className="mt-0.5 text-[13.5px] text-subtle">{e.ru}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- vocab */

export function VocabBlock({ block, saved, onSave }: { block: BlockOf<"vocab">; saved: string[]; onSave: (words: BlockOf<"vocab">["words"]) => void }) {
  const unsaved = block.words.filter((w) => !saved.includes(w.word));
  return (
    <div>
      <BlockTitle eyebrow="Лексика" title={block.title} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {block.words.map((w) => {
          const isSaved = saved.includes(w.word);
          return (
            <div key={w.word} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="lang text-[21px] leading-tight text-fg">{w.word}</p>
                  <p className="mt-0.5 text-[12.5px] text-subtle">
                    {[w.pos, w.ipa].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <PronounceButton text={w.word} className="shrink-0" />
              </div>
              <p className="mt-2 text-[15px] text-fg">{w.translation}</p>
              <p className="lang mt-2 text-[14.5px] italic leading-snug text-muted">{w.example}</p>
              <button
                type="button"
                onClick={() => onSave([w])}
                disabled={isSaved}
                className={cn("mt-3 inline-flex items-center gap-1.5 text-[13px]", isSaved ? "text-success" : "text-accent-soft hover:text-fg")}
              >
                {isSaved ? <Check className="size-3.5" /> : <Plus className="size-3.5" />} {isSaved ? "В моём словаре" : "В мой словарь"}
              </button>
            </div>
          );
        })}
      </div>
      {unsaved.length > 0 && (
        <Button variant="secondary" className="mt-4" onClick={() => onSave(unsaved)}>
          <Plus /> Добавить все в повторение ({unsaved.length})
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- choice */

export function ChoiceQuestion({
  ctx,
  akey,
  prompt,
  options,
  answer,
  explanation,
  hint,
  compact,
}: {
  ctx: Ctx;
  akey: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  hint?: string;
  compact?: boolean;
}) {
  const att = ctx.attempt(akey);
  const [picked, setPicked] = React.useState<number | null>(null);
  const done = !!att && (att.ok || att.tries >= 2);
  const lastWrong = att && !att.ok && !done;
  const submit = (i: number) => {
    if (done) return;
    setPicked(i);
    ctx.record(akey, i === answer, options[i], { choice: i });
  };
  return (
    <div>
      <p className={cn(compact ? "text-[17px]" : "text-[21px] sm:text-[24px]", isRu(prompt) ? "font-medium tracking-[-0.015em] text-fg" : "lang text-fg")}>{prompt}</p>
      <div className="mt-4 flex flex-col gap-2">
        {options.map((o, i) => {
          const state = done ? (i === answer ? "right" : i === picked && !att?.ok ? "wrong" : "rest") : picked === i && lastWrong ? "wrong" : "idle";
          return (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => submit(i)}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[15.5px] transition-colors",
                !isRu(o) && "lang text-[16.5px]",
                state === "idle" && "border-line bg-card text-fg hover:border-line-strong",
                state === "right" && "border-success/60 bg-success/10 text-fg",
                state === "wrong" && "border-danger/50 bg-danger/5 text-fg",
                state === "rest" && "border-line bg-card text-subtle",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {lastWrong && <Verdict ok={false}>{hint ?? "Подумайте ещё раз — одна попытка осталась."}</Verdict>}
      {done && <Verdict ok={att!.ok}>{explanation}</Verdict>}
      {done && !att!.ok && ctx.ai && <TutorExplain lessonId={ctx.lessonId} akey={akey} answer={att!.answer} />}
    </div>
  );
}

export function ChoiceBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"choice"> }) {
  return (
    <div>
      <BlockTitle eyebrow={block.check === "concept" ? "Проверка понимания" : block.check === "recall" ? "Вспомните" : "Упражнение"} />
      <ChoiceQuestion ctx={ctx} akey={block.id} prompt={block.prompt} options={block.options} answer={block.answer} explanation={block.explanation} hint={block.hint} />
    </div>
  );
}

/* ---------------------------------------------------------------- gap */

export function GapQuestion({ ctx, akey, prompt, answers, explanation, hint, onAnswered }: { ctx: Ctx; akey: string; prompt: string; answers: string[]; explanation: string; hint?: string; onAnswered?: (ok: boolean, first: boolean) => void }) {
  const att = ctx.attempt(akey);
  const [text, setText] = React.useState("");
  const done = !!att && (att.ok || att.tries >= 2);
  const lastWrong = att && !att.ok && !done;
  const ru = isRu(text);
  return (
    <div>
      <GapPrompt text={prompt} />
      {!done && (
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim() || ru) return;
            const ok = checkGap(text, answers, prompt);
            const first = !att;
            ctx.record(akey, ok, text.trim(), { text: text.trim() });
            onAnswered?.(ok, first);
            if (!ok) setText("");
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="en"
            aria-label="Ответ"
            placeholder="Ваш ответ"
            className={cn("lang h-12 flex-1 rounded-xl border bg-card px-4 text-[18px] text-fg outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-subtle", ru ? "border-warning" : "border-line focus:border-accent")}
          />
          <Button type="submit" size="lg" disabled={!text.trim() || ru}>
            Проверить
          </Button>
        </form>
      )}
      {ru && <p className="mt-2 text-[13px] text-warning">Включена русская раскладка — переключите на английскую.</p>}
      {lastWrong && <Verdict ok={false}>{hint ?? "Почти. Попробуйте ещё раз."}</Verdict>}
      {done && (
        <Verdict ok={att!.ok}>
          {!att!.ok && (
            <>
              Правильно: <span className="lang text-fg">{answers[0]}</span>.{" "}
            </>
          )}
          {explanation}
        </Verdict>
      )}
      {done && !att!.ok && ctx.ai && <TutorExplain lessonId={ctx.lessonId} akey={akey} answer={att!.answer} />}
    </div>
  );
}

export function GapBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"gap"> }) {
  return (
    <div>
      <BlockTitle eyebrow={block.check === "recall" ? "Вспомните" : "Вставьте пропущенное"} />
      <GapQuestion ctx={ctx} akey={block.id} prompt={block.prompt} answers={block.answers} explanation={block.explanation} hint={block.hint} />
    </div>
  );
}

/* -------------------------------------------------------------- order */

export function OrderBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"order"> }) {
  const tokens = React.useMemo(() => orderTokens(block), [block]);
  const [picked, setPicked] = React.useState<number[]>([]);
  const att = ctx.attempt(block.id);
  const done = !!att && (att.ok || att.tries >= 2);
  const lastWrong = att && !att.ok && !done;
  const sentence = picked.map((i) => tokens[i]).join(" ");
  return (
    <div>
      <BlockTitle eyebrow={block.prompt ?? "Составьте предложение"} />
      <div className="lang flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface px-3 py-2.5 text-[18px]">
        {picked.length === 0 && <span className="font-sans text-[14px] text-subtle">Нажимайте на слова по порядку</span>}
        {picked.map((i, k) => (
          <button key={k} type="button" disabled={done} onClick={() => setPicked((p) => p.filter((_, j) => j !== k))} className="rounded-lg bg-primary px-2.5 py-1 text-on-primary">
            {tokens[i]}
          </button>
        ))}
      </div>
      {!done && (
        <div className="lang mt-3 flex flex-wrap gap-2 text-[18px]">
          {tokens.map((t, i) =>
            picked.includes(i) ? null : (
              <button key={i} type="button" onClick={() => setPicked((p) => [...p, i])} className="rounded-lg border border-line bg-card px-2.5 py-1 text-fg hover:border-line-strong">
                {t}
              </button>
            ),
          )}
        </div>
      )}
      {!done && (
        <div className="mt-4 flex gap-2">
          <Button
            disabled={picked.length !== tokens.length}
            onClick={() => {
              const ok = checkOrder(sentence, block.answers);
              ctx.record(block.id, ok, sentence, { text: sentence });
              if (!ok) setPicked([]);
            }}
          >
            Проверить
          </Button>
          <Button variant="ghost" onClick={() => setPicked([])} disabled={!picked.length}>
            <RotateCcw /> Сначала
          </Button>
        </div>
      )}
      {lastWrong && <Verdict ok={false}>Порядок не тот. Попробуйте ещё раз.</Verdict>}
      {done && (
        <Verdict ok={att!.ok}>
          {!att!.ok && (
            <>
              Правильно: <span className="lang text-fg">{block.answers[0]}</span>.{" "}
            </>
          )}
          {block.explanation}
        </Verdict>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- match */

export function MatchBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"match"> }) {
  const rights = React.useMemo(() => {
    const r = block.pairs.map((p, i) => ({ text: p[1], i }));
    let h = 7;
    for (let i = r.length - 1; i > 0; i--) {
      h = (h * 31 + block.id.length + i) % 9973;
      const j = h % (i + 1);
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }, [block]);
  const att = ctx.attempt(block.id);
  const [left, setLeft] = React.useState<number | null>(null);
  const [matched, setMatched] = React.useState<number[]>(att ? block.pairs.map((_, i) => i) : []);
  const [wrong, setWrong] = React.useState(0);
  const [flash, setFlash] = React.useState<number | null>(null);
  const done = !!att;
  const choose = (ri: number) => {
    if (left == null || done) return;
    if (ri === left) {
      const m = [...matched, left];
      setMatched(m);
      setLeft(null);
      if (m.length === block.pairs.length) ctx.record(block.id, wrong === 0, wrong === 0 ? "все пары верно" : `ошибок: ${wrong}`, { wrong });
    } else {
      setWrong((w) => w + 1);
      setFlash(ri);
      window.setTimeout(() => setFlash(null), 450);
    }
  };
  return (
    <div>
      <BlockTitle eyebrow={block.prompt ?? "Сопоставьте"} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col gap-2">
          {block.pairs.map((p, i) => (
            <button
              key={i}
              type="button"
              disabled={matched.includes(i) || done}
              onClick={() => setLeft(i)}
              className={cn(
                "lang min-h-12 rounded-xl border px-3 py-2 text-left text-[16px] transition-colors",
                matched.includes(i) ? "border-success/40 bg-success/5 text-subtle" : left === i ? "border-accent bg-accent-muted text-fg" : "border-line bg-card text-fg hover:border-line-strong",
              )}
            >
              {p[0]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {rights.map((r) => (
            <button
              key={r.i}
              type="button"
              disabled={matched.includes(r.i) || done}
              onClick={() => choose(r.i)}
              className={cn(
                "min-h-12 rounded-xl border px-3 py-2 text-left text-[15px] transition-colors",
                matched.includes(r.i) ? "border-success/40 bg-success/5 text-subtle" : flash === r.i ? "border-danger/60 bg-danger/10" : "border-line bg-card text-fg hover:border-line-strong",
              )}
            >
              {r.text}
            </button>
          ))}
        </div>
      </div>
      {done && <Verdict ok={att!.ok}>{att!.ok ? block.explanation ?? "Все пары подобраны." : `Все пары подобраны, ошибок по пути: ${att!.answer.replace("ошибок: ", "")}. ${block.explanation ?? ""}`}</Verdict>}
    </div>
  );
}

/* ---------------------------------------------------- reading / listening */

export function ReadingBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"reading"> }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <BlockTitle eyebrow="Чтение" title={block.title} />
        <div className="rounded-2xl border border-line bg-card p-5">
          {block.text.split("\n").map((p, i) => (
            <p key={i} className="lang mb-3 text-[16.5px] leading-[1.7] text-muted last:mb-0">
              {p}
            </p>
          ))}
        </div>
      </div>
      <div className="space-y-8 lg:pt-12">
        {block.questions.map((q) => (
          <ChoiceQuestion key={q.id} ctx={ctx} akey={`${block.id}/${q.id}`} prompt={q.prompt} options={q.options} answer={q.answer} explanation={q.explanation} compact />
        ))}
      </div>
    </div>
  );
}

export function ListeningBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"listening"> }) {
  const [showText, setShowText] = React.useState(false);
  const allDone = block.questions.every((q) => {
    const a = ctx.attempt(`${block.id}/${q.id}`);
    return a && (a.ok || a.tries >= 2);
  });
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <BlockTitle eyebrow="Аудирование" title={block.title} />
        <ScriptPlayer testletId={`lesson:${ctx.lessonId}:${block.id}`} lines={block.lines} rate={block.rate} maxPlays={block.maxPlays} />
        {allDone && (
          <div className="mt-4">
            <button type="button" onClick={() => setShowText((s) => !s)} className="text-[13.5px] text-accent-soft underline underline-offset-4">
              {showText ? "Скрыть текст" : "Показать текст записи"}
            </button>
            {showText && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-surface p-4">
                {block.lines.map((l, i) => (
                  <p key={i} className="lang text-[15px] text-muted">
                    <span className="text-subtle">{l.speaker}:</span> {l.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-8 lg:pt-12">
        {block.questions.map((q) => (
          <ChoiceQuestion key={q.id} ctx={ctx} akey={`${block.id}/${q.id}`} prompt={q.prompt} options={q.options} answer={q.answer} explanation={q.explanation} compact />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- review */

export function reviewPlanFor(block: BlockOf<"review">, queue: SrsItem[]): ReviewPlanItem[] {
  return queue.length
    ? queue.slice(0, block.count).map((it) => ({
        key: `${block.id}/${it.id}`,
        srsId: it.id,
        prompt: it.kind === "word" ? `${it.back} — ___` : it.front,
        answers: [it.kind === "word" ? it.front : it.back],
        explanation: it.kind === "word" ? (it.example ?? "") : (it.note ?? "Из ваших прошлых ошибок."),
        label: it.kind === "word" ? "слово из вашего словаря" : "ваша прошлая ошибка",
      }))
    : block.fallback.map((f) => ({ key: `${block.id}/${f.id}`, srsId: null, prompt: f.prompt, answers: f.answers, explanation: f.explanation, label: "повторение прошлых тем" }));
}

export function ReviewBlock({ ctx, block, plan, onReview }: { ctx: Ctx; block: BlockOf<"review">; plan: ReviewPlanItem[]; onReview: (id: string, ok: boolean) => void }) {
  const items = plan;
  const fromBank = items.some((i) => i.srsId);
  const done = items.filter((i) => {
    const a = ctx.attempt(i.key);
    return a && (a.ok || a.tries >= 2);
  }).length;
  return (
    <div>
      <BlockTitle eyebrow="Разминка" title={block.title} />
      <p className="-mt-2 mb-6 text-[14px] text-subtle">
        {fromBank ? `Из вашего банка повторения: ${items.length} ${plural(items.length, "элемент", "элемента", "элементов")} со сроком на сегодня.` : "Банк повторения пока пуст — разминка по базовым темам."} Без подсказок, по памяти.
      </p>
      <div className="space-y-8">
        {items.map((it, i) => (
          <div key={it.key} className={cn(i > done && "pointer-events-none opacity-40")}>
            <p className="mb-2 text-[12px] text-subtle">{it.label}</p>
            <GapQuestion ctx={ctx} akey={it.key} prompt={it.prompt} answers={it.answers} explanation={it.explanation} onAnswered={(ok, first) => { if (first && it.srsId) onReview(it.srsId, ok); }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ writing */

export function WritingBlock({
  ctx,
  block,
  submitted,
  onSubmit,
  evaluation,
}: {
  ctx: Ctx;
  block: BlockOf<"writing">;
  submitted?: { text: string; words: number };
  onSubmit: (text: string) => void;
  evaluation: React.ReactNode;
}) {
  const draftKey = `lingua:lesson-draft:${ctx.lessonId}:${block.id}`;
  const [text, setText] = React.useState(submitted?.text ?? "");
  const [checks, setChecks] = React.useState<boolean[]>(block.checklist.map(() => false));
  React.useEffect(() => {
    if (submitted) return;
    try {
      const d = localStorage.getItem(draftKey);
      if (d) setText(d);
    } catch {
      /* ignore */
    }
  }, [draftKey, submitted]);
  React.useEffect(() => {
    if (submitted) return;
    try {
      localStorage.setItem(draftKey, text);
    } catch {
      /* ignore */
    }
  }, [draftKey, text, submitted]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const targets = writingTargets(block, text);
  const [min, max] = block.words;
  return (
    <div className="max-w-[760px]">
      <BlockTitle eyebrow="Письмо" title={block.title} />
      <p className="text-[15.5px] leading-relaxed text-muted">{block.instruction}</p>
      <p className="lang mt-4 rounded-xl border border-line bg-surface p-4 text-[17px] leading-relaxed text-fg">{block.prompt}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={!!submitted}
        rows={7}
        lang="en"
        spellCheck={false}
        aria-label="Ваш текст"
        placeholder="Hi! This weekend I'm going to…"
        className="lang mt-4 w-full resize-y rounded-xl border border-line bg-card p-4 text-[17px] leading-relaxed text-fg outline-none placeholder:text-subtle focus:border-accent read-only:opacity-80"
      />
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        <span className={cn("tabular", words < min ? "text-subtle" : words > max * 1.4 ? "text-warning" : "text-success")}>
          {words} {plural(words, "слово", "слова", "слов")} · цель {min}–{max}
        </span>
        {targets.map((t) => (
          <span key={t.label} className={cn("tabular", t.count >= 2 ? "text-success" : "text-subtle")}>
            {t.label}: {t.count}
          </span>
        ))}
      </div>
      {block.checklist.length > 0 && (
        <div className="mt-5 rounded-xl border border-line bg-card p-4">
          <p className="text-[13px] font-medium text-fg">Проверьте себя</p>
          <ul className="mt-2 space-y-1.5">
            {block.checklist.map((c, i) => (
              <li key={c}>
                <label className="flex cursor-pointer items-start gap-2.5 text-[14px] text-muted">
                  <input type="checkbox" checked={checks[i]} onChange={() => setChecks((x) => x.map((v, j) => (j === i ? !v : v)))} className="mt-1 accent-[var(--c-accent)]" />
                  {c}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!submitted ? (
        <Button
          size="lg"
          className="mt-5"
          disabled={words < Math.max(5, Math.floor(min / 2))}
          onClick={() => {
            try {
              localStorage.removeItem(draftKey);
            } catch {
              /* ignore */
            }
            onSubmit(text.trim());
          }}
        >
          Сохранить текст
        </Button>
      ) : (
        <p className="mt-4 text-[13.5px] text-success">Текст сохранён в занятии.</p>
      )}
      {submitted && evaluation}
    </div>
  );
}

/* ----------------------------------------------------------- dialogue */

export function DialogueBlock({ ctx, block, freePractice }: { ctx: Ctx; block: BlockOf<"dialogue">; freePractice: React.ReactNode }) {
  const done = block.steps.filter((s) => ctx.attempt(`${block.id}/${s.id}`)).length;
  const finished = done === block.steps.length;
  return (
    <div className="max-w-[720px]">
      <BlockTitle eyebrow="Диалог" title={block.title} />
      <p className="text-[15px] leading-relaxed text-muted">{block.scenario}</p>
      <p className="mt-1 text-[13.5px] text-subtle">Цель: {block.goal}</p>
      <p className="mt-1 text-[12.5px] text-subtle">Пока ответы текстом: голосовой режим подключится после проверки сервиса распознавания речи. Реплики собеседника можно прослушать.</p>
      <div className="mt-6 space-y-4">
        {block.steps.slice(0, done + 1).map((s) => (
          <DialogueStep key={s.id} ctx={ctx} blockId={block.id} partner={block.partner} step={s} />
        ))}
      </div>
      <AnimatePresence>{finished && freePractice}</AnimatePresence>
    </div>
  );
}

function DialogueStep({ ctx, blockId, partner, step }: { ctx: Ctx; blockId: string; partner: string; step: BlockOf<"dialogue">["steps"][number] }) {
  const key = `${blockId}/${step.id}`;
  const att = ctx.attempt(key);
  const [text, setText] = React.useState("");
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-[12px] font-medium text-muted">{partner[0]}</span>
        <div className="flex items-start gap-1 rounded-2xl rounded-tl-md border border-line bg-card px-4 py-2.5">
          <p className="lang text-[16.5px] text-fg">{step.partner}</p>
          <PronounceButton text={step.partner} className="-mr-2 -mt-1 size-7 shrink-0" />
        </div>
      </div>
      {!att ? (
        step.options ? (
          <div className="flex flex-col items-end gap-2">
            {step.options.map((o, i) => (
              <button key={i} type="button" onClick={() => ctx.record(key, checkDialogue(step, { choice: i }), o, { choice: i })} className="lang max-w-[90%] rounded-2xl rounded-tr-md border border-line bg-card px-4 py-2.5 text-right text-[16px] text-fg hover:border-accent">
                {o}
              </button>
            ))}
          </div>
        ) : (
          <form
            className="flex gap-2 pl-11"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) ctx.record(key, checkDialogue(step, { text }), text.trim(), { text: text.trim() });
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              lang="en"
              autoComplete="off"
              aria-label="Ваш ответ"
              placeholder="Ответьте по-английски"
              className="lang h-11 flex-1 rounded-xl border border-line bg-card px-4 text-[16px] text-fg outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-subtle focus:border-accent"
            />
            <Button type="submit" disabled={!text.trim()}>
              Ответить
            </Button>
          </form>
        )
      ) : (
        <div className="flex flex-col items-end gap-1.5">
          <p className="lang max-w-[90%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-[16px] text-on-primary">{att.answer}</p>
          {!att.ok && (
            <p className="max-w-[90%] text-right text-[13.5px] text-muted">
              {step.feedback} Например: <span className="lang text-fg">{step.model}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-[11.5px] text-accent-soft">
      <Sparkles className="size-3" /> AI · предварительно
    </span>
  );
}
