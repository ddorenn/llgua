"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { runTutorTask } from "@/lib/ai/client";
import type { Report } from "@/lib/analytics/report";
import type { TaskOutputOf } from "@/lib/ai/tasks";
import { cn } from "@/lib/utils";

const SKILL_RU: Record<string, string> = { grammar: "Грамматика", vocabulary: "Словарь", reading: "Чтение", listening: "Аудирование", interaction: "Диалог", writing: "Письмо", speaking: "Устная речь" };
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const date = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const OBJ: Record<string, string> = { met: "цель достигнута", partly: "частично", not_yet: "пока нет", no_data: "нет данных" };

export default function ReportPage() {
  const [r, setR] = React.useState<Report | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch("/api/report", { cache: "no-store" })
      .then((x) => (x.ok ? x.json() : Promise.reject(x.status)))
      .then(setR, () => setErr("Не удалось загрузить отчёт. Попробуйте обновить страницу."));
  }, []);
  if (err) return <p className="py-20 text-center text-[14px] text-muted">{err}</p>;
  if (!r) return <p className="py-20 text-center text-[14px] text-subtle">Собираем отчёт…</p>;
  const w = r.week;
  const empty = !w.lessons && !w.answers && !w.reviews;

  return (
    <div className="mx-auto max-w-[1000px] space-y-12">
      <header>
        <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Недельный отчёт</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[44px]">
          {date(w.from)} — {date(w.to)}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          Всё ниже посчитано на сервере из ваших ответов в занятиях, повторений и диагностик. Нет данных — нет цифры.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 sm:grid-cols-4">
        {[
          ["Занятий", String(w.lessons), w.previous.lessons ? `неделей раньше: ${w.previous.lessons}` : null],
          ["Минут в занятиях", String(w.minutes), null],
          ["С первой попытки", pct(w.firstTryAccuracy), w.answers ? `${w.answers} ответов` : null],
          ["Повторений", String(w.reviews), w.reviewAccuracy != null ? `верно ${pct(w.reviewAccuracy)}` : null],
        ].map(([k, v, sub]) => (
          <div key={k as string}>
            <p className="text-[13px] text-muted">{k}</p>
            <p className="tabular mt-1 text-[30px] font-semibold tracking-[-0.03em] text-fg">{v}</p>
            {sub && <p className="text-[12.5px] text-subtle">{sub}</p>}
          </div>
        ))}
      </section>
      {empty && <p className="-mt-8 text-[14px] text-subtle">На этой неделе ещё нет занятий и повторений — отчёт заполнится, когда они появятся.</p>}

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-fg">Рекомендации</h2>
          {r.recommendations.length ? (
            <ul className="mt-4 space-y-2">
              {r.recommendations.map((x) => (
                <li key={x} className="flex gap-3 rounded-xl border border-line bg-card px-4 py-3 text-[14.5px] text-fg">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-subtle">Пока нечего советовать — продолжайте по плану.</p>
          )}
          <TutorComment />
        </div>
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">Повторная диагностика</p>
          {r.retest.lastAt ? (
            <>
              <p className="mt-3 text-[15px] text-fg">
                {r.retest.due ? "Пора пройти повторную диагностику" : `Следующая — с ${date(r.retest.availableFrom!)}`}
              </p>
              <p className="mt-1 text-[13px] text-subtle">
                Последняя: {date(r.retest.lastAt)}. Интервал — {r.retest.intervalDays} дней, чтобы изменения были заметны.
              </p>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-muted">Входная диагностика ещё не пройдена.</p>
          )}
          <Link href="/placement" className={cn(buttonVariants({ variant: r.retest.due || !r.retest.lastAt ? "primary" : "secondary" }), "mt-4")}>
            {r.retest.lastAt ? "Открыть диагностику" : "Пройти диагностику"} <ArrowRight />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-fg">Динамика навыков</h2>
        <p className="mt-1 text-[13px] text-subtle">По диагностикам (уровень) и по занятиям (верно с первой попытки по неделям). Уровень — предварительная оценка, не сертификат.</p>
        {r.placements.length ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] text-subtle">
                  <th className="px-4 py-2.5 font-normal">Диагностика</th>
                  <th className="px-3 py-2.5 font-normal">Итог</th>
                  {["reading", "listening", "writing", "speaking", "grammar", "vocabulary"].map((k) => (
                    <th key={k} className="px-3 py-2.5 font-normal">{SKILL_RU[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.placements.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-4 py-2.5 text-muted">{date(p.completedAt)}</td>
                    <td className="px-3 py-2.5 font-medium text-fg">{p.overallLabel}</td>
                    {(["reading", "listening", "writing", "speaking", "grammar", "vocabulary"] as const).map((k) => (
                      <td key={k} className="px-3 py-2.5 text-muted">{p.skills[k] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[14px] text-subtle">Диагностик пока нет.</p>
        )}
        {r.skillsByWeek.length > 0 && (
          <div className="mt-4 rounded-2xl border border-line bg-card p-4">
            {r.skillsByWeek.map((s) => (
              <div key={s.skill} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line/60 py-2 last:border-b-0">
                <span className="w-[110px] text-[14px] text-fg">{SKILL_RU[s.skill] ?? s.skill}</span>
                {s.weeks.map((wk) => (
                  <span key={wk.week} className="tabular text-[13px] text-muted">
                    нед. {date(wk.week)}: <span className="text-fg">{pct(wk.accuracy)}</span> <span className="text-subtle">({wk.answers})</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-fg">Повторяющиеся ошибки</h2>
          {r.recurringErrors.length ? (
            <ul className="mt-4 space-y-2">
              {r.recurringErrors.map((e) => (
                <li key={e.key} className="rounded-xl border border-line bg-card px-4 py-3 text-[14px]">
                  <span className={cn(/[А-Яа-я]/.test(e.prompt) ? "text-fg" : "lang text-fg")}>{e.prompt}</span>
                  {e.correct && (
                    <span className="block text-[13px] text-muted">
                      правильно: <span className="lang text-fg">{e.correct}</span>
                    </span>
                  )}
                  <span className="block text-[12px] text-subtle">
                    {e.times} раза · последний раз {date(e.lastAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-subtle">Ошибка считается повторяющейся, если она встретилась минимум дважды. Таких пока нет.</p>
          )}
        </div>
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-fg">История занятий</h2>
          {r.history.length ? (
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
              {r.history.map((h) => (
                <li key={h.lessonId + h.completedAt} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="lang block truncate text-[15px] text-fg">{h.title}</span>
                    <span className="text-[12px] text-subtle">
                      {date(h.completedAt)} · {h.minutes} мин · {OBJ[h.objective] ?? h.objective}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[14px] text-muted">{pct(h.accuracy)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-subtle">Завершённых занятий пока нет.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function TutorComment() {
  const [s, setS] = React.useState<{ busy: boolean; data: TaskOutputOf<"analyze_progress"> | null; error: string | null }>({ busy: false, data: null, error: null });
  if (s.data)
    return (
      <div className="mt-4 rounded-2xl border border-accent/30 bg-accent-muted/40 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium tracking-[0.1em] text-accent-soft uppercase">
          <Sparkles className="size-3.5" /> Аналитик · комментарий
        </p>
        <p className="text-[14.5px] leading-relaxed text-fg">{s.data.summary}</p>
        {s.data.missing_data.length > 0 && <p className="mt-2 text-[13px] text-subtle">Не хватает данных: {s.data.missing_data.join("; ")}</p>}
        <p className="mt-2 text-[13.5px] text-muted">{s.data.recommendation}</p>
      </div>
    );
  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        disabled={s.busy}
        onClick={async () => {
          setS({ busy: true, data: null, error: null });
          const r = await runTutorTask<TaskOutputOf<"analyze_progress">>("analyze_progress", {});
          setS({ busy: false, data: r.ok ? r.data : null, error: r.ok ? null : r.error });
        }}
      >
        {s.busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {s.busy ? "Анализируем…" : "Комментарий наставника"}
      </Button>
      {s.error && <p className="mt-1 text-[13px] text-subtle">{s.error}</p>}
    </div>
  );
}
