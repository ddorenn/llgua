/**
 * Deterministic answer checking (docs/curriculum/13 §8): exact key for choice items,
 * a set of accepted forms with normalisation for typed answers. No AI involved.
 */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, "i am"],
  [/\b(you|we|they)'re\b/g, "$1 are"],
  [/\b(he|she|it|that|there|what|who)'s\b/g, "$1 is"],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, "$1 will"],
  [/\b(i|you|we|they|he|she|it)'d\b/g, "$1 would"],
  [/\b(i|you|we|they)'ve\b/g, "$1 have"],
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\b(do|does|did|is|are|was|were|has|have|had|should|would|could|must|need)n't\b/g, "$1 not"],
  [/\bcan not\b/g, "cannot"],
];

/** Lower-case, unify apostrophes, trim punctuation and spaces, expand contractions. */
export function normalizeAnswer(s: string): string {
  let t = s
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[.,!?;:"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // A leading bare contraction such as "'re waiting" or "'ll do": treat as the full verb.
  t = t.replace(/^'m\b/, "am").replace(/^'re\b/, "are").replace(/^'s\b/, "is").replace(/^'ll\b/, "will").replace(/^'ve\b/, "have").replace(/^'d\b/, "would");
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t;
}

/** Russian keyboard layout or Cyrillic text: not counted as a mistake, the learner is asked to switch layout (14 §15). */
export function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

export function checkInput(answer: string, accepted: string[]): boolean {
  const a = normalizeAnswer(answer);
  if (!a) return false;
  return accepted.some((x) => normalizeAnswer(x) === a);
}

/** Small deterministic PRNG so option order is stable per (placement, item) and survives reloads. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Permutation of option indexes: display position → original index. */
export function optionOrder(seed: string, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = hash(seed) || 1;
  for (let i = n - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
