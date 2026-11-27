"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Pause, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStore } from "@/lib/store/store";
import { fetchAIStatus } from "@/lib/ai/client";
import { blockKeys, isGraded, lessonReport, newSession, nextPosition, shouldBranch, stageBlocks } from "@/lib/lessons/engine";
import type { Block, Lesson } from "@/lib/lessons/schema";
import { checkInput } from "@/lib/placement/scoring";
import { dailyQueue, newItem, wordId } from "@/lib/srs";
import type { LessonAttempt, LessonSession } from "@/lib/store/types";
import { cn, plural } from "@/lib/utils";
import {
  BlockTitle, ChoiceBlock, DialogueBlock, ExplainBlock, GapBlock, ListeningBlock, MatchBlock, OrderBlock, ReadingBlock, ReviewBlock, reviewPlanFor, VocabBlock, WritingBlock, type Ctx,
} from "./blocks";
import { FreeDialogue, NextPlan, WritingEvaluation } from "./tutor";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const ROLE: Record<string, string> = {
  teacher: "Учитель",
  examiner: "Экзаменатор",
  "speaking-partner": "Собеседник",
  "vocabulary-coach": "Тренер словаря",
  planner: "Планировщик",
  analyst: "Аналитик",
};

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { state, ready, actions } = useStore();
  const reduce = useReducedMotion();
  const create = React.useCallback(() => newSession(lesson), [lesson]);
  const session: LessonSession = state.lessonSessions?.[lesson.id] ?? create();
  const [ai, setAi] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetchAIStatus().then((s) => setAi(s.configured), () => setAi(false));
  }, []);

  const update = React.useCallback((fn: (s: LessonSession) => LessonSession) => actions.lessonUpdate(lesson.id, create, fn), [actions, lesson.id, create]);

  // Active time per stage (11 §3): count visible time in 15 s ticks.
  const stageId = lesson.stages[session.stage]?.id;
  React.useEffect(() => {
    if (!stageId || session.status === "completed") return;
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      const delta = Math.min(now - last, 60_000);
      last = now;
      if (document.visibilityState === "visible" && delta > 0) update((s) => ({ ...s, stageMs: { ...s.stageMs, [stageId]: (s.stageMs[stageId] ?? 0) + delta } }));
    };
    const id = window.setInterval(flush, 15_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else last = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [stageId, session.status, update]);

  const record = React.useCallback(
    (key: string, ok: boolean, answer: string) =>
      update((s) => {
        const prev = s.attempts[key];
        const a: LessonAttempt = prev
          ? { ...prev, ok, tries: prev.tries + 1, at: new Date().toISOString() }
          : { ok, firstOk: ok, tries: 1, answer, at: new Date().toISOString() };
        return { ...s, attempts: { ...s.attempts, [key]: a } };
      }),
    [update],
  );
  const ctx: Ctx = { lessonId: lesson.id, session, record, attempt: (k) => session.attempts[k], ai };

  // Fix the warm-up set the first time a review block is shown (a reload then shows the same items).
  const curStage = lesson.stages[session.stage];
  const curBlock = curStage ? stageBlocks(curStage, session)[session.block] : undefined;
  const needsPlan = ready && curBlock?.type === "review" && !session.reviewPlan?.[curBlock.id];
  React.useEffect(() => {
    if (!needsPlan || curBlock?.type !== "review") return;
    const plan = reviewPlanFor(curBlock, dailyQueue(state.srs ?? {}));
    update((s) => (s.reviewPlan?.[curBlock.id] ? s : { ...s, reviewPlan: { ...(s.reviewPlan ?? {}), [curBlock.id]: plan } }));
  }, [needsPlan, curBlock, state.srs, update]);

  if (!ready) return <div className="py-24 text-center text-[14px] text-subtle">Загружаем занятие…</div>;

  const stage = lesson.stages[session.stage];
  const blocks = stageBlocks(stage, session);
  const block = blocks[Math.min(session.block, blocks.length - 1)];
  const totalBlocks = lesson.stages.reduce((n, st) => n + stageBlocks(st, session).length, 0);
  const doneBlocks = lesson.stages.slice(0, session.stage).reduce((n, st) => n + stageBlocks(st, session).length, 0) + session.block;
  const queue = dailyQueue(state.srs ?? {});

  const complete = blockComplete(block, session);
  const isLast = !nextPosition(lesson, session);

  const goNext = () => {
    setNotice(null);
    // Adaptive branch at the end of a stage's graded work (11 §5).
    const remainingGraded = blocks.slice(session.block + 1).some(isGraded);
    if (!remainingGraded && shouldBranch(stage, session)) {
      setNotice(stage.branch!.note);
      update((s) => ({ ...s, branches: [...s.branches, stage.id], block: s.block + 1 }));
      return;
    }
    const pos = nextPosition(lesson, session);
    if (pos) update((s) => ({ ...s, stage: pos.stage, block: pos.block }));
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  const goBack = () => {
    setNotice(null);
    if (session.block > 0) update((s) => ({ ...s, block: s.block - 1 }));
    else if (session.stage > 0) {
      const prev = lesson.stages[session.stage - 1];
      update((s) => ({ ...s, stage: s.stage - 1, block: stageBlocks(prev, s).length - 1 }));
    }
  };

  const finish = () => {
    const report = lessonReport(lesson, session);
    // Every mistake becomes a personal review item (11 §5 / 08 §5).
    actions.srsAdd(
      report.mistakes.map((m) =>
        newItem({ id: `e:${lesson.id}:${m.key}`, kind: "error", front: m.prompt, back: m.correct, note: m.explanation, source: { type: "lesson", ref: lesson.id, label: lesson.title } }),
      ),
    );
    update((s) => ({ ...s, status: "completed", completedAt: new Date().toISOString() }));
  };

  const saveWords = (words: { word: string; translation: string; example: string }[]) => {
    actions.srsAdd(words.map((w) => newItem({ id: wordId(w.word), kind: "word", front: w.word, back: w.translation, example: w.example, source: { type: "lesson", ref: lesson.id, label: lesson.title } })));
    update((s) => ({ ...s, savedWords: [...new Set([...s.savedWords, ...words.map((w) => w.word)])] }));
  };

  if (session.status === "completed") return <CompletedView lesson={lesson} session={session} ai={ai} onRestart={() => actions.lessonRestart(lesson.id, create)} />;

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      {/* Header: goal + stage */}
      <header className="flex flex-col gap-4 border-b border-line pb-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/lessons" className="inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-fg">
            <ArrowLeft className="size-3.5" /> Занятия
          </Link>
          <div className="flex items-center gap-2 text-[12.5px] text-subtle">
            {lesson.status === "demo" && <span className="rounded-full border border-line px-2 py-0.5">демо-урок</span>}
            <span className="tabular">
              {lesson.level} · {lesson.module}
            </span>
          </div>
        </div>
        <div>
          <h1 className="lang text-[26px] leading-tight text-fg sm:text-[32px]">{lesson.title}</h1>
          <p className="mt-1.5 max-w-[70ch] text-[14.5px] leading-relaxed text-muted">
            <span className="text-fg">Цель занятия:</span> {lesson.objective}
          </p>
        </div>
        <StageRail lesson={lesson} session={session} />
        <div className="h-1 overflow-hidden rounded-full bg-line" aria-label={`Пройдено ${doneBlocks} из ${totalBlocks}`}>
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${(doneBlocks / Math.max(1, totalBlocks)) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-subtle">
        <span className="font-medium text-fg">
          Этап {session.stage + 1} из {lesson.stages.length} · {stage.title}
        </span>
        <span>≈ {stage.minutes} мин</span>
        <span>· ведёт {ROLE[stage.role] ?? stage.role}</span>
        <span className="basis-full text-muted sm:basis-auto">— {stage.goal}</span>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-accent/30 bg-accent-muted/50 px-4 py-2.5 text-[14px] text-fg">
            {notice}
          </motion.p>
        )}
      </AnimatePresence>

      <main className="mt-8 min-h-[420px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${session.stage}-${block.id}`}
            data-block={block.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {renderBlock(block)}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-[calc(env(safe-area-inset-bottom)+64px)] z-10 mt-10 flex items-center justify-between gap-3 border-t border-line bg-bg/90 py-4 backdrop-blur md:bottom-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={goBack} disabled={session.stage === 0 && session.block === 0}>
            <ArrowLeft /> <span className="hidden sm:inline">Назад</span>
          </Button>
          <Link href="/lessons" className={buttonVariants({ variant: "ghost", size: "sm" })} title="Прогресс сохраняется автоматически">
            <Pause /> <span className="hidden sm:inline">Пауза</span>
          </Link>
        </div>
        {block.type === "summary" ? null : (
          <Button size="lg" onClick={goNext} disabled={!complete || isLast}>
            {complete ? (
              "Дальше"
            ) : (
              <>
                <span className="sm:hidden">Дальше</span>
                <span className="hidden sm:inline">{hintFor(block)}</span>
              </>
            )}{" "}
            <ArrowRight />
          </Button>
        )}
      </footer>
    </div>
  );

  function renderBlock(b: Block) {
    switch (b.type) {
      case "explain":
        return <ExplainBlock block={b} />;
      case "vocab":
        return <VocabBlock block={b} saved={session.savedWords} onSave={saveWords} />;
      case "choice":
        return <ChoiceBlock ctx={ctx} block={b} />;
      case "gap":
        return <GapBlock ctx={ctx} block={b} />;
      case "order":
        return <OrderBlock ctx={ctx} block={b} />;
      case "match":
        return <MatchBlock ctx={ctx} block={b} />;
      case "reading":
        return <ReadingBlock ctx={ctx} block={b} />;
      case "listening":
        return <ListeningBlock ctx={ctx} block={b} />;
      case "review":
        return <ReviewBlock ctx={ctx} block={b} plan={session.reviewPlan?.[b.id] ?? reviewPlanFor(b, queue)} onReview={(id, ok) => actions.srsReview(id, ok)} />;
      case "writing": {
        const w = session.writing[b.id];
        return (
          <WritingBlock
            ctx={ctx}
            block={b}
            submitted={w}
            onSubmit={(text) => update((s) => ({ ...s, writing: { ...s.writing, [b.id]: { text, words: text.split(/\s+/).length, submittedAt: new Date().toISOString() } } }))}
            evaluation={
              w && (
                <WritingEvaluation
                  lessonId={lesson.id}
                  blockId={b.id}
                  text={w.text}
                  ai={ai}
                  saved={w.evaluation}
                  onResult={(evaluation) => update((s) => ({ ...s, writing: { ...s.writing, [b.id]: { ...s.writing[b.id], evaluation } } }))}
                />
              )
            }
          />
        );
      }
      case "dialogue":
        return <DialogueBlock ctx={ctx} block={b} freePractice={<FreeDialogue lessonId={lesson.id} blockId={b.id} partner={b.partner} ai={ai} />} />;
      case "feedback":
        return <FeedbackStage lesson={lesson} session={session} onCorrect={(key, ok) => update((s) => ({ ...s, corrections: { ...s.corrections, [key]: ok } }))} />;
      case "summary":
        return <SummaryStage lesson={lesson} session={session} ai={ai} cando={b.cando} next={b.next} onAssess={(c, v) => update((s) => ({ ...s, selfAssessment: { ...(s.selfAssessment ?? {}), [c]: v } }))} onFinish={finish} />;
    }
  }
}

function hintFor(b: Block) {
  if (b.type === "writing") return "Сохраните текст";
  if (b.type === "dialogue") return "Закончите диалог";
  return "Ответьте, чтобы продолжить";
}

/** A block is complete when every graded item is answered (correctly or after the second try). */
export function blockComplete(b: Block, s: LessonSession): boolean {
  const settled = (k: string) => {
    const a = s.attempts[k];
    return !!a && (a.ok || a.tries >= 2);
  };
  switch (b.type) {
    case "writing":
      return !!s.writing[b.id];
    case "dialogue":
      return b.steps.every((st) => !!s.attempts[`${b.id}/${st.id}`]);
    case "match":
      return !!s.attempts[b.id];
    case "review": {
      const plan = s.reviewPlan?.[b.id];
      return !!plan && plan.every((p) => settled(p.key));
    }
    default: {
      const keys = blockKeys(b);
      return keys.every(settled);
    }
  }
}

function StageRail({ lesson, session }: { lesson: Lesson; session: LessonSession }) {
  return (
    <ol className="grid grid-cols-6 gap-1.5" aria-label="Этапы занятия">
      {lesson.stages.map((st, i) => (
        <li key={st.id} aria-current={i === session.stage ? "step" : undefined} className="min-w-0">
          <span className={cn("block h-1 rounded-full transition-colors", i < session.stage ? "bg-accent" : i === session.stage ? "bg-fg" : "bg-line")} />
          <span className={cn("mt-1.5 hidden truncate text-[12px] sm:block", i === session.stage ? "text-fg" : "text-subtle")}>{st.title}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ feedback */

function FeedbackStage({ lesson, session, onCorrect }: { lesson: Lesson; session: LessonSession; onCorrect: (key: string, ok: boolean) => void }) {
  const report = lessonReport(lesson, session);
  const best = [...report.stages].filter((s) => s.accuracy != null).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];
  return (
    <div className="max-w-[760px]">
      <BlockTitle eyebrow="Обратная связь" title="Разбор занятия" />
      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="text-[12px] font-medium tracking-[0.12em] text-success uppercase">Что получилось</p>
        <p className="mt-2 text-[15.5px] text-fg">
          {best && best.accuracy != null
            ? `${best.title}: ${Math.round(best.accuracy * 100)}% верно с первой попытки.`
            : "Вы прошли все этапы — дальше будет видно больше по результатам заданий."}
          {Object.keys(session.writing).length > 0 && " Текст для друга написан."}
        </p>
      </section>
      <section className="mt-5">
        <p className="text-[12px] font-medium tracking-[0.12em] text-accent-soft uppercase">Что улучшить</p>
        {report.feedback.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">Ошибок в заданиях нет — отлично. Новые слова уже можно повторять.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {report.feedback.map((m) => (
              <SelfCorrect key={m.key} item={m} done={session.corrections[m.key]} onDone={(ok) => onCorrect(m.key, ok)} />
            ))}
          </ul>
        )}
        {report.mistakes.length > report.feedback.length && (
          <p className="mt-3 text-[13px] text-subtle">
            Ещё {report.mistakes.length - report.feedback.length} {plural(report.mistakes.length - report.feedback.length, "ошибка", "ошибки", "ошибок")} записаны и попадут в повторение — разбираем не больше трёх за раз.
          </p>
        )}
      </section>
    </div>
  );
}

function SelfCorrect({ item, done, onDone }: { item: ReturnType<typeof lessonReport>["feedback"][number]; done?: boolean; onDone: (ok: boolean) => void }) {
  const [text, setText] = React.useState("");
  const [tries, setTries] = React.useState(0);
  const revealed = done !== undefined || tries >= 2;
  return (
    <li className="rounded-2xl border border-line bg-card p-5">
      <p className={cn("text-[15px]", /[А-Яа-я]/.test(item.prompt) ? "text-fg" : "lang text-fg")}>{item.prompt}</p>
      <p className="mt-2 text-[14px] text-muted">
        Ваш ответ: <span className="lang text-danger line-through decoration-danger/50">{item.yours}</span>
      </p>
      <p className="mt-1 text-[14px] text-muted">Подсказка: {item.explanation}</p>
      {!revealed ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = checkInput(text, [item.correct]);
            if (ok) onDone(true);
            else {
              setTries((t) => t + 1);
              if (tries + 1 >= 2) onDone(false);
            }
            setText("");
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} lang="en" placeholder="Исправьте сами" aria-label="Исправленный вариант" className="lang h-11 flex-1 rounded-xl border border-line bg-surface px-4 text-[16px] text-fg outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-subtle focus:border-accent" />
          <Button type="submit" disabled={!text.trim()}>
            Проверить
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-[14.5px]">
          {done ? <span className="text-success">Исправлено самостоятельно. </span> : null}
          Правильно: <span className="lang text-fg">{item.correct}</span>. Повторите вслух.
        </p>
      )}
      {!revealed && tries === 1 && <p className="mt-2 text-[13px] text-warning">Ещё одна попытка.</p>}
    </li>
  );
}

/* ------------------------------------------------------------- summary */

const ASSESS = [
  ["yes", "Могу"],
  ["almost", "Почти"],
  ["no", "Пока нет"],
] as const;

function SummaryStage({
  lesson,
  session,
  ai,
  cando,
  next,
  onAssess,
  onFinish,
}: {
  lesson: Lesson;
  session: LessonSession;
  ai: boolean;
  cando: string[];
  next?: string;
  onAssess: (c: string, v: "yes" | "almost" | "no") => void;
  onFinish: () => void;
}) {
  const report = lessonReport(lesson, session);
  const allAssessed = cando.every((c) => session.selfAssessment?.[c]);
  return (
    <div className="max-w-[760px]">
      <BlockTitle eyebrow="Итог" title="Что вы теперь умеете?" />
      <ul className="space-y-2.5">
        {cando.map((c) => (
          <li key={c} className="flex flex-col gap-2 rounded-2xl border border-line bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[15px] text-fg">{c}</span>
            <span className="flex gap-1.5">
              {ASSESS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={session.selfAssessment?.[c] === k}
                  onClick={() => onAssess(c, k)}
                  className={cn("h-9 rounded-full border px-3.5 text-[13px] transition-colors", session.selfAssessment?.[c] === k ? "border-accent bg-accent-muted text-fg" : "border-line text-muted hover:text-fg")}
                >
                  {label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <ReportTable report={report} />
      {next && <p className="mt-5 text-[14px] text-muted">{next}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={onFinish} disabled={!allAssessed}>
          <Check /> Завершить занятие
        </Button>
        {!allAssessed && <span className="text-[13px] text-subtle">Отметьте каждую цель</span>}
      </div>
      <div className="mt-4">
        <NextPlan ai={ai} />
      </div>
    </div>
  );
}

function ReportTable({ report }: { report: ReturnType<typeof lessonReport> }) {
  return (
    <div className="mt-6 rounded-2xl border border-line bg-card">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-line px-4 py-2.5 text-[12px] text-subtle">
        <span>Этап</span>
        <span className="text-right">С первой попытки</span>
        <span className="text-right">Время, мин</span>
      </div>
      {report.stages.map((s) => (
        <div key={s.id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-line/60 px-4 py-2.5 text-[14px] last:border-b-0">
          <span className="text-fg">
            {s.title}
            {s.branched && <span className="ml-2 text-[12px] text-subtle">+ доп. задания</span>}
            {s.criterion && <span className={cn("ml-2 text-[12px]", s.criterion.met ? "text-success" : "text-warning")}>{s.criterion.met ? "✓" : "·"} {s.criterion.label}</span>}
          </span>
          <span className="tabular text-right text-muted">{s.graded ? `${s.firstTry}/${s.graded}` : "—"}</span>
          <span className="tabular text-right text-muted">
            {s.minutesActual}/{s.minutesPlanned}
          </span>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-3 text-[13px] text-muted">
        <span>Слов в повторение: {report.savedWords.length}</span>
        <span>Ошибок в банк повторения: {report.mistakes.length}</span>
        <span>Письменных работ: {report.writingSubmitted}</span>
      </div>
    </div>
  );
}

function CompletedView({ lesson, session, ai, onRestart }: { lesson: Lesson; session: LessonSession; ai: boolean; onRestart: () => void }) {
  const report = lessonReport(lesson, session);
  const status = { met: "Цель занятия достигнута", partly: "Цель достигнута частично", not_yet: "Цель пока не достигнута — темы добавлены в повторение", no_data: "Недостаточно данных для оценки" }[report.objectiveStatus];
  return (
    <div className="mx-auto max-w-[760px] py-4">
      <Link href="/lessons" className="inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-fg">
        <ArrowLeft className="size-3.5" /> Занятия
      </Link>
      <p className="mt-6 text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Занятие завершено</p>
      <h1 className="lang mt-3 text-[34px] leading-tight text-fg sm:text-[44px]">{lesson.title}</h1>
      <p className="mt-3 text-[16px] text-muted">
        {status}. {report.accuracy != null && `С первой попытки — ${Math.round(report.accuracy * 100)}% заданий.`} Время: {report.minutesActual} мин из {lesson.minutes}.
      </p>
      <p className="mt-1 text-[13px] text-subtle">Итог считается только по заданиям этого занятия и не меняет ваш уровень.</p>
      <ReportTable report={report} />
      {session.selfAssessment && (
        <ul className="mt-5 space-y-1 text-[14px] text-muted">
          {Object.entries(session.selfAssessment).map(([c, v]) => (
            <li key={c}>
              {v === "yes" ? "✓" : v === "almost" ? "≈" : "·"} {c}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/vocabulary" className={buttonVariants({ size: "lg" })}>
          Повторить слова и ошибки <ArrowRight />
        </Link>
        <Button variant="secondary" size="lg" onClick={() => window.confirm("Пройти занятие заново? Текущие ответы будут сброшены.") && onRestart()}>
          <RotateCcw /> Пройти заново
        </Button>
      </div>
      <div className="mt-6">
        <NextPlan ai={ai} />
      </div>
    </div>
  );
}
