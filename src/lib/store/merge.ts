/**
 * Merge two learner-state snapshots (used when two devices changed progress concurrently).
 * Rules: nothing earned is lost.
 *  - settings: the copy changed most recently wins (local if neither has a timestamp)
 *  - per-item records: union of keys; for the same key the more recently updated entry wins
 *  - daily plans: union of completed blocks per day
 *  - lists with ids (assessments, activity, tutor messages): union by id, sorted by time
 */
import { hydrate } from "./initial";
import type { LinguaState } from "./types";

type Rec<T> = Record<string, T>;

function newer<T>(a: T | undefined, b: T | undefined, time: (x: T) => string | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return (time(b) ?? "") >= (time(a) ?? "") ? b : a;
}

function mergeRec<T>(server: Rec<T>, local: Rec<T>, time: (x: T) => string | undefined): Rec<T> {
  const out: Rec<T> = { ...server };
  for (const [k, v] of Object.entries(local)) out[k] = newer(server[k], v, time) as T;
  return out;
}

function unionById<T extends { id: string }>(a: T[], b: T[], time: (x: T) => string, desc = true): T[] {
  const map = new Map<string, T>();
  for (const x of [...a, ...b]) map.set(x.id, x);
  return [...map.values()].sort((x, y) => (desc ? time(y).localeCompare(time(x)) : time(x).localeCompare(time(y))));
}

export function mergeStates(serverRaw: Partial<LinguaState>, localRaw: Partial<LinguaState>): LinguaState {
  const server = hydrate(serverRaw);
  const local = hydrate(localRaw);

  const dailyPlans: LinguaState["dailyPlans"] = { ...server.dailyPlans };
  for (const [day, v] of Object.entries(local.dailyPlans)) {
    const s = server.dailyPlans[day]?.completed ?? [];
    dailyPlans[day] = { completed: [...new Set([...s, ...v.completed])] };
  }

  const tutor: LinguaState["tutor"] = { ...server.tutor };
  for (const [mode, msgs] of Object.entries(local.tutor)) {
    tutor[mode] = unionById(server.tutor[mode] ?? [], msgs, (m) => m.createdAt, false).slice(-100);
  }

  return {
    ...server,
    schemaVersion: 1,
    settings: (server.settings.updatedAt ?? "") > (local.settings.updatedAt ?? "") ? server.settings : local.settings,
    dailyPlans,
    lessons: mergeRec(server.lessons, local.lessons, (x) => x.updatedAt),
    vocabulary: mergeRec(server.vocabulary, local.vocabulary, (x) => x.lastReviewed),
    homework: mergeRec(server.homework, local.homework, (x) => x.submittedAt),
    reading: mergeRec(server.reading, local.reading, (x) => x.completedAt),
    listening: mergeRec(server.listening, local.listening, (x) => x.completedAt),
    writing: mergeRec(server.writing, local.writing, (x) => x.updatedAt),
    speaking: mergeRec(server.speaking, local.speaking, (x) => x.lastRecordedAt),
    assessments: unionById(server.assessments, local.assessments, (a) => a.completedAt),
    activity: unionById(server.activity, local.activity, (a) => a.at).slice(0, 200),
    tutor,
    lessonSessions: mergeRec(server.lessonSessions ?? {}, local.lessonSessions ?? {}, (x) => x.updatedAt),
    srs: mergeRec(server.srs ?? {}, local.srs ?? {}, (x) => x.updatedAt),
  };
}
