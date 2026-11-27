"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { useStore } from "@/lib/store/store";
import type { LessonSummary } from "@/lib/lessons/registry";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LessonsList({ lessons }: { lessons: LessonSummary[] }) {
  const { state } = useStore();
  return (
    <div className="mx-auto max-w-[920px] space-y-10">
      <header>
        <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Занятия</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[44px]">Занятия по 60 минут</h1>
        <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-muted">
          Каждое занятие — шесть этапов: разминка, новый материал, практика, применение, обратная связь и итог. Прогресс сохраняется
          автоматически — можно выйти и продолжить с того же места.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-5 text-[14px] leading-relaxed text-muted">
        Сейчас доступен один демонстрационный урок — он проверяет все элементы движка. Первый полноценный модуль будет выбран после вашей
        диагностики.
      </div>

      <ul className="space-y-3">
        {lessons.map((l) => {
          const s = state.lessonSessions?.[l.id];
          const status = !s ? "Не начато" : s.status === "completed" ? "Завершено" : `В процессе · этап ${s.stage + 1} из ${l.stages}`;
          return (
            <li key={l.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-subtle">
                  <span className="tabular">
                    {l.level} · {l.module}
                  </span>
                  {l.status === "demo" && <span className="rounded-full border border-line px-2 py-0.5">демо-урок</span>}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {l.minutes} мин
                  </span>
                </div>
                <h2 className="lang mt-1.5 text-[22px] leading-tight text-fg">{l.title}</h2>
                <p className="mt-1 text-[14px] text-muted">{l.objective}</p>
                <p className={cn("mt-2 text-[13px]", s?.status === "completed" ? "text-success" : s ? "text-accent-soft" : "text-subtle")}>{status}</p>
              </div>
              <Link href={`/lessons/${l.id}`} className={buttonVariants({ size: "lg", variant: s?.status === "completed" ? "secondary" : "primary" })}>
                {s?.status === "completed" ? "Открыть" : s ? "Продолжить" : "Начать"} <ArrowRight />
              </Link>
            </li>
          );
        })}
        {lessons.length === 0 && <li className="text-[14px] text-subtle">Занятий пока нет.</li>}
      </ul>
    </div>
  );
}
