/**
 * Learning analytics (07 §7 weekly report, 15 §6). Pure: computed only from stored records —
 * lesson results/attempts (server-graded), review events, completed diagnostics. No invented numbers:
 * every metric is null / omitted when there is no data behind it.
 */
import { config as placementConfig } from "@/lib/placement/bank";
import type { PlacementResult, SkillKey } from "@/lib/placement/types";
import type { AttemptRow, ResultRow, SrsEventRow } from "@/lib/records/store";

export interface PlacementPoint {
  id: string;
  completedAt: string;
  overallLabel: string;
  confidence: string;
  skills: Partial<Record<SkillKey | "grammar" | "vocabulary", string | null>>;
}

export interface Report {
  generatedAt: string;
  week: {
    from: string;
    to: string;
    lessons: number;
    minutes: number;
    activeDays: number;
    answers: number;
    firstTryAccuracy: number | null;
    reviews: number;
    reviewAccuracy: number | null;
    previous: { lessons: number; answers: number; firstTryAccuracy: number | null };
  };
  skillsByWeek: { skill: string; weeks: { week: string; answers: number; accuracy: number }[] }[];
  placements: PlacementPoint[];
  recurringErrors: { key: string; prompt: string; correct: string; times: number; lastAt: string }[];
  history: { lessonId: string; title: string; completedAt: string; accuracy: number | null; minutes: number; objective: string }[];
  recommendations: string[];
  retest: { lastAt: string | null; availableFrom: string | null; due: boolean; intervalDays: number };
}

const DAY = 86_400_000;
const SKILL_RU: Record<string, string> = {
  grammar: "Грамматика",
  vocabulary: "Словарь",
  reading: "Чтение",
  listening: "Аудирование",
  interaction: "Диалог",
  writing: "Письмо",
};
export const skillName = (s: string) => SKILL_RU[s] ?? s;

function weekKey(d: Date) {
  // ISO week start (Monday), as YYYY-MM-DD
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

const ratio = (ok: number, n: number) => (n ? ok / n : null);

export function buildReport(input: {
  now: Date;
  attempts: AttemptRow[];
  results: ResultRow[];
  srs: SrsEventRow[];
  placements: { id: string; completedAt: string | null; result: PlacementResult | null }[];
  lessonTitle: (id: string) => string;
  pacePerWeek?: number | null;
}): Report {
  const { now } = input;
  const from = new Date(now.getTime() - 7 * DAY);
  const prevFrom = new Date(now.getTime() - 14 * DAY);
  const inRange = (iso: string, a: Date, b: Date) => iso >= a.toISOString() && iso < b.toISOString();
  const firstTries = (rows: AttemptRow[]) => rows.filter((r) => r.try_no === 1);

  const weekAttempts = input.attempts.filter((a) => inRange(a.created_at, from, now));
  const prevAttempts = input.attempts.filter((a) => inRange(a.created_at, prevFrom, from));
  const weekResults = input.results.filter((r) => inRange(r.completed_at, from, now));
  const prevResults = input.results.filter((r) => inRange(r.completed_at, prevFrom, from));
  const weekSrs = input.srs.filter((e) => inRange(e.at, from, now));
  const days = new Set([...weekAttempts.map((a) => a.created_at.slice(0, 10)), ...weekSrs.map((e) => e.at.slice(0, 10)), ...weekResults.map((r) => r.completed_at.slice(0, 10))]);
  const wf = firstTries(weekAttempts);
  const pf = firstTries(prevAttempts);

  // Skill accuracy by week (last 6 weeks with data), first tries only.
  const bySkill = new Map<string, Map<string, { n: number; ok: number }>>();
  for (const a of firstTries(input.attempts)) {
    if (a.created_at < new Date(now.getTime() - 42 * DAY).toISOString()) continue;
    const wk = weekKey(new Date(a.created_at));
    const m = bySkill.get(a.skill) ?? new Map();
    const c = m.get(wk) ?? { n: 0, ok: 0 };
    c.n++;
    if (a.ok) c.ok++;
    m.set(wk, c);
    bySkill.set(a.skill, m);
  }
  const skillsByWeek = [...bySkill.entries()].map(([skill, m]) => ({
    skill,
    weeks: [...m.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([week, c]) => ({ week, answers: c.n, accuracy: c.ok / c.n })),
  }));

  // Recurring errors: the same item answered wrong on the first try in ≥ 2 different lesson runs (results),
  // or a review item failed ≥ 2 times.
  const wrongFirst = new Map<string, { times: number; lastAt: string; prompt: string; correct: string }>();
  for (const r of input.results) {
    for (const m of r.mistakes) {
      const id = `${r.lesson_id}:${m.key}`;
      const cur = wrongFirst.get(id) ?? { times: 0, lastAt: r.completed_at, prompt: m.prompt, correct: m.correct };
      cur.times++;
      if (r.completed_at > cur.lastAt) cur.lastAt = r.completed_at;
      wrongFirst.set(id, cur);
    }
  }
  const srsFails = new Map<string, { times: number; lastAt: string }>();
  for (const e of input.srs) {
    if (e.ok) continue;
    const cur = srsFails.get(e.item_id) ?? { times: 0, lastAt: e.at };
    cur.times++;
    if (e.at > cur.lastAt) cur.lastAt = e.at;
    srsFails.set(e.item_id, cur);
  }
  const recurringErrors = [
    ...[...wrongFirst.entries()].filter(([, v]) => v.times >= 2).map(([key, v]) => ({ key, prompt: v.prompt, correct: v.correct, times: v.times, lastAt: v.lastAt })),
    ...[...srsFails.entries()]
      .filter(([, v]) => v.times >= 2)
      .map(([key, v]) => ({ key, prompt: key.startsWith("w:") ? `слово «${key.slice(2)}»` : "элемент повторения", correct: "", times: v.times, lastAt: v.lastAt })),
  ]
    .sort((a, b) => b.times - a.times)
    .slice(0, 10);

  const history = input.results.slice(0, 30).map((r) => ({
    lessonId: r.lesson_id,
    title: input.lessonTitle(r.lesson_id),
    completedAt: r.completed_at,
    accuracy: ratio(r.first_try, r.graded),
    minutes: r.minutes,
    objective: r.objective_status,
  }));

  const placements: PlacementPoint[] = input.placements
    .filter((p) => p.result && p.completedAt)
    .map((p) => ({
      id: p.id,
      completedAt: p.completedAt!,
      overallLabel: p.result!.overallLabel,
      confidence: p.result!.confidence,
      skills: {
        listening: p.result!.skills.listening.assessed ? p.result!.skills.listening.label : null,
        reading: p.result!.skills.reading.assessed ? p.result!.skills.reading.label : null,
        writing: p.result!.skills.writing.assessed ? p.result!.skills.writing.label : null,
        speaking: p.result!.skills.speaking.assessed ? p.result!.skills.speaking.label : null,
        grammar: p.result!.components.grammar.assessed ? p.result!.components.grammar.label : null,
        vocabulary: p.result!.components.vocabulary.assessed ? p.result!.components.vocabulary.label : null,
      },
    }));

  const last = placements[0]?.completedAt ?? null;
  const intervalDays = placementConfig.retestIntervalDays;
  const availableFrom = last ? new Date(new Date(last).getTime() + intervalDays * DAY).toISOString() : null;
  const retest = { lastAt: last, availableFrom, due: !!availableFrom && availableFrom <= now.toISOString(), intervalDays };

  // Recommendations: templates driven by the data above (07 §7, 15 §9).
  const rec: string[] = [];
  if (!placements.length) rec.push("Пройдите входную диагностику — без неё маршрут и сравнение навыков недоступны.");
  if (retest.due) rec.push(`Прошло ${intervalDays} дней с диагностики — пора пройти повторную, чтобы увидеть динамику навыков.`);
  if (!weekResults.length && !weekAttempts.length) rec.push("На этой неделе занятий не было. Начните с короткого занятия: первое после паузы — повторение.");
  if (input.pacePerWeek && weekResults.length && weekResults.length < input.pacePerWeek)
    rec.push(`Завершено занятий: ${weekResults.length} из выбранных ${input.pacePerWeek} в неделю.`);
  const weakest = skillsByWeek
    .map((s) => ({ skill: s.skill, last: s.weeks[s.weeks.length - 1] }))
    .filter((s) => s.last && s.last.answers >= 4)
    .sort((a, b) => a.last.accuracy - b.last.accuracy)[0];
  if (weakest && weakest.last.accuracy < 0.7) rec.push(`${skillName(weakest.skill)}: ${Math.round(weakest.last.accuracy * 100)}% с первой попытки — добавьте практику этого навыка.`);
  if (recurringErrors.length) rec.push(`Повторяющиеся ошибки (${recurringErrors.length}) — повторите их в словаре в разделе «Мои ошибки».`);
  const rAcc = ratio(weekSrs.filter((e) => e.ok).length, weekSrs.length);
  if (rAcc != null && weekSrs.length >= 10 && rAcc < 0.7) rec.push(`Удержание в повторении ${Math.round(rAcc * 100)}% — стоит снизить число новых слов или повторять чаще.`);

  return {
    generatedAt: now.toISOString(),
    week: {
      from: from.toISOString(),
      to: now.toISOString(),
      lessons: weekResults.length,
      minutes: weekResults.reduce((s, r) => s + r.minutes, 0),
      activeDays: days.size,
      answers: wf.length,
      firstTryAccuracy: ratio(wf.filter((a) => a.ok).length, wf.length),
      reviews: weekSrs.length,
      reviewAccuracy: rAcc,
      previous: { lessons: prevResults.length, answers: pf.length, firstTryAccuracy: ratio(pf.filter((a) => a.ok).length, pf.length) },
    },
    skillsByWeek,
    placements,
    recurringErrors,
    history,
    recommendations: rec.slice(0, 5),
    retest,
  };
}
