"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Check, ClipboardList, Sparkles } from "lucide-react";
import { allLessons, levels, listeningFile, readingFile, sampleData, speakingFile, vocabularyFile, writingFile, type Lesson } from "@/lib/content";
import { useStore, useT } from "@/lib/store/store";
import {
  lessonsCompleted, mistakeStats, resolveBlock, skillSnapshot, studyStreak, todayProgress, vocabCounts,
} from "@/lib/store/selectors";
import type { LinguaState } from "@/lib/store/types";
import { cn, formatDate, pct, plural } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, SectionTitle, SKILL_LABEL, StatCard } from "@/components/shared/page";
import { SampleBadge, SamplePreviewBanner } from "@/components/shared/sample";
import { PlacementDashboardCard } from "@/components/placement/dashboard-card";

function greeting(t: ReturnType<typeof useT>) {
  const h = new Date().getHours();
  return h < 12 ? t.dashboard.greeting_morning : h < 18 ? t.dashboard.greeting_afternoon : t.dashboard.greeting_evening;
}

/** First English example in a lesson — used as a teaser in the serif voice. */
function lessonExample(l?: Lesson) {
  for (const b of l?.blocks ?? []) if (b.type === "examples" && b.items[0]) return b.items[0].en;
  return undefined;
}

const PRACTICE_HREF: Record<string, string> = {
  grammar: "/learning",
  vocabulary: "/vocabulary",
  reading: "/practice/reading",
  listening: "/practice/listening",
  speaking: "/practice/speaking",
  writing: "/practice/writing",
};

/** Rule-based next step from the learner's own data (not AI). */
function nextStep(state: LinguaState, skills: { skill: string; value: number }[]) {
  if (!state.assessments.length)
    return {
      title: "Пройди входной тест",
      body: "Двадцать минут на грамматику, словарь и чтение — и у тебя будет точка отсчёта для сравнения.",
      href: "/assessments/initial",
      cta: "Начать тест",
    };
  const weakest = [...skills].sort((a, b) => a.value - b.value)[0];
  if (weakest && weakest.value < 70) {
    const key = Object.keys(SKILL_LABEL).find((k) => SKILL_LABEL[k] === weakest.skill) ?? "grammar";
    return {
      title: `Удели больше времени: ${weakest.skill.toLowerCase()}`,
      body: `Это самый низкий результат в последнем тесте (${weakest.value}%). Один дополнительный блок практики на этой неделе поможет.`,
      href: PRACTICE_HREF[key] ?? "/learning",
      cta: `Потренировать: ${weakest.skill.toLowerCase()}`,
    };
  }
  const last = state.assessments[0];
  const days = (Date.now() - new Date(last.completedAt).getTime()) / 86_400_000;
  if (days >= 7)
    return {
      title: "Пора проверить неделю",
      body: "Короткий тест покажет, что изменила неделя практики.",
      href: "/assessments/weekly",
      cta: "Пройти недельный тест",
    };
  return {
    title: "Сохраняй ритм",
    body: "Результаты ровные. Продолжай со следующего урока программы.",
    href: "/learning",
    cta: "Открыть «Моё обучение»",
  };
}

export function DashboardView() {
  const { state, actions } = useStore();
  const t = useT();
  const reduce = useReducedMotion();
  const sample = state.settings.samplePreview;
  const today = todayProgress(state);

  const level = sample ? sampleData.level : state.settings.currentLevel;
  const levelInfo = levels.find((l) => l.id === level);
  const nextLesson = allLessons.find((l) => state.lessons[l.id]?.status !== "completed" && l.blocks.length > 0);
  const firstOpen = today.blocks.find((b) => !today.done.includes(b.id));
  const firstOpenR = firstOpen ? resolveBlock(firstOpen) : null;

  const latest = skillSnapshot(state, "latest");
  const skills = sample
    ? sampleData.skills.map((s) => ({ skill: s.skill, value: s.current }))
    : Object.entries(latest).map(([k, v]) => ({ skill: SKILL_LABEL[k] ?? k, value: v }));

  const results = sample
    ? sampleData.assessments.slice().reverse().map((a) => ({ id: a.date + a.title, title: a.title, when: formatDate(a.date), score: a.score }))
    : [
        ...state.assessments.map((a) => ({ id: a.id, title: a.title, at: a.completedAt, score: pct(a.score, a.total) })),
        ...Object.entries(state.reading).map(([id, r]) => ({ id: "r" + id, title: "Чтение", at: r.completedAt, score: pct(r.score, r.total) })),
        ...Object.entries(state.listening).map(([id, r]) => ({ id: "l" + id, title: "Аудирование", at: r.completedAt, score: pct(r.score, r.total) })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5)
        .map((r) => ({ ...r, when: formatDate(r.at) }));

  const figures = sample
    ? { streak: sampleData.streak, words: sampleData.wordsLearned, lessons: sampleData.lessonsCompleted }
    : { streak: studyStreak(state), words: vocabCounts(state, vocabularyFile.words.length).learned, lessons: lessonsCompleted(state) };

  const step = nextStep(state, skills);
  const weak = sample ? sampleData.weakAreas : mistakeStats(state).slice(0, 3).map((m) => m.category);

  const continueHref = firstOpenR?.href ?? (nextLesson ? `/learning/${nextLesson.id}` : "/learning");

  // What the next block is actually about, shown in the language voice.
  const teaser = (() => {
    const skill = firstOpenR?.resolvedSkill ?? "grammar";
    if (skill === "vocabulary") {
      const w = vocabularyFile.words.find((x) => (state.vocabulary[x.id]?.status ?? "new") !== "learned");
      return w ? { title: "Повторение слов", line: w.word, sub: `${w.ipa ?? ""}  ${w.translation}`.trim() } : null;
    }
    if (skill === "reading") return { title: readingFile.exercises[0].title, line: readingFile.exercises[0].text.split(". ")[0] + ".", sub: undefined };
    if (skill === "listening") return { title: listeningFile.exercises[0].title, line: undefined, sub: "Сначала послушай, потом ответь на вопросы." };
    if (skill === "speaking") return { title: speakingFile.tasks[0].title, line: speakingFile.tasks[0].prompt, sub: undefined };
    if (skill === "writing") return { title: writingFile.tasks[0].title, line: writingFile.tasks[0].instructions, sub: undefined };
    if (skill === "review") return { title: "Повторение", line: undefined, sub: "Вспомни сегодняшние ошибки и запиши одну вещь, которую узнал." };
    return nextLesson ? { title: nextLesson.title, line: lessonExample(nextLesson), sub: undefined } : null;
  })();
  const continueTitle = teaser?.title ?? "Твоя программа";

  return (
    <div className="space-y-12">
      <SamplePreviewBanner />

      {/* Greeting */}
      <header>
        <p className="text-[14px] text-muted">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[44px]">
          {greeting(t)}, {state.settings.displayName || "Ученик"}.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-muted">
          {state.settings.mainGoal}
          {level ? `. Сейчас ${level}${levelInfo ? ` (${levelInfo.name.toLowerCase()})` : ""}, цель — ${state.settings.targetLevel}.` : `. Цель — ${state.settings.targetLevel}.`}
          {sample && <SampleBadge className="ml-2 align-middle" />}
        </p>
      </header>

      <PlacementDashboardCard />

      {/* Continue + today */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div className="rounded-xl border border-line bg-card p-6 shadow-lift sm:p-8">
          <p className="text-[13.5px] text-muted">
            {firstOpenR ? `Дальше: ${firstOpenR.title}, ${firstOpen!.minutes} мин` : today.blocks.length ? "План на сегодня выполнен" : "Дальше"}
          </p>
          <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[28px]">{continueTitle}</h2>
          {teaser?.line && <p className="lang mt-5 line-clamp-2 max-w-[48ch] text-[19px] italic leading-relaxed text-fg/80">{teaser.line}</p>}
          {teaser?.sub && <p className="mt-2 text-[14px] text-muted">{teaser.sub}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={continueHref} className={buttonVariants({ size: "lg" })}>
              Продолжить обучение
            </Link>
            <Link href="/daily-plan" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              План на день
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[16px] font-semibold text-fg">Сегодня</h2>
            <span className="tabular text-[14px] text-muted">
              {today.minutesDone} из {today.total} мин
            </span>
          </div>
          <div className="mt-3 flex h-2 gap-[3px]" aria-hidden>
            {today.blocks.map((b) => (
              <span key={b.id} style={{ flexGrow: b.minutes }} className="relative overflow-hidden rounded-full bg-elevated">
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-accent"
                  initial={false}
                  animate={{ scaleX: today.done.includes(b.id) ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                />
              </span>
            ))}
          </div>
          <ul className="mt-4 divide-y divide-line">
            {today.blocks.map((b) => {
              const r = resolveBlock(b);
              const done = today.done.includes(b.id);
              return (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`${done ? "Снять отметку" : "Отметить выполненным"}: ${r.title}`}
                    onClick={() => actions.togglePlanBlock(b.id, r.title)}
                    className={cn(
                      "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
                      done ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent",
                    )}
                  >
                    {done && <Check className="size-3" strokeWidth={3} />}
                  </button>
                  <Link href={r.href ?? "/daily-plan"} className={cn("flex-1 text-[14.5px] hover:underline hover:underline-offset-4", done ? "text-muted line-through decoration-line-strong" : "text-fg")}>
                    {r.title}
                  </Link>
                  <span className="tabular text-[13px] text-subtle">{b.minutes} мин</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Figures */}
      <section className="grid grid-cols-3 gap-6 sm:gap-10">
        <StatCard label="Дней подряд" value={`${figures.streak} ${plural(figures.streak, "день", "дня", "дней")}`} />
        <StatCard label="Слов выучено" value={figures.words} hint={sample ? undefined : `из ${vocabularyFile.words.length}`} />
        <StatCard label="Уроков пройдено" value={figures.lessons} hint={sample ? undefined : `из ${allLessons.length}`} />
      </section>

      {/* Skills + results */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <SectionTitle action={sample ? <SampleBadge /> : <Link href="/progress" className="text-accent-soft hover:text-fg">Прогресс</Link>}>
            Твои навыки
          </SectionTitle>
          {skills.length ? (
            <ul className="space-y-3.5">
              {skills.map((s) => (
                <li key={s.skill} className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-4 text-[14px]">
                  <span className="text-fg">{s.skill}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-elevated">
                    <motion.span
                      className="block h-full origin-left rounded-full bg-accent"
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: s.value / 100 }}
                      transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                  </span>
                  <span className="tabular text-right text-muted">{s.value}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Оценок по навыкам пока нет"
              description="Они появятся после первого теста."
              action={<Link href="/assessments/initial" className={buttonVariants({ variant: "secondary", size: "sm" })}>Пройти тест</Link>}
            />
          )}
        </div>

        <div>
          <SectionTitle action={sample ? <SampleBadge /> : <Link href="/assessments" className="text-accent-soft hover:text-fg">Все результаты</Link>}>
            Последние результаты
          </SectionTitle>
          {results.length ? (
            <ul className="divide-y divide-line">
              {results.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-4 py-2.5 text-[14px]">
                  <span className="min-w-0 truncate text-fg">{r.title}</span>
                  <span className="flex shrink-0 items-baseline gap-4">
                    <span className="text-subtle">{r.when}</span>
                    <span className="tabular w-10 text-right font-medium text-fg">{r.score}%</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] leading-relaxed text-muted">Здесь появятся результаты тестов и практики.</p>
          )}
        </div>
      </section>

      {/* Next step + tutor note */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="border-l-2 border-accent pl-5">
          <p className="text-[13px] text-muted">Следующий шаг — по твоим результатам</p>
          <h3 className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em] text-fg">{step.title}</h3>
          <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">{step.body}</p>
          <Link href={step.href} className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}>
            {step.cta}
          </Link>
          {weak.length > 0 && (
            <p className="mt-5 text-[13.5px] text-muted">
              Частые ошибки: <span className="text-fg">{weak.join(", ")}</span>
            </p>
          )}
        </div>

        <div className="border-l-2 border-line-strong pl-5">
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            <Sparkles className="size-3.5" /> Записка репетитора за неделю
            {sample && <SampleBadge className="ml-1" />}
          </p>
          {sample ? (
            <>
              <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-fg">{sampleData.tutorReport.summary}</p>
              <ul className="mt-3 space-y-1.5 text-[14px] text-muted">
                {sampleData.tutorReport.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
              Записки пока не формируются. Репетитор начнёт писать их по твоим занятиям, когда включим отчёты.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
