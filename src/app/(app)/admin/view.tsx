"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AdminStats } from "@/lib/admin";

type Row = Record<string, unknown>;
const LEVELS = ["below A1", "A1", "A2", "B1", "B2", "above B2"] as const;
const date = (iso: unknown) => (typeof iso === "string" ? new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export function AdminView({ data, canReview }: { data: { stats: AdminStats; leads: Row[]; queue: Row[] }; canReview: boolean }) {
  const s = data.stats;
  const days = Object.entries(s.leads_by_day).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);
  return (
    <div className="mx-auto max-w-[1000px] space-y-12">
      <header>
        <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Администрирование</p>
        <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.035em] text-fg">Заявки и проверка</h1>
      </header>

      <section className="grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-4">
        {[
          ["Заявок всего", s.leads_total],
          ["За 7 дней", s.leads_7d],
          ["Учеников", s.learners ?? "—"],
          ["AI за 7 дней", s.ai_cost_7d != null ? `$${Number(s.ai_cost_7d).toFixed(3)}` : "—"],
        ].map(([k, v]) => (
          <div key={k as string}>
            <p className="text-[13px] text-muted">{k}</p>
            <p className="tabular mt-1 text-[28px] font-semibold tracking-[-0.03em] text-fg">{v as React.ReactNode}</p>
          </div>
        ))}
      </section>
      {(s.placements_completed != null || s.pending_account_removals) && (
        <p className="-mt-8 text-[13px] text-subtle">
          Диагностик: {s.placements_completed ?? 0} · занятий завершено: {s.lessons_completed ?? 0} · AI-запросов за 7 дней: {s.ai_requests_7d ?? 0}
          {s.pending_account_removals ? ` · ожидают удаления аккаунта: ${s.pending_account_removals} (удалить пользователя в Supabase → Authentication)` : ""}
        </p>
      )}

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-[18px] font-semibold text-fg">По источникам (UTM)</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
            {Object.entries(s.leads_by_source).length === 0 && <li className="px-4 py-3 text-[14px] text-subtle">Заявок пока нет.</li>}
            {Object.entries(s.leads_by_source)
              .sort(([, a], [, b]) => b - a)
              .map(([src, n]) => (
                <li key={src} className="flex justify-between px-4 py-2.5 text-[14px]">
                  <span className="text-fg">{src === "direct" ? "без метки" : src}</span>
                  <span className="tabular text-muted">{n}</span>
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-fg">По дням</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
            {days.length === 0 && <li className="px-4 py-3 text-[14px] text-subtle">—</li>}
            {days.map(([d, n]) => (
              <li key={d} className="flex justify-between px-4 py-2.5 text-[14px]">
                <span className="text-fg">{new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                <span className="tabular text-muted">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-semibold text-fg">Последние заявки</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-subtle">
                {["Когда", "Контакт", "Имя", "Уровень", "Источник"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-subtle">Заявок пока нет.</td>
                </tr>
              )}
              {data.leads.map((l, i) => (
                <tr key={i} className="border-b border-line/60 last:border-b-0">
                  <td className="px-4 py-2.5 text-muted">{date(l.created_at)}</td>
                  <td className="px-4 py-2.5 text-fg">{String(l.contact)}</td>
                  <td className="px-4 py-2.5 text-muted">{String(l.name ?? "") || "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{String(l.level ?? "") || "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{((l.utm as Record<string, string>)?.utm_source ?? "") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-semibold text-fg">Проверка письма специалистом</h2>
        <p className="mt-1 text-[13px] text-subtle">Подтверждённая оценка хранится отдельно от AI-оценки. После подтверждения письмо входит в уровень ученика.</p>
        {!canReview && <p className="mt-3 text-[14px] text-subtle">Доступно в режиме с базой данных.</p>}
        <ul className="mt-4 space-y-4">
          {canReview && data.queue.length === 0 && <li className="text-[14px] text-subtle">Текстов пока нет.</li>}
          {data.queue.map((q) => (
            <ReviewItem key={String(q.id)} q={q} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReviewItem({ q }: { q: Row }) {
  const router = useRouter();
  const ai = q.ai as { estimated_level?: string; confidence?: string } | null;
  const expert = q.expert as { level?: string; comment?: string } | null;
  const [level, setLevel] = React.useState<string>(expert?.level ?? ai?.estimated_level ?? "A2");
  const [comment, setComment] = React.useState(expert?.comment ?? "");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  return (
    <li className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-subtle">
        <span>{date(q.completed_at)}</span>
        <span>· задание {String(q.task_id)}</span>
        {ai?.estimated_level && <span className="rounded-full bg-accent-muted px-2 py-0.5 text-accent-soft">AI: {ai.estimated_level}</span>}
        {expert?.level && <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">Специалист: {expert.level}</span>}
      </div>
      <p className="lang mt-3 whitespace-pre-wrap text-[15.5px] leading-relaxed text-fg">{String(q.text ?? "")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-[14px] text-fg" aria-label="Уровень текста">
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} placeholder="Комментарий (необязательно)" className="h-10 min-w-[220px] flex-1 rounded-lg border border-line bg-surface px-3 text-[14px] text-fg" />
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch("/api/admin/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placementId: q.id, level, comment: comment || undefined }) });
            setBusy(false);
            if (res.ok) {
              setDone(true);
              router.refresh();
            }
          }}
        >
          {done ? "Сохранено" : "Подтвердить оценку"}
        </Button>
      </div>
    </li>
  );
}
