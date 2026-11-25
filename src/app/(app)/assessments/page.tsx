"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, Clock, History, ListChecks, ShieldAlert } from "lucide-react";
import { assessments } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { formatDate, pct, plural } from "@/lib/utils";
import { PageHeader, EmptyState, Notice, SectionTitle, SKILL_LABEL } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_ICON = { initial: ListChecks, weekly: CalendarDays, progress: History } as const;

export default function AssessmentsPage() {
  const { state } = useStore();
  const history = state.assessments;
  const hasInitial = history.some((h) => h.type === "initial");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Тестирование"
        description="Срезы твоих навыков во времени. Результаты сравниваются только с твоими же прошлыми попытками."
      />

      <Notice icon={ShieldAlert} title="Это не валидированный тест уровня" tone="warning">
        Сейчас тесты построены на демонстрационных заданиях и простом подсчёте баллов. Они дают полезный стартовый срез, но не определяют
        уровень CEFR. Позже их заменит валидированная база заданий и модель оценки.
      </Notice>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {assessments.map((a) => {
          const Icon = TYPE_ICON[a.type];
          const attempts = history.filter((h) => h.assessmentId === a.id);
          const last = attempts[0];
          const qCount = a.sections.reduce((s, x) => s + x.questions.length, 0);
          const recommended = a.type === "initial" ? !hasInitial : hasInitial;
          return (
            <Card key={a.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-md border border-line bg-surface text-accent-soft">
                    <Icon className="size-[18px]" />
                  </div>
                  <div className="flex gap-1.5">
                    {a.meta.sample && <SampleBadge kind="content" />}
                    {recommended && <Badge variant="accent">Рекомендуем</Badge>}
                  </div>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight">{a.title}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{a.description}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-subtle">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> ~{a.minutes} мин</span>
                  <span>{qCount} {plural(qCount, "вопрос", "вопроса", "вопросов")}</span>
                  <span>{a.sections.map((s) => SKILL_LABEL[s.skill]).join(" · ")}</span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                  <span className="text-[12px] text-muted">
                    {last ? <>Последний: <span className="tabular text-fg">{pct(last.score, last.total)}%</span> · {formatDate(last.completedAt)}</> : "Ещё не проходили"}
                  </span>
                  <Link href={`/assessments/${a.id}`} className={buttonVariants({ size: "sm", variant: recommended ? "primary" : "secondary" })}>
                    {last ? "Пройти снова" : "Начать"} <ArrowRight />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section>
        <SectionTitle action={history.length ? <Link href="/progress" className="text-[12px] text-accent-soft hover:text-fg">Сравнить в «Прогрессе»</Link> : undefined}>
          История тестов
        </SectionTitle>
        {history.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Результатов пока нет" description="Начни с входного теста — он станет точкой отсчёта." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-line bg-surface text-[13px] font-medium text-subtle">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Дата</th>
                  <th className="px-4 py-2.5 font-medium">Тест</th>
                  <th className="px-4 py-2.5 font-medium">Результат</th>
                  <th className="px-4 py-2.5 font-medium">По навыкам</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-muted">{formatDate(h.completedAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-fg">{h.title}</td>
                    <td className="tabular px-4 py-3 font-medium">{pct(h.score, h.total)}% <span className="font-normal text-subtle">({h.score}/{h.total})</span></td>
                    <td className="px-4 py-3 text-muted">
                      {Object.entries(h.bySkill).map(([k, v]) => `${SKILL_LABEL[k]} ${pct(v.score, v.total)}%`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
