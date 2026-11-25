/**
 * Vocabulary domain logic — framework-free, so the same rules can serve the web app,
 * the API (/api/v1/vocabulary) and a future Telegram Mini App.
 *
 *  - Words (content) live in /content/vocabulary and are never mutated.
 *  - Progress (per learner) is a map wordId → UserVocab, stored with the learner's state.
 *  - A "card" is a view model combining the two, with no UI concerns.
 */
import type { VocabWord } from "@/lib/content/schemas";
import type { UserVocab, VocabStatus } from "@/lib/store/types";

export const VOCAB_RULES = {
  /** Net correct answers needed to reach each status. */
  reviewAfter: 3,
  learnedAfter: 5,
  /** Steps shown in a progress meter. */
  meterSteps: 5,
} as const;

export const STATUS_LABEL: Record<VocabStatus, string> = {
  new: "Новое",
  learning: "Изучаю",
  review: "Повторяю",
  learned: "Выучено",
};

export function emptyProgress(): UserVocab {
  return { status: "new", reviews: 0, correct: 0 };
}

/** Apply one review answer. Pure: returns the next progress record. */
export function applyReview(prev: UserVocab | undefined, knewIt: boolean, at = new Date().toISOString()): UserVocab {
  const p = prev ?? emptyProgress();
  const correct = knewIt ? p.correct + 1 : Math.max(0, p.correct - 1);
  const status: VocabStatus =
    correct >= VOCAB_RULES.learnedAfter ? "learned" : correct >= VOCAB_RULES.reviewAfter ? "review" : "learning";
  return { status, reviews: p.reviews + 1, correct, lastReviewed: at };
}

/** Set a status manually (e.g. "Я уже знаю это слово"). */
export function applyStatus(prev: UserVocab | undefined, status: VocabStatus): UserVocab {
  const p = prev ?? emptyProgress();
  const correct =
    status === "learned" ? Math.max(p.correct, VOCAB_RULES.learnedAfter)
    : status === "review" ? Math.max(Math.min(p.correct, VOCAB_RULES.learnedAfter - 1), VOCAB_RULES.reviewAfter)
    : status === "new" ? 0
    : Math.min(p.correct, VOCAB_RULES.reviewAfter - 1);
  return { ...p, status, correct };
}

export interface VocabCard {
  id: string;
  word: string;
  partOfSpeech: string;
  pronunciation?: string;
  translation: string;
  example?: string;
  level: string;
  topic?: string;
  status: VocabStatus;
  statusLabel: string;
  /** 0..meterSteps — how far along the word is. */
  strength: number;
  reviews: number;
}

export function toCard(word: VocabWord, progress?: UserVocab): VocabCard {
  const p = progress ?? emptyProgress();
  return {
    id: word.id,
    word: word.word,
    partOfSpeech: word.pos,
    pronunciation: word.ipa,
    translation: word.translation,
    example: word.examples[0],
    level: word.level,
    topic: word.topic,
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    strength: Math.min(VOCAB_RULES.meterSteps, p.correct),
    reviews: p.reviews,
  };
}

/** Words to review next: not yet learned, least practised first. */
export function reviewQueue(words: VocabWord[], progress: Record<string, UserVocab>, limit = 15): VocabWord[] {
  return words
    .filter((w) => (progress[w.id]?.status ?? "new") !== "learned")
    .sort((a, b) => (progress[a.id]?.correct ?? 0) - (progress[b.id]?.correct ?? 0) || (progress[a.id]?.lastReviewed ?? "").localeCompare(progress[b.id]?.lastReviewed ?? ""))
    .slice(0, limit);
}
