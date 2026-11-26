"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Experience, Goal, Intake, SelfLevel } from "@/lib/placement/types";

const GOALS: { id: Goal; label: string; hint: string }[] = [
  { id: "communication", label: "Свободно общаться", hint: "разговоры, друзья, знакомства" },
  { id: "travel", label: "Путешествия", hint: "аэропорт, отель, город" },
  { id: "work", label: "Работа", hint: "письма, встречи, карьера" },
  { id: "study", label: "Учёба", hint: "статьи, лекции, курсы" },
  { id: "exam", label: "Экзамен", hint: "IELTS, TOEFL и другие" },
  { id: "relocation", label: "Переезд", hint: "жизнь в другой стране" },
  { id: "self", label: "Для себя", hint: "фильмы, книги, интерес" },
];

const EXPERIENCE: { id: Experience; label: string; hint: string }[] = [
  { id: "none", label: "Не учил(а) английский", hint: "Короткая проверка на 3–5 минут, затем программа с самого начала." },
  { id: "some", label: "Учил(а) раньше", hint: "В школе, на курсах или сам(а) — и сделал(а) перерыв." },
  { id: "current", label: "Учу сейчас", hint: "Занимаюсь регулярно в последние месяцы." },
];

/** Simplified self-assessment grid in "I can…" form (CV Appendix 2 retold in Russian). */
const SELF: { id: SelfLevel; label: string; hint: string }[] = [
  { id: "A1", label: "Могу представиться и ответить на простые вопросы о себе", hint: "если собеседник говорит медленно" },
  { id: "A2", label: "Могу рассказать о своём дне, сделать покупку, спросить дорогу", hint: "короткими простыми фразами" },
  { id: "B1", label: "Могу поддержать разговор на знакомую тему и рассказать о поездке", hint: "с ошибками, но меня понимают" },
  { id: "B2", label: "Свободно обсуждаю разные темы и смотрю сериалы почти без субтитров", hint: "иногда подбираю слова" },
  { id: "C1", label: "Говорю и пишу почти так же свободно, как на родном языке", hint: "" },
  { id: "unknown", label: "Затрудняюсь ответить", hint: "Начнём с середины шкалы" },
];

const PACE = [3, 4, 5, 6];

type StepId = "name" | "goals" | "experience" | "self" | "pace" | "consent" | "ready";

export function IntakeWizard({
  defaultName,
  initial,
  onStart,
  busy,
  error,
}: {
  defaultName?: string;
  initial?: Partial<Intake>;
  onStart: (intake: Intake) => void;
  busy: boolean;
  error?: string | null;
}) {
  const reduce = useReducedMotion();
  const [form, setForm] = React.useState<Intake>({
    name: initial?.name ?? defaultName ?? "",
    goals: initial?.goals ?? [],
    experience: initial?.experience ?? "some",
    selfLevel: initial?.selfLevel ?? "unknown",
    pace: initial?.pace ?? 5,
    voiceConsent: initial?.voiceConsent ?? false,
  });
  const [touchedExperience, setTouchedExperience] = React.useState(Boolean(initial?.experience));
  const steps: StepId[] = ["name", "goals", "experience", ...(form.experience === "none" ? [] : (["self"] as StepId[])), "pace", "consent", "ready"];
  const [i, setI] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const step = steps[Math.min(i, steps.length - 1)];
  const go = (d: number) => {
    setDir(d);
    setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
  };
  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canNext =
    step === "goals" ? form.goals.length > 0 : step === "experience" ? touchedExperience : true;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-8 flex items-center gap-1.5" aria-label={`Шаг ${i + 1} из ${steps.length}`}>
        {steps.map((s, k) => (
          <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", k <= i ? "bg-accent" : "bg-line")} />
        ))}
      </div>

      <div className="relative min-h-[420px]">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {step === "name" && (
              <Question eyebrow="Знакомство" title="Как к вам обращаться?" hint="Имя увидите только вы — в приветствии и отчётах.">
                <input
                  autoFocus
                  value={form.name}
                  maxLength={60}
                  onChange={(e) => set("name", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && go(1)}
                  placeholder="Имя"
                  className="h-14 w-full rounded-xl border border-line bg-card px-5 text-[18px] text-fg outline-none transition-colors placeholder:text-subtle focus:border-accent"
                />
              </Question>
            )}

            {step === "goals" && (
              <Question eyebrow="Цель" title="Зачем вам английский?" hint="Можно выбрать несколько. От цели зависит, каким навыкам маршрут даст больше времени.">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {GOALS.map((g) => {
                    const on = form.goals.includes(g.id);
                    return (
                      <Tile
                        key={g.id}
                        selected={on}
                        multi
                        onClick={() => set("goals", on ? form.goals.filter((x) => x !== g.id) : [...form.goals, g.id])}
                        label={g.label}
                        hint={g.hint}
                      />
                    );
                  })}
                </div>
              </Question>
            )}

            {step === "experience" && (
              <Question eyebrow="Опыт" title="Вы уже изучали английский?">
                <div className="flex flex-col gap-2.5">
                  {EXPERIENCE.map((x) => (
                    <Tile
                      key={x.id}
                      selected={touchedExperience && form.experience === x.id}
                      onClick={() => {
                        set("experience", x.id);
                        setTouchedExperience(true);
                      }}
                      label={x.label}
                      hint={x.hint}
                    />
                  ))}
                </div>
              </Question>
            )}

            {step === "self" && (
              <Question eyebrow="Самооценка" title="Какое утверждение ближе всего к вам?" hint="Диагностика начнёт чуть ниже выбранного уровня, чтобы первые задания были посильными, а дальше подстроится сама.">
                <div className="flex flex-col gap-2">
                  {SELF.map((x) => (
                    <Tile key={x.id} selected={form.selfLevel === x.id} onClick={() => set("selfLevel", x.id)} label={x.label} hint={x.hint} compact />
                  ))}
                </div>
              </Question>
            )}

            {step === "pace" && (
              <Question eyebrow="Темп" title="Сколько занятий в неделю реально?" hint="Одно занятие — 60 минут. Темп можно поменять позже в настройках.">
                <div className="grid grid-cols-4 gap-2.5">
                  {PACE.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("pace", n)}
                      aria-pressed={form.pace === n}
                      className={cn(
                        "flex h-24 flex-col items-center justify-center rounded-xl border transition-colors",
                        form.pace === n ? "border-accent bg-accent-muted text-fg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg",
                      )}
                    >
                      <span className="font-[family-name:var(--font-display)] text-[34px] font-semibold leading-none tracking-[-0.04em]">{n}</span>
                      <span className="mt-1.5 text-[12px]">{n === 3 ? "занятия" : n === 4 ? "занятия" : "занятий"}</span>
                    </button>
                  ))}
                </div>
                <p className={cn("mt-4 text-[14px] leading-relaxed", form.pace < 4 ? "text-warning" : "text-subtle")}>
                  {form.pace < 4
                    ? "При трёх занятиях сроки увеличатся, а повторение может «проседать». Рекомендуем 4–6."
                    : `${form.pace} часов в неделю — комфортный темп для устойчивого прогресса.`}
                </p>
              </Question>
            )}

            {step === "consent" && (
              <Question eyebrow="Голос" title="Можно ли записывать ваш голос?" hint="Запись нужна для оценки устной речи и произношения.">
                <div className="rounded-xl border border-line bg-card p-5 text-[14px] leading-relaxed text-muted">
                  <ul className="space-y-2">
                    <li>• В этой версии устная часть диагностики ещё не проводится — голос не записывается и никуда не передаётся.</li>
                    <li>• Ваш ответ сохраняется заранее, чтобы спросить один раз. Изменить решение можно в любой момент.</li>
                    <li>• Записи не используются для обучения моделей без отдельного согласия.</li>
                  </ul>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Tile selected={form.voiceConsent} onClick={() => set("voiceConsent", true)} label="Да, разрешаю" hint="Когда устная часть появится" />
                  <Tile selected={!form.voiceConsent} onClick={() => set("voiceConsent", false)} label="Нет, не сейчас" hint="Устная речь останется неоценённой" />
                </div>
              </Question>
            )}

            {step === "ready" && (
              <Question eyebrow="Всё готово" title={form.experience === "none" ? "Короткая проверка с нуля" : "Как устроена диагностика"}>
                {form.experience === "none" ? (
                  <p className="text-[16px] leading-relaxed text-muted">
                    8 простых заданий, около 3–5 минут. Если они окажутся лёгкими, предложим полную диагностику — чтобы не начинать с самых азов.
                  </p>
                ) : (
                  <ol className="space-y-3 text-[15px] leading-relaxed text-muted">
                    {[
                      ["Словарь и грамматика", "Задания подстраиваются: после верных ответов — сложнее, после ошибок — проще."],
                      ["Чтение и аудирование", "Короткие тексты и диалоги с вопросами. Аудио озвучивает голос вашего браузера."],
                      ["Письмо", "Одно задание по вашему уровню. Текст сохранится — оценка появится позже."],
                      ["Устная речь", "В этой версии пока не проводится и будет отмечена как неоценённая."],
                    ].map(([t, d], k) => (
                      <li key={t} className="flex gap-4">
                        <span className="tabular mt-0.5 text-[13px] text-subtle">{String(k + 1).padStart(2, "0")}</span>
                        <span>
                          <span className="font-medium text-fg">{t}.</span> {d}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-[14px] leading-relaxed text-muted">
                  Честное «не знаю» лучше угадывания — так маршрут получится точнее. Около {form.experience === "none" ? "5" : "25–40"} минут; можно
                  сделать паузу и продолжить в течение 48 часов.
                </div>
                {error && <p className="mt-4 text-[14px] text-danger">{error}</p>}
              </Question>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => go(-1)} disabled={i === 0 || busy} className={cn(i === 0 && "invisible")}>
          <ArrowLeft /> Назад
        </Button>
        {step === "ready" ? (
          <Button size="lg" onClick={() => onStart({ ...form, name: form.name?.trim() || undefined })} disabled={busy}>
            {busy ? "Готовим задания…" : "Начать диагностику"} <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" onClick={() => go(1)} disabled={!canNext}>
            Далее <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

function Question({ eyebrow, title, hint, children }: { eyebrow: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[40px]">{title}</h2>
      {hint && <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Tile({
  selected,
  onClick,
  label,
  hint,
  multi,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  multi?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-start gap-4 rounded-xl border text-left transition-[border-color,background-color] duration-200",
        compact ? "px-4 py-3" : "px-5 py-4",
        selected ? "border-accent bg-accent-muted" : "border-line bg-card hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-accent bg-accent text-on-accent" : "border-line-strong",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span>
        <span className={cn("block text-fg", compact ? "text-[15px]" : "text-[16px] font-medium")}>{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-subtle">{hint}</span>}
      </span>
    </button>
  );
}
