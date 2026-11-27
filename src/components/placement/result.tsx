"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CircleDashed, Info, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, plural } from "@/lib/utils";
import { SUBLEVELS, type PlacementResult, type RouteModule, type SkillKey, type SkillResult } from "@/lib/placement/types";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const CONF_TEXT = { high: "высокая", medium: "средняя", low: "низкая" } as const;
const SKILL_NAME: Record<string, string> = {
  listening: "Аудирование",
  reading: "Чтение",
  speaking: "Устная речь",
  writing: "Письмо",
  grammar: "Грамматика",
  vocabulary: "Словарь",
};

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

export function ResultView({
  result,
  completedAt,
  canRestart,
  pilotEarlyRetake,
  retestAfter,
  onRestart,
  onFullMode,
  onDispute,
  onEvaluateWriting,
}: {
  result: PlacementResult;
  completedAt?: string | null;
  canRestart: boolean;
  pilotEarlyRetake: boolean;
  retestAfter: string | null;
  onRestart: () => void;
  onFullMode: () => void;
  onDispute: (direction: "higher" | "lower" | "other", comment: string) => Promise<string | null>;
  onEvaluateWriting?: () => Promise<string | null>;
}) {
  const r = result;
  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-14">
      {/* Level */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
        <Reveal>
          <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Ориентировочный уровень</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[64px] font-semibold leading-[0.92] tracking-[-0.05em] text-fg sm:text-[96px]">
            {r.overall == null ? "—" : r.aboveRange || r.overallLabel.startsWith("не ниже") ? "B2+" : r.overallLabel}
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[12.5px] text-muted">
            <span className="size-1.5 rounded-full bg-warning" aria-hidden />
            Предварительно · не подтверждённый уровень CEFR
          </p>
          {(r.aboveRange || r.overallLabel.startsWith("не ниже") || r.mode === "zero") && <p className="mt-3 text-[18px] text-fg">{r.overallLabel}</p>}
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-muted">{r.meaning}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] text-muted">Уверенность в оценке</span>
              <ConfidenceMeter value={r.confidence} />
            </div>
            <ul className="mt-4 space-y-1.5 text-[13.5px] leading-relaxed text-subtle">
              {r.confidenceReasons.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
              <Info className="mr-1.5 inline size-3.5 -translate-y-px text-accent-soft" />
              {r.disclaimers[0]}
              {completedAt && <span className="text-subtle"> Диагностика от {new Date(completedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}.</span>}
            </p>
          </div>
        </Reveal>
      </section>

      {r.recheck && (
        <Reveal delay={0.12}>
          <div className="rounded-2xl border border-line bg-card p-5 text-[14.5px] leading-relaxed text-muted">
            <p className="font-medium text-fg">
              Перепроверка {r.recheck.direction === "higher" ? "более высокого" : "более низкого"} уровня ({r.recheck.target}):{" "}
              {r.recheck.supported ? "подтвердила ваше мнение" : "не подтвердила изменение"}
            </p>
            <p className="mt-1">
              Грамматика — {r.recheck.grammar}, чтение — {r.recheck.reading}.{" "}
              {r.recheck.changed ? `Уровень изменён: было ${r.recheck.previous}, стало ${r.overallLabel}. Маршрут пересчитан.` : "Уровень и маршрут сохранены."}
            </p>
          </div>
        </Reveal>
      )}

      {r.offerFullMode && (
        <Reveal delay={0.15}>
          <div className="flex flex-col gap-4 rounded-2xl border border-accent/40 bg-accent-muted p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-fg">Похоже, вы знаете больше, чем «с нуля»</h2>
              <p className="mt-1 text-[14px] text-muted">Пройдите полную диагностику — маршрут может начаться не с самых азов.</p>
            </div>
            <Button size="lg" onClick={onFullMode}>
              Полная диагностика <ArrowRight />
            </Button>
          </div>
        </Reveal>
      )}

      {/* Profile */}
      {r.mode === "full" && (
        <Reveal delay={0.15}>
          <SectionHead title="Профиль навыков" note="Каждый навык — на своей шкале. Цифры не сводятся в один балл." />
          <div className="rounded-2xl border border-line bg-card">
            <ScaleHeader />
            {(["listening", "reading", "speaking", "writing"] as SkillKey[]).map((k) => (
              <SkillRow key={k} name={SKILL_NAME[k]} s={r.skills[k]} />
            ))}
            <div className="border-t border-line px-5 pt-4 pb-1 text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Языковые компоненты</div>
            {(["grammar", "vocabulary"] as const).map((k) => (
              <SkillRow key={k} name={SKILL_NAME[k]} s={r.components[k]} />
            ))}
          </div>
        </Reveal>
      )}

      {r.mode === "full" && <WritingSection result={r} onEvaluate={onEvaluateWriting} />}

      {/* Strengths & gaps */}
      <Reveal delay={0.2} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <SectionHead title="Сильные стороны" />
          {r.strengths.length ? (
            <ul className="space-y-2">
              {r.strengths.map((x) => (
                <li key={x} className="rounded-xl border border-line bg-card px-4 py-3 text-[14.5px] text-fg">{x}</li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[14px] text-subtle">
              Пока не выявлены — навыки на одном уровне или проверены не все.
            </p>
          )}
        </div>
        <div>
          <SectionHead title="Над чем работать" />
          <ul className="space-y-2">
            {r.recommendations.map((x) => (
              <li key={x} className="flex gap-3 rounded-xl border border-line bg-card px-4 py-3 text-[14.5px] leading-snug text-fg">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
          {r.gaps.filter((g) => g.kind !== "skill").length > 0 && (
            <p className="mt-3 text-[13px] text-subtle">
              Пробел засчитан, только если тема проверялась минимум двумя заданиями и обе ошибки повторились.
            </p>
          )}
        </div>
      </Reveal>

      {/* Route */}
      <Reveal delay={0.25}>
        <SectionHead title="Ваш маршрут" note={`Правила маршрута: ${r.route.rulesVersion}`} />
        <RouteBlock result={r} />
      </Reveal>

      {/* Disclaimers & actions */}
      <Reveal delay={0.3}>
        <div className="rounded-2xl border border-line bg-surface p-5 text-[13.5px] leading-relaxed text-muted">
          <p className="mb-2 font-medium text-fg">Важно</p>
          <ul className="space-y-1.5">
            {r.disclaimers.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
        </div>
        {!r.recheck && <DisputeBox result={r} onDispute={onDispute} />}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/learning" className={buttonVariants({ size: "lg" })}>
            Перейти к обучению <ArrowRight />
          </Link>
          {canRestart && (
            <Button variant="secondary" size="lg" onClick={onRestart}>
              <RotateCcw /> Пройти заново
            </Button>
          )}
        </div>
        {retestAfter && (
          <p className="mt-3 text-[13px] text-subtle">
            Обычно повторная диагностика доступна раз в 14 дней (следующая — с {new Date(retestAfter).toLocaleDateString("ru-RU")}).
            {pilotEarlyRetake && " В пилотной версии её можно пройти раньше, чтобы проверить логику."}
          </p>
        )}
      </Reveal>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[22px] font-semibold tracking-[-0.025em] text-fg">{title}</h2>
      {note && <span className="text-[12.5px] text-subtle">{note}</span>}
    </div>
  );
}

function ConfidenceMeter({ value }: { value: "high" | "medium" | "low" }) {
  const n = value === "high" ? 3 : value === "medium" ? 2 : 1;
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2 w-5 rounded-full", i <= n ? "bg-accent" : "bg-line")} />
        ))}
      </span>
      <span className="text-[14px] font-medium text-fg">{CONF_TEXT[value]}</span>
    </span>
  );
}

function ScaleHeader() {
  return (
    <div className="hidden grid-cols-[150px_minmax(0,1fr)_120px] items-end gap-4 px-5 pt-4 pb-2 md:grid">
      <span />
      <div className="grid grid-cols-9 text-center text-[11px] text-subtle">
        {SUBLEVELS.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <span />
    </div>
  );
}

function SkillRow({ name, s }: { name: string; s: SkillResult }) {
  const reduce = useReducedMotion();
  const pos = s.sublevel == null ? null : Math.max(-1, s.sublevel);
  return (
    <div className="grid grid-cols-1 gap-2 border-t border-line px-5 py-4 first:border-t-0 md:grid-cols-[150px_minmax(0,1fr)_120px] md:items-center md:gap-4">
      <div className="flex items-baseline justify-between md:block">
        <span className="text-[15px] font-medium text-fg">{name}</span>
        <span className="text-[14px] text-fg md:hidden">{s.label}</span>
      </div>
      {pos == null ? (
        <div className="flex items-center gap-2 text-[13px] text-subtle">
          <CircleDashed className="size-4 shrink-0" />
          <span>{s.note ?? "не оценено"}</span>
        </div>
      ) : (
        <div>
          <div className="relative grid h-3 grid-cols-9 gap-1" aria-label={`${name}: ${s.label}`}>
            {SUBLEVELS.map((_, i) => (
              <motion.span
                key={i}
                className={cn("rounded-full", i <= pos ? "bg-accent" : "bg-line")}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.04, ease: EASE }}
                style={{ originX: 0 }}
              />
            ))}
          </div>
          {s.note && <p className="mt-2 text-[12.5px] text-subtle">{s.note}</p>}
        </div>
      )}
      <div className="hidden text-right md:block">
        <span className="text-[15px] text-fg">{s.label}</span>
        {s.confidence && <span className="block text-[12px] text-subtle">{s.confirmedBy === "expert" ? "подтверждено специалистом" : `уверенность: ${CONF_TEXT[s.confidence]}`}</span>}
        {!s.assessed && s.preliminary && <span className="block text-[12px] text-accent-soft">AI · предв. {s.preliminary.label}</span>}
      </div>
    </div>
  );
}

const STATUS: Record<RouteModule["status"], { label: string; cls: string }> = {
  credited: { label: "засчитан", cls: "text-subtle" },
  credited_check: { label: "засчитан предварительно", cls: "text-subtle" },
  start: { label: "старт", cls: "text-on-primary bg-primary" },
  next: { label: "следующий", cls: "text-fg" },
  upcoming: { label: "", cls: "text-subtle" },
};

function RouteBlock({ result }: { result: PlacementResult }) {
  const route = result.route;
  const start = route.modules.find((m) => m.status === "start");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Стартовый модуль</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="tabular text-[15px] text-accent-soft">{route.startModule}</span>
            <span className="lang text-[30px] leading-tight text-fg">{route.startTitle}</span>
          </div>
          {start && <p className="mt-1 text-[14px] text-muted">{start.subtitle}</p>}
          {route.path != null && route.level === "A1" && (
            <p className="mt-3 text-[13.5px] text-subtle">Путь {route.path}{route.path === 0 ? " — с опорой на русский и без спешки" : route.path === 2 ? " — восстановление" : ""}.</p>
          )}
          <div className={cn("mt-5 rounded-xl border p-4 text-[14px] leading-relaxed", route.content.ready ? "border-success/40 text-fg" : "border-line bg-surface text-muted")}>
            {route.content.message}
            {route.content.practiceModuleId && (
              <Link href="/learning" className="mt-2 inline-flex items-center gap-1 text-accent-soft underline underline-offset-4">
                Открыть уроки уровня {route.level} <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card">
          <p className="px-5 pt-4 text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Уровень {route.level}: модули</p>
          <ol className="mt-2 divide-y divide-line">
            {route.modules.map((m) => (
              <li key={m.code} className={cn("flex items-center gap-4 px-5 py-3", m.status === "start" && "bg-accent-muted/60")}>
                <span className={cn("tabular w-[52px] shrink-0 text-[12.5px]", m.status === "start" ? "text-accent-soft" : "text-subtle")}>{m.code}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("lang block truncate text-[15.5px]", m.status === "credited" || m.status === "credited_check" ? "text-subtle line-through decoration-line-strong" : "text-fg")}>
                    {m.title}
                  </span>
                  {m.note && <span className="block text-[12px] text-subtle">{m.note}</span>}
                </span>
                {STATUS[m.status].label && <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px]", STATUS[m.status].cls)}>{STATUS[m.status].label}</span>}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Темп и прогноз</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-[40px] font-semibold leading-none tracking-[-0.04em] text-fg">
            ≈ {route.weeksLeft} <span className="text-[18px] font-normal tracking-normal text-muted">{plural(route.weeksLeft, "неделя", "недели", "недель")}</span>
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            до конца уровня {route.level}: около {route.lessonsLeft} {plural(route.lessonsLeft, "занятия", "занятий", "занятий")} при {route.pace} в неделю.
            Это оценка, а не обещание — пересчитаем после каждой контрольной точки.
          </p>
          {route.paceWarning && <p className="mt-3 text-[13px] text-warning">{route.paceWarning}</p>}
        </div>

        {route.prioritySkills.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Приоритеты</p>
            <ul className="mt-3 space-y-2 text-[14px] text-fg">
              {route.prioritySkills.map((p) => (
                <li key={p.skill + p.reason}>{p.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {route.review.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Повторение</p>
            <ul className="mt-3 space-y-2.5 text-[14px]">
              {route.review.map((x) => (
                <li key={x.label}>
                  <span className="text-fg">{x.label}</span>
                  <span className="block text-[12px] text-subtle">
                    {x.how === "microlesson" ? "микроурок в первых занятиях" : "банк повторения"}
                    {x.module ? ` · ${x.module}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="group rounded-2xl border border-line bg-card p-5">
          <summary className="cursor-pointer list-none text-[14px] font-medium text-fg">
            Почему такой маршрут <span className="text-subtle group-open:hidden">— показать</span>
          </summary>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
            {route.explanations.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        </details>
      </aside>
    </div>
  );
}

function DisputeBox({ result, onDispute }: { result: PlacementResult; onDispute: (d: "higher" | "lower" | "other", c: string) => Promise<string | null> }) {
  const [open, setOpen] = React.useState(false);
  const [dir, setDir] = React.useState<"higher" | "lower" | "other">("higher");
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  if (result.dispute && result.dispute.direction === "other" && !msg) {
    return <p className="mt-6 text-[13.5px] text-subtle">Ваш отзыв об уровне сохранён. Спасибо — он поможет откалибровать диагностику.</p>;
  }
  return (
    <div className="mt-6 rounded-2xl border border-line bg-card p-5">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-fg">Не согласны с уровнем?</p>
            <p className="text-[13.5px] text-subtle">Короткая перепроверка на соседнем уровне — около 7 минут.</p>
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Сообщить о несогласии
          </Button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(await onDispute(dir, comment));
            setBusy(false);
          }}
        >
          <p className="text-[15px] font-medium text-fg">Каким вам кажется ваш уровень?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["higher", "Выше"],
                ["lower", "Ниже"],
                ["other", "Другое"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={dir === k}
                onClick={() => setDir(k)}
                className={cn("h-10 rounded-full border px-4 text-[14px] transition-colors", dir === k ? "border-accent bg-accent-muted text-fg" : "border-line text-muted hover:text-fg")}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Почему? Например: «читаю книги в оригинале, но тест показал A2»"
            className="mt-3 w-full rounded-xl border border-line bg-surface p-3 text-[14.5px] text-fg outline-none placeholder:text-subtle focus:border-accent"
          />
          <p className="mt-2 text-[12.5px] text-subtle">
            {dir === "other"
              ? "Отзыв сохранится и поможет откалибровать диагностику."
              : "Сразу начнётся короткая перепроверка: 5 заданий по грамматике и один текст на соседнем уровне. Уровень изменится только если результаты это подтвердят."}
          </p>
          {msg && <p className="mt-2 text-[13.5px] text-fg">{msg}</p>}
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={busy}>
              {dir === "other" ? "Отправить" : "Начать перепроверку"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Отмена
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const CRIT_RU: Record<string, string> = { task: "Выполнение задачи", range: "Словарь и структуры", coherence: "Связность", accuracy: "Точность" };

function WritingSection({ result, onEvaluate }: { result: PlacementResult; onEvaluate?: () => Promise<string | null> }) {
  const ai = result.writingAi;
  const ex = result.writingExpert;
  const submitted = result.skills.writing.note?.includes("текст сохранён") || !!ai || !!ex;
  const [state, setState] = React.useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const started = React.useRef(false);
  React.useEffect(() => {
    if (!submitted || ai || ex || !onEvaluate || started.current) return;
    started.current = true;
    setState({ busy: true, error: null });
    onEvaluate().then((err) => setState({ busy: false, error: err }));
  }, [submitted, ai, ex, onEvaluate]);
  if (!submitted) return null;
  return (
    <Reveal delay={0.18}>
      <SectionHead title="Письмо" note="Оценка по рубрике CV: выполнение задачи, словарь, связность, точность" />
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {ex ? (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12px] text-success">Подтверждено специалистом: {ex.level}</span>
          ) : (
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-subtle">Ожидает проверки специалистом</span>
          )}
          {ai && <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-[12px] text-accent-soft">AI · предварительно: {ai.estimated_level}</span>}
        </div>
        {state.busy && <p className="mt-3 text-[14px] text-muted">Оцениваем письмо по рубрике…</p>}
        {state.error && !ai && <p className="mt-3 text-[13.5px] text-subtle">{state.error}</p>}
        {ai && (
          <>
            <ul className="mt-4 divide-y divide-line/60">
              {ai.criteria.map((c) => (
                <li key={c.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                  <span className="w-[190px] shrink-0 text-[13.5px] text-muted">{CRIT_RU[c.name]}</span>
                  <span className="text-[13.5px] text-fg">
                    <span className="font-medium">{c.level}</span> — {c.comment}
                  </span>
                </li>
              ))}
            </ul>
            {ai.corrections.length > 0 && (
              <ul className="mt-3 space-y-2">
                {ai.corrections.map((c, i) => (
                  <li key={i} className="rounded-xl bg-surface px-3 py-2 text-[14px]">
                    <span className="lang text-subtle line-through">{c.original}</span> → <span className="lang text-fg">{c.corrected}</span>
                    <span className="block text-[13px] text-muted">{c.why}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-subtle">
              AI-оценка предварительная (уверенность: {CONF_TEXT[ai.confidence]}{ai.pasteFlagged ? "; текст вставлен из буфера — ненадёжно" : ""}). Она не входит в уровень, пока
              письмо не подтвердит специалист.
            </p>
          </>
        )}
        {ex?.comment && <p className="mt-3 text-[14px] text-fg">Комментарий специалиста: {ex.comment}</p>}
      </div>
    </Reveal>
  );
}
