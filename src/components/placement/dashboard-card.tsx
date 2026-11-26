"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { placementApi, type Overview } from "./api";

/** Dashboard entry point: invite to the diagnostic, offer to continue, or show the latest estimate. */
export function PlacementDashboardCard() {
  const [o, setO] = React.useState<Overview | null | undefined>(undefined);
  React.useEffect(() => {
    placementApi.get().then(setO, () => setO(null));
  }, []);
  if (o === undefined || o === null) return null;
  const c = o.current;
  const inProgress = c?.status === "in_progress";
  const done = c?.status === "completed" && c.result;

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-accent-soft">
          <Compass className="size-5" />
        </span>
        <div>
          {done ? (
            <>
              <p className="text-[13px] text-muted">Входная диагностика · уверенность {c.result!.confidence === "high" ? "высокая" : c.result!.confidence === "medium" ? "средняя" : "низкая"}</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-fg">
                Ориентировочно {c.result!.overallLabel} · старт с {c.result!.route.startModule} «{c.result!.route.startTitle}»
              </h2>
              <p className="mt-1 text-[13px] text-subtle">Внутренняя оценка LINGUA, не сертификат CEFR.</p>
            </>
          ) : inProgress ? (
            <>
              <p className="text-[13px] text-muted">Входная диагностика</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-fg">Диагностика не завершена — продолжите с того же места</h2>
              <p className="mt-1 text-[13px] text-subtle">Ответы сохранены. Продолжить можно в течение 48 часов.</p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">Первый шаг</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-fg">Пройдите входную диагностику</h2>
              <p className="mt-1 text-[13px] text-subtle">25–40 минут: уровень, профиль навыков и стартовый маршрут.</p>
            </>
          )}
        </div>
      </div>
      <Link href="/placement" className={buttonVariants({ variant: done ? "secondary" : "primary", size: "lg" })}>
        {done ? "Смотреть отчёт" : inProgress ? "Продолжить" : "Начать"} <ArrowRight />
      </Link>
    </section>
  );
}
