"use client";

import * as React from "react";
import { APP } from "@/config/app";
import { applyReview, applyStatus } from "@/lib/vocab";
import { LocalStorageAdapter, type StateAdapter, type SyncStatus } from "@/lib/db/adapter";
import { RemoteStateAdapter } from "@/lib/db/remote-adapter";
import { getDictionary } from "@/lib/i18n";
import { todayKey, uid } from "@/lib/utils";
import { createInitialState, hydrate } from "./initial";
import type {
  ActivityEvent, AssessmentResult, LinguaState, PracticeResult, Settings, TutorMessage, UserVocab,
} from "./types";

type Updater = (s: LinguaState) => LinguaState;

interface StoreValue {
  state: LinguaState;
  ready: boolean;
  syncStatus: SyncStatus;
  syncMode: "local" | "remote";
  update: (fn: Updater) => void;
  actions: ReturnType<typeof makeActions>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

function logActivity(s: LinguaState, type: ActivityEvent["type"], label: string): LinguaState {
  const event: ActivityEvent = { id: uid("act"), type, label, at: new Date().toISOString() };
  return { ...s, activity: [event, ...s.activity].slice(0, 200) };
}

function makeActions(update: (fn: Updater) => void) {
  return {
    updateSettings(patch: Partial<Settings>) {
      update((s) => ({ ...s, settings: { ...s.settings, ...patch, updatedAt: new Date().toISOString() } }));
    },
    togglePlanBlock(blockId: string, label: string, date = todayKey()) {
      update((s) => {
        const day = s.dailyPlans[date] ?? { completed: [] };
        const done = day.completed.includes(blockId);
        const completed = done ? day.completed.filter((b) => b !== blockId) : [...day.completed, blockId];
        const next = { ...s, dailyPlans: { ...s.dailyPlans, [date]: { completed } } };
        return done ? next : logActivity(next, "plan", `Completed daily block: ${label}`);
      });
    },
    resetPlanDay(date = todayKey()) {
      update((s) => ({ ...s, dailyPlans: { ...s.dailyPlans, [date]: { completed: [] } } }));
    },
    completeLesson(lessonId: string, title: string, score?: number, total?: number) {
      update((s) =>
        logActivity(
          { ...s, lessons: { ...s.lessons, [lessonId]: { status: "completed", score, total, updatedAt: new Date().toISOString() } } },
          "lesson",
          `Completed lesson “${title}”`,
        ),
      );
    },
    startLesson(lessonId: string) {
      update((s) =>
        s.lessons[lessonId]
          ? s
          : { ...s, lessons: { ...s.lessons, [lessonId]: { status: "in_progress", updatedAt: new Date().toISOString() } } },
      );
    },
    resetLesson(lessonId: string) {
      update((s) => {
        const lessons = { ...s.lessons };
        delete lessons[lessonId];
        return { ...s, lessons };
      });
    },
    /** Record a vocabulary review answer (rules live in lib/vocab). */
    reviewWord(wordId: string, knewIt: boolean) {
      update((s) => ({ ...s, vocabulary: { ...s.vocabulary, [wordId]: applyReview(s.vocabulary[wordId], knewIt) } }));
    },
    setWordStatus(wordId: string, status: UserVocab["status"]) {
      update((s) => ({ ...s, vocabulary: { ...s.vocabulary, [wordId]: applyStatus(s.vocabulary[wordId], status) } }));
    },
    logReviewSession(count: number) {
      if (count > 0) update((s) => logActivity(s, "vocabulary", `Reviewed ${count} vocabulary card${count === 1 ? "" : "s"}`));
    },
    submitHomework(id: string, title: string, text: string) {
      update((s) =>
        logActivity(
          { ...s, homework: { ...s.homework, [id]: { text, submittedAt: new Date().toISOString(), status: "submitted" } } },
          "homework",
          `Submitted homework “${title}”`,
        ),
      );
    },
    withdrawHomework(id: string) {
      update((s) => {
        const homework = { ...s.homework };
        delete homework[id];
        return { ...s, homework };
      });
    },
    savePractice(kind: "reading" | "listening", id: string, title: string, result: PracticeResult) {
      update((s) =>
        logActivity(
          { ...s, [kind]: { ...s[kind], [id]: result } },
          "practice",
          `${kind === "reading" ? "Reading" : "Listening"}: “${title}” — ${result.score}/${result.total}`,
        ),
      );
    },
    saveWritingDraft(id: string, draft: string) {
      update((s) => ({
        ...s,
        writing: { ...s.writing, [id]: { ...(s.writing[id] ?? {}), draft, updatedAt: new Date().toISOString() } },
      }));
    },
    submitWriting(id: string, title: string, text: string) {
      update((s) =>
        logActivity(
          {
            ...s,
            writing: {
              ...s.writing,
              [id]: { draft: text, submittedText: text, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            },
          },
          "practice",
          `Writing submitted: “${title}”`,
        ),
      );
    },
    saveSpeaking(id: string, patch: Partial<{ notes: string; recorded: boolean }>, title?: string) {
      update((s) => {
        const prev = s.speaking[id] ?? { notes: "", recordings: 0 };
        const next = {
          ...prev,
          notes: patch.notes ?? prev.notes,
          recordings: prev.recordings + (patch.recorded ? 1 : 0),
          lastRecordedAt: patch.recorded ? new Date().toISOString() : prev.lastRecordedAt,
        };
        const st = { ...s, speaking: { ...s.speaking, [id]: next } };
        return patch.recorded && title ? logActivity(st, "practice", `Speaking practice: “${title}”`) : st;
      });
    },
    saveAssessment(result: AssessmentResult) {
      update((s) =>
        logActivity(
          { ...s, assessments: [result, ...s.assessments] },
          "assessment",
          `${result.title} — ${Math.round((result.score / Math.max(1, result.total)) * 100)}%`,
        ),
      );
    },
    appendTutorMessage(mode: string, msg: Omit<TutorMessage, "id" | "createdAt">) {
      const m: TutorMessage = { ...msg, id: uid("msg"), createdAt: new Date().toISOString() };
      update((s) => ({ ...s, tutor: { ...s.tutor, [mode]: [...(s.tutor[mode] ?? []), m].slice(-100) } }));
      return m;
    },
    clearTutor(mode: string) {
      update((s) => ({ ...s, tutor: { ...s.tutor, [mode]: [] } }));
    },
    resetAll() {
      update(() => createInitialState());
    },
  };
}

export interface StorageConfig {
  /** "remote" = Supabase sync with offline cache; "local" = this browser only. */
  kind: "local" | "remote";
  /** Per-account cache key suffix, so two accounts never share browser data. */
  userKey: string;
}

function createAdapter(storage?: StorageConfig): StateAdapter {
  if (storage?.kind === "remote") return new RemoteStateAdapter(`${APP.storageKey}:${storage.userKey}`);
  return new LocalStorageAdapter(APP.storageKey);
}

export function StoreProvider({ children, storage }: { children: React.ReactNode; storage?: StorageConfig }) {
  const adapterRef = React.useRef<StateAdapter | null>(null);
  if (!adapterRef.current) adapterRef.current = createAdapter(storage);
  const [state, setState] = React.useState<LinguaState>(createInitialState);
  const [ready, setReady] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(storage?.kind === "remote" ? "loading" : "local");
  /** The last state object that came *from* storage — never echo it back as a save. */
  const fromStorage = React.useRef<LinguaState | null>(null);

  React.useEffect(() => {
    const adapter = adapterRef.current!;
    let alive = true;
    const detach = adapter.attach?.();
    const offStatus = adapter.onStatus?.((st) => alive && setSyncStatus(st));
    const offRemote = adapter.onRemoteState?.((remote) => {
      if (!alive) return;
      const next = hydrate(remote);
      fromStorage.current = next;
      setState(next);
    });
    adapter.load().then((persisted) => {
      if (!alive) return;
      const next = hydrate(persisted);
      fromStorage.current = next;
      setState(next);
      setReady(true);
    });
    return () => {
      alive = false;
      offStatus?.();
      offRemote?.();
      detach?.();
      adapter.dispose?.();
    };
  }, []);

  React.useEffect(() => {
    if (!ready || state === fromStorage.current) return;
    adapterRef.current!.save(state);
  }, [state, ready]);

  React.useEffect(() => {
    document.documentElement.lang = state.settings.interfaceLanguage;
  }, [state.settings.interfaceLanguage]);

  const update = React.useCallback((fn: Updater) => setState((s) => fn(s)), []);
  const actions = React.useMemo(() => makeActions(update), [update]);
  const value = React.useMemo(
    () => ({ state, ready, update, actions, syncStatus, syncMode: storage?.kind ?? "local" }),
    [state, ready, update, actions, syncStatus, storage?.kind],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function useT() {
  const { state } = useStore();
  return getDictionary(state.settings.interfaceLanguage);
}
