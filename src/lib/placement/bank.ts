/**
 * Placement item bank + configuration (content/placement/*). Validated at load time.
 * Pure module: safe to import from the engine, API routes, tests and the content check.
 * The answer keys live here — never import this module from client components.
 */
import { z } from "zod";
import configJson from "../../../content/placement/config.json";
import vocabJson from "../../../content/placement/vocabulary.json";
import grammarJson from "../../../content/placement/grammar.json";
import readingJson from "../../../content/placement/reading.json";
import listeningJson from "../../../content/placement/listening.json";
import writingJson from "../../../content/placement/writing.json";
import catalogJson from "../../../content/placement/catalog.json";

export const BANDS = ["Pre-A1", "A1", "A2", "A2+", "B1", "B1+", "B2", "B2+"] as const;
export type BandName = (typeof BANDS)[number];
const BandEnum = z.enum(BANDS);

const ConfigSchema = z.object({
  version: z.string(),
  bands: z.array(BandEnum).length(8),
  ladder: z.object({
    blockSize: z.number().int().positive(),
    inputPerBlock: z.number().int().min(0),
    passThresholdBlock: z.number().int().positive(),
    retryThreshold: z.number().int().positive(),
    maxBlocksPerBand: z.number().int().positive(),
    fastJumpFirstBlocks: z.number().int().min(0),
    maxItemsSection: z.number().int().positive(),
    sectionTimeLimitMin: z.number().positive(),
  }),
  testlet: z.object({ pass: z.number().int(), fail: z.number().int(), max: z.number().int().positive() }),
  fastAnswerSec: z.number().positive(),
  fastAnswerSecWithText: z.number().positive(),
  guessSuspicionsLowerConfidence: z.number().int().positive(),
  a1SublevelThreshold: z.number().min(0).max(1),
  gapMinErrors: z.number().int().positive(),
  resumeWindowHours: z.number().positive(),
  retestIntervalDays: z.number().min(0),
  pilotAllowEarlyRetake: z.boolean(),
  overallRule: z.literal("median_lower"),
  speakingCap: z.number().int().min(0),
  componentGapLowersConfidence: z.number().int().positive(),
  writing: z.object({
    timeMin: z.number().positive(),
    pasteFlagChars: z.number().int().positive(),
    wordsByTier: z.record(z.string(), z.tuple([z.number(), z.number()])),
  }),
  zeroMode: z.object({ itemsPerBand: z.number().int().positive(), passToFull: z.number().int().positive() }),
  pace: z.object({ allowed: z.array(z.number().int()), default: z.number().int(), warnBelow: z.number().int() }),
  route: z.object({ lessonsPerModule: z.number().int(), maxSkipsWithoutCheckout: z.number().int(), priorityExtraTime: z.number() }),
});

const ItemBase = z.object({
  id: z.string(),
  band: BandEnum,
  block: z.union([z.literal(1), z.literal(2)]),
  prompt: z.string().min(1),
});
const ChoiceItem = ItemBase.extend({ type: z.literal("choice"), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3) });
const InputItem = ItemBase.extend({ type: z.literal("input"), answer: z.array(z.string().min(1)).min(1) });
const VocabItem = z.discriminatedUnion("type", [ChoiceItem.extend({ theme: z.string() }), InputItem.extend({ theme: z.string() })]);
const GrammarItem = z.discriminatedUnion("type", [ChoiceItem.extend({ topic: z.string() }), InputItem.extend({ topic: z.string() })]);

const VocabFile = z.object({ section: z.literal("vocabulary"), version: z.number().int(), themes: z.record(z.string(), z.string()), items: z.array(VocabItem) });
const GrammarFile = z.object({
  section: z.literal("grammar"),
  version: z.number().int(),
  topics: z.record(z.string(), z.object({ ru: z.string(), module: z.string() })),
  items: z.array(GrammarItem),
});

const Question = z.object({
  id: z.string(),
  kind: z.enum(["main", "detail", "inference", "attitude", "word"]),
  prompt: z.string(),
  options: z.array(z.string()).min(3).max(4),
  answer: z.number().int().min(0),
});
const ReadingFile = z.object({
  section: z.literal("reading"),
  version: z.number().int(),
  testlets: z.array(z.object({ id: z.string(), band: BandEnum, title: z.string(), text: z.string(), questions: z.array(Question).length(4) })),
});
const ListeningFile = z.object({
  section: z.literal("listening"),
  version: z.number().int(),
  testlets: z.array(
    z.object({
      id: z.string(),
      band: BandEnum,
      title: z.string(),
      rate: z.number().min(0.5).max(1.3),
      maxPlays: z.number().int().min(1).max(3),
      lines: z.array(z.object({ speaker: z.string(), text: z.string() })).min(1),
      questions: z.array(Question).length(4),
    }),
  ),
});
const WritingFile = z.object({
  section: z.literal("writing"),
  version: z.number().int(),
  tasks: z.array(z.object({ id: z.string(), tier: z.enum(["A1", "A2", "B1", "B2"]), bands: z.array(BandEnum), title: z.string(), instruction: z.string(), prompt: z.string() })),
});
const CatalogFile = z.object({
  version: z.number().int(),
  levels: z.array(
    z.object({
      level: z.enum(["A1", "A2", "B1", "B2"]),
      practice: z.string(),
      modules: z.array(z.object({ code: z.string(), title: z.string(), subtitle: z.string(), sublevel: z.string(), lessons: z.number().int().optional(), ready: z.boolean().optional() })),
    }),
  ),
});

export const config = ConfigSchema.parse(configJson);
export const vocabulary = VocabFile.parse(vocabJson);
export const grammar = GrammarFile.parse(grammarJson);
export const reading = ReadingFile.parse(readingJson);
export const listening = ListeningFile.parse(listeningJson);
export const writing = WritingFile.parse(writingJson);
export const catalog = CatalogFile.parse(catalogJson);

export type Config = z.infer<typeof ConfigSchema>;
export type VocabItemT = z.infer<typeof VocabItem>;
export type GrammarItemT = z.infer<typeof GrammarItem>;
export type LadderItem = VocabItemT | GrammarItemT;
export type ReadingTestlet = z.infer<typeof ReadingFile>["testlets"][number];
export type ListeningTestlet = z.infer<typeof ListeningFile>["testlets"][number];
export type TestletT = ReadingTestlet | ListeningTestlet;
export type QuestionT = z.infer<typeof Question>;
export type WritingTask = z.infer<typeof WritingFile>["tasks"][number];
export type CatalogModule = z.infer<typeof CatalogFile>["levels"][number]["modules"][number];

/** Combined version of everything that can change a result; stored with every placement. */
export const BANK_VERSION = `v${vocabulary.version}.g${grammar.version}.r${reading.version}.l${listening.version}.w${writing.version}`;

export const bandIndex = (b: BandName) => BANDS.indexOf(b);

const byId = new Map<string, LadderItem>();
for (const it of [...vocabulary.items, ...grammar.items]) byId.set(it.id, it);
export const ladderItem = (id: string) => byId.get(id);

const questionById = new Map<string, { testlet: TestletT; q: QuestionT; section: "reading" | "listening" }>();
for (const t of reading.testlets) for (const q of t.questions) questionById.set(q.id, { testlet: t, q, section: "reading" });
for (const t of listening.testlets) for (const q of t.questions) questionById.set(q.id, { testlet: t, q, section: "listening" });
export const testletQuestion = (id: string) => questionById.get(id);

export function ladderItems(section: "vocabulary" | "grammar") {
  return section === "vocabulary" ? vocabulary.items : grammar.items;
}
export function testlets(section: "reading" | "listening"): TestletT[] {
  return section === "reading" ? reading.testlets : listening.testlets;
}

/**
 * Structural checks the engine relies on (used by `npm run content:check` and tests).
 * Returns a list of problems; empty = OK.
 */
export function validateBank(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const L = config.ladder;
  for (const section of ["vocabulary", "grammar"] as const) {
    const items = ladderItems(section);
    for (const it of items) {
      if (ids.has(it.id)) problems.push(`duplicate id ${it.id}`);
      ids.add(it.id);
      if (section === "grammar" && !grammar.topics[(it as GrammarItemT).topic]) problems.push(`${it.id}: unknown topic`);
      if (section === "vocabulary" && !vocabulary.themes[(it as VocabItemT).theme]) problems.push(`${it.id}: unknown theme`);
    }
    for (const band of BANDS) {
      for (const block of [1, 2] as const) {
        const b = items.filter((i) => i.band === band && i.block === block);
        if (b.length !== L.blockSize) problems.push(`${section} ${band} block ${block}: ${b.length} items, need ${L.blockSize}`);
        if (b.filter((i) => i.type === "input").length < L.inputPerBlock) problems.push(`${section} ${band} block ${block}: fewer than ${L.inputPerBlock} input items`);
      }
    }
  }
  for (const section of ["reading", "listening"] as const) {
    for (const band of BANDS) if (!testlets(section).some((t) => t.band === band)) problems.push(`${section}: no testlet for ${band}`);
    for (const t of testlets(section)) for (const q of t.questions) if (q.answer >= q.options.length) problems.push(`${q.id}: answer out of range`);
  }
  for (const band of BANDS) if (!writing.tasks.some((t) => t.bands.includes(band))) problems.push(`writing: no task for ${band}`);
  // Each grammar topic must be checked by ≥ 2 items within one band, so a gap can be confirmed (14 §10).
  const perTopic = new Map<string, number>();
  for (const it of grammar.items) perTopic.set(`${it.band}:${it.topic}`, (perTopic.get(`${it.band}:${it.topic}`) ?? 0) + 1);
  for (const [k, n] of perTopic) if (n < 2) problems.push(`grammar topic ${k} has only ${n} item`);
  return problems;
}
