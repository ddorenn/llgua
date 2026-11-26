/**
 * Turn a finished placement into the learner report (14 §6, §9, §10, §11) and the starting route (15 §1–§5, §9).
 * Deterministic templates only — no AI. Skills that were not measured stay "not assessed"; no score is invented.
 */
import { BANDS, catalog, config as defaultConfig, grammar, ladderItem, vocabulary, type Config } from "./bank";
import { ENGINE_VERSION, type ConfLevel, type Outcome, type PlacementState, type ResponseRecord } from "./engine";
import {
  sublevelLabel, type ComponentKey, type Confidence, type Gap, type Goal, type Intake, type PlacementResult, type Route,
  type RouteModule, type SkillKey, type SkillResult,
} from "./types";

const CONF: Confidence[] = ["low", "medium", "high"];
const SKILL_RU: Record<SkillKey | ComponentKey, string> = {
  listening: "аудирование",
  reading: "чтение",
  speaking: "устная речь",
  writing: "письмо",
  grammar: "грамматика",
  vocabulary: "словарь",
};

/** Band index → result sublevel index (A1 splits into A1.1 / A1.2 by accuracy, 14 §5.4). */
export function bandToSublevel(band: number, a1Accuracy: number | null, cfg: Config = defaultConfig): number {
  if (band < 0) return -1;
  if (band === 0) return 0;
  if (band === 1) return a1Accuracy != null && a1Accuracy >= cfg.a1SublevelThreshold ? 2 : 1;
  return band + 1;
}
/** Sublevel index → band index (inverse, A1.1/A1.2 → A1). */
export function sublevelToBand(sub: number): number {
  if (sub < 0) return -1;
  if (sub <= 0) return 0;
  if (sub <= 2) return 1;
  return sub - 1;
}

/** Lower median (14 §6.2): with an even count, the lower of the two middle values. */
export function lowerMedian(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

function a1Accuracy(responses: ResponseRecord[], section: string): number | null {
  const r = responses.filter((x) => x.section === section && x.band === 1 && x.correct !== null);
  if (!r.length) return null;
  return r.filter((x) => x.correct).length / r.length;
}

function fromOutcome(o: Outcome | null | undefined, responses: ResponseRecord[], section: string, cfg: Config, noteIfMissing: string): SkillResult {
  if (!o || !o.assessed) return { sublevel: null, label: "не оценено", confidence: null, assessed: false, note: noteIfMissing };
  const sub = bandToSublevel(o.band, a1Accuracy(responses, section), cfg);
  const label = o.ceiling ? "не ниже B2+" : sublevelLabel(sub);
  const notes: string[] = [];
  if (o.reason === "limit" || o.reason === "time") notes.push("граница уровня не найдена до лимита заданий или времени");
  if (o.reason === "unresolved") notes.push("пилотный банк: не хватило заданий, чтобы уточнить границу");
  if (o.borderline) notes.push("пограничный результат");
  return { sublevel: sub, label, confidence: CONF[o.confidence], assessed: true, ceiling: o.ceiling, note: notes.join("; ") || undefined };
}

const MEANING: Record<number, string> = {
  [-1]: "Знакомство с английским только начинается — программа начнётся с самых основ.",
  0: "Понимаете и используете отдельные слова и самые простые фразы.",
  1: "Понимаете и используете простые фразы о себе и повседневных вещах, если собеседник говорит медленно.",
  2: "Справляетесь с простыми повседневными ситуациями: знакомство, покупки, распорядок дня.",
  3: "Понимаете частые фразы на знакомые темы и общаетесь в простых бытовых ситуациях.",
  4: "Уверенно справляетесь с бытовыми ситуациями и коротко рассказываете о прошлом и планах.",
  5: "Понимаете главное в ясной речи на знакомые темы, можете рассказать об опыте и объяснить мнение.",
  6: "Свободнее говорите и пишете на знакомые темы, понимаете больше деталей и разных стилей.",
  7: "Понимаете сложные тексты на разные темы и общаетесь достаточно свободно и спонтанно.",
  8: "Уверенно владеете языком в большинстве ситуаций, включая абстрактные темы.",
};

const GOAL_SKILLS: Record<Goal, SkillKey[]> = {
  work: ["writing", "speaking"],
  travel: ["listening", "speaking"],
  exam: ["listening", "reading", "speaking", "writing"],
  communication: ["speaking", "listening"],
  study: ["reading", "writing"],
  relocation: ["listening", "speaking"],
  self: [],
};

export function computeResult(st: PlacementState, responses: ResponseRecord[], intake: Intake, now: Date, cfg: Config = defaultConfig): PlacementResult {
  return st.mode === "zero" ? zeroResult(st, intake, now, cfg) : fullResult(st, responses, intake, now, cfg);
}

/* ------------------------------------------------------------------ full */

function fullResult(st: PlacementState, responses: ResponseRecord[], intake: Intake, now: Date, cfg: Config): PlacementResult {
  const skills: Record<SkillKey, SkillResult> = {
    reading: fromOutcome(st.reading?.outcome, responses, "reading", cfg, "раздел не пройден"),
    listening: fromOutcome(st.listening?.outcome, responses, "listening", cfg, st.listening?.outcome?.reason === "skipped" ? "аудио не прослушивалось — раздел пропущен" : "раздел не пройден"),
    writing: {
      sublevel: null,
      label: "не оценено",
      confidence: null,
      assessed: false,
      note:
        st.writing?.status === "submitted"
          ? "текст сохранён; оценка по рубрике появится, когда будет подключена проверка письма"
          : "задание пропущено",
    },
    speaking: { sublevel: null, label: "не оценено", confidence: null, assessed: false, note: "устная часть пока недоступна в этой версии" },
  };
  if (skills.listening.assessed) skills.listening.note = [skills.listening.note, "пилот: синтезированный голос на вашем устройстве"].filter(Boolean).join("; ");
  const components: Record<ComponentKey, SkillResult> = {
    vocabulary: fromOutcome(st.vocabulary?.outcome, responses, "vocabulary", cfg, "раздел не пройден"),
    grammar: fromOutcome(st.grammar?.outcome, responses, "grammar", cfg, "раздел не пройден"),
  };

  const assessedSkills = (Object.keys(skills) as SkillKey[]).filter((k) => skills[k].assessed);
  const subs = assessedSkills.map((k) => skills[k].sublevel!);
  let overall = lowerMedian(subs);
  // Speaking cap (14 §6.3) applies only when speaking was measured.
  if (overall != null && skills.speaking.assessed) overall = Math.min(overall, skills.speaking.sublevel! + cfg.speakingCap);
  const ceilingCount = assessedSkills.filter((k) => skills[k].ceiling).length;
  const aboveRange = ceilingCount >= 3;
  const allAtCeiling = assessedSkills.length > 0 && ceilingCount === assessedSkills.length;

  // Confidence (14 §9).
  const reasons: string[] = [];
  const weak = (Object.keys(skills) as SkillKey[]).filter((k) => !skills[k].assessed || skills[k].confidence === "low");
  const notAssessed = (Object.keys(skills) as SkillKey[]).filter((k) => !skills[k].assessed);
  if (notAssessed.length) reasons.push(`не оценены: ${notAssessed.map((k) => SKILL_RU[k]).join(", ")}`);
  const spread = subs.length ? Math.max(...subs) - Math.min(...subs) : 0;
  let conf: ConfLevel;
  if (weak.length >= 2) conf = 0;
  else if (weak.length === 1 || spread >= 3) conf = 1;
  else conf = assessedSkills.filter((k) => skills[k].confidence === "high").length >= 3 && spread <= 2 ? 2 : 1;
  if (overall != null) {
    for (const c of ["grammar", "vocabulary"] as const) {
      const s = components[c].sublevel;
      if (s != null && overall - s >= cfg.componentGapLowersConfidence) {
        conf = Math.max(0, conf - 1) as ConfLevel;
        reasons.push(`${SKILL_RU[c]} заметно ниже уровня навыков`);
      }
    }
  }
  if (assessedSkills.some((k) => skills[k].confidence === "low")) reasons.push("часть разделов дала неустойчивый результат");
  if (skills.listening.assessed) reasons.push("аудирование в пилоте озвучено синтезированным голосом");

  const overallBand = overall != null ? sublevelToBand(overall) : -1;
  const gaps = findGaps(responses, overallBand, cfg);
  if (overall != null) {
    for (const k of assessedSkills) {
      if (overall - skills[k].sublevel! >= 1) gaps.push({ kind: "skill", key: k, label: `${SKILL_RU[k]} ниже общего уровня` });
    }
  }
  const strengths: string[] = [];
  if (overall != null) {
    for (const k of [...assessedSkills, "grammar", "vocabulary"] as (SkillKey | ComponentKey)[]) {
      const r = k in skills ? skills[k as SkillKey] : components[k as ComponentKey];
      if (r.assessed && r.sublevel! > overall) strengths.push(`${capital(SKILL_RU[k])}: ${r.label} — выше общего уровня`);
    }
  }

  const overallLabel =
    overall == null ? "не определён" : aboveRange ? "не ниже B2+ (выше диапазона диагностики)" : allAtCeiling ? "не ниже B2+ по проверенным навыкам" : sublevelLabel(overall);

  const route = buildRoute({ overall, aboveRange: aboveRange || allAtCeiling, gaps, skills, components, intake, mode: "full", cfg });
  const recommendations = buildRecommendations({ gaps, skills, route, conf, intake, cfg });

  const disclaimers = [
    "Это ориентировочная внутренняя оценка LINGUA, а не сертификат CEFR.",
    "Уровень считается по навыкам. Грамматика и словарь показывают пробелы, но не повышают итог.",
  ];
  if (notAssessed.length) disclaimers.push(`Не оценивались: ${notAssessed.map((k) => SKILL_RU[k]).join(", ")}. Поэтому уверенность низкая, а уровень уточнится в первых занятиях.`);
  if (aboveRange || allAtCeiling) disclaimers.push("Диагностика LINGUA не различает уровни C1–C2, а программа сейчас охватывает A1–B2.");

  return {
    mode: "full",
    completeness: notAssessed.length ? "partial" : "full",
    overall,
    overallLabel,
    aboveRange,
    confidence: CONF[conf],
    confidenceReasons: reasons,
    meaning: overall != null ? MEANING[overall] : "Недостаточно данных, чтобы назвать уровень.",
    skills,
    components,
    strengths: strengths.slice(0, 3),
    gaps,
    recommendations,
    disclaimers,
    route,
    configVersion: cfg.version,
    bankVersion: `${ENGINE_VERSION}`,
    computedAt: now.toISOString(),
  };
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Gaps (14 §10): a topic counts only when checked by ≥ 2 items and wrong ≥ gapMinErrors times, at bands not above the level. */
export function findGaps(responses: ResponseRecord[], overallBand: number, cfg: Config = defaultConfig): Gap[] {
  const out: Gap[] = [];
  const tally = new Map<string, { checked: number; errors: number; kind: "grammar" | "vocabulary"; key: string }>();
  for (const r of responses) {
    if ((r.section !== "grammar" && r.section !== "vocabulary") || r.correct === null || r.band == null) continue;
    if (r.band > Math.max(overallBand, 0)) continue;
    const it = ladderItem(r.itemId);
    if (!it) continue;
    const key = r.section === "grammar" ? (it as { topic: string }).topic : (it as { theme: string }).theme;
    const id = `${r.section}:${key}`;
    const t = tally.get(id) ?? { checked: 0, errors: 0, kind: r.section, key };
    t.checked++;
    if (!r.correct) t.errors++;
    tally.set(id, t);
  }
  for (const t of tally.values()) {
    if (t.checked < 2 || t.errors < cfg.gapMinErrors) continue;
    if (t.kind === "grammar") {
      const topic = grammar.topics[t.key];
      out.push({ kind: "grammar", key: t.key, label: topic?.ru ?? t.key, module: topic?.module, errors: t.errors, checked: t.checked });
    } else {
      out.push({ kind: "vocabulary", key: t.key, label: `лексика: ${vocabulary.themes[t.key] ?? t.key}`, errors: t.errors, checked: t.checked });
    }
  }
  return out.sort((a, b) => (b.errors ?? 0) - (a.errors ?? 0));
}

/* ------------------------------------------------------------------ zero */

function zeroResult(st: PlacementState, intake: Intake, now: Date, cfg: Config): PlacementResult {
  const z = st.zero!.outcome!;
  const overall = z.preA1Passed ? 0 : -1;
  const offerFullMode = z.correct >= cfg.zeroMode.passToFull;
  const na = (note: string): SkillResult => ({ sublevel: null, label: "не оценено", confidence: null, assessed: false, note });
  const skills: Record<SkillKey, SkillResult> = {
    listening: na("в режиме «с нуля» не проверяется"),
    reading: na("в режиме «с нуля» не проверяется"),
    speaking: na("устная часть пока недоступна в этой версии"),
    writing: na("в режиме «с нуля» не проверяется"),
  };
  const components: Record<ComponentKey, SkillResult> = {
    vocabulary: na("проверены только самые базовые слова"),
    grammar: na("проверены только самые базовые формы"),
  };
  const route = buildRoute({ overall, aboveRange: false, gaps: [], skills, components, intake, mode: "zero", cfg });
  const recommendations = [
    "Начните с модуля «Старт»: звуки, алфавит, числа и первые фразы с опорой на русский.",
    "Занимайтесь коротко, но регулярно — по плану на 60 минут.",
    ...(offerFullMode ? ["Вы справились с большинством заданий — пройдите полную диагностику, чтобы не начинать с самого начала."] : []),
    ...(route.paceWarning ? [route.paceWarning] : []),
  ];
  return {
    mode: "zero",
    completeness: "partial",
    overall,
    overallLabel: overall === 0 ? "Pre-A1 (начальный)" : "начинаете с нуля",
    aboveRange: false,
    confidence: "low",
    confidenceReasons: [`короткая проверка: ${z.correct} из ${z.total} заданий`, "навыки чтения, аудирования, письма и речи не проверялись"],
    meaning: MEANING[overall],
    skills,
    components,
    strengths: [],
    gaps: [],
    recommendations,
    disclaimers: ["Это ориентировочная внутренняя оценка LINGUA, а не сертификат CEFR.", "Режим «с нуля» — короткая проверка из 8 заданий, а не полная диагностика."],
    offerFullMode,
    route,
    configVersion: cfg.version,
    bankVersion: ENGINE_VERSION,
    computedAt: now.toISOString(),
  };
}

/* ----------------------------------------------------------------- route */

const START_BY_SUBLEVEL: Record<number, { code: string; path: 0 | 1 | 2 | null }> = {
  [-1]: { code: "A1-M0", path: 0 },
  0: { code: "A1-M0", path: 0 },
  1: { code: "A1-M1", path: 1 },
  2: { code: "A1-M6", path: null },
  3: { code: "A2-M1", path: null },
  4: { code: "A2-M7", path: null },
  5: { code: "B1-M1", path: null },
  6: { code: "B1-M7", path: null },
  7: { code: "B2-M1", path: null },
  8: { code: "B2-M7", path: null },
};

const SKILL_PRIORITY_TEXT: Record<SkillKey, string> = {
  listening: "Больше аудирования",
  reading: "Больше чтения",
  speaking: "Больше устной практики",
  writing: "Больше письма",
};

export function buildRoute(input: {
  overall: number | null;
  aboveRange: boolean;
  gaps: Gap[];
  skills: Record<SkillKey, SkillResult>;
  components: Record<ComponentKey, SkillResult>;
  intake: Intake;
  mode: "full" | "zero";
  cfg?: Config;
}): Route {
  const cfg = input.cfg ?? defaultConfig;
  const { overall, aboveRange, gaps, skills, components, intake } = input;
  // No skill estimate (should not happen in the full flow): start conservatively from the lower of grammar / vocabulary.
  const basis = overall ?? Math.min(components.grammar.sublevel ?? 3, components.vocabulary.sublevel ?? 3);
  const start = aboveRange ? { code: "B2-M7", path: null } : START_BY_SUBLEVEL[Math.max(-1, Math.min(8, basis))];
  const level = start.code.slice(0, 2) as Route["level"];
  const lvl = catalog.levels.find((l) => l.level === level)!;
  const startIdx = lvl.modules.findIndex((m) => m.code === start.code);
  const gapModules = new Set(gaps.filter((g) => g.module).map((g) => g.module!));
  const explanations: string[] = [];

  const modules: RouteModule[] = lvl.modules.map((m, i) => {
    if (i < startIdx) {
      if (m.code === "A1-M0") return { code: m.code, title: m.title, subtitle: m.subtitle, status: "credited", note: "необязательный вводный модуль" };
      const distance = startIdx - i;
      const withGap = gapModules.has(m.code);
      const status: RouteModule["status"] = distance > cfg.route.maxSkipsWithoutCheckout ? "credited_check" : "credited";
      const note = withGap
        ? "засчитан, но темы с ошибками добавлены в повторение"
        : status === "credited_check"
          ? "засчитан предварительно — подтвердится короткой проверкой"
          : "засчитан по диагностике";
      return { code: m.code, title: m.title, subtitle: m.subtitle, status, note };
    }
    if (i === startIdx) return { code: m.code, title: m.title, subtitle: m.subtitle, status: "start" };
    if (i === startIdx + 1) return { code: m.code, title: m.title, subtitle: m.subtitle, status: "next" };
    return { code: m.code, title: m.title, subtitle: m.subtitle, status: "upcoming" };
  });

  const credited = modules.filter((m) => (m.status === "credited" || m.status === "credited_check") && m.code !== "A1-M0");
  if (credited.length) {
    explanations.push(
      `Модули ${credited[0].code}…${credited[credited.length - 1].code} засчитаны по диагностике: вы справились с заданиями этого уровня.`,
    );
    if (!skills.speaking.assessed) explanations.push("Зачёт не распространяется на цели устной речи — она пока не проверялась.");
  }
  if (level !== "A1" && !aboveRange) explanations.push(`Предыдущие уровни засчитаны: старт на уровне ${level}, а не с начала программы.`);
  if (aboveRange) explanations.push("Ваш уровень выше диапазона программы: предлагаем модули B2-M7…M12 в режиме «проверка → только пробелы».");
  if (start.code === "A1-M0") explanations.push("Начинаем с модуля «Старт» (Pre-A1), затем A1-M1 — путь 0 с опорой на русский.");

  // Review queue (15 §3): gaps that are prerequisites in the starting level → micro-lessons (max 3), the rest → review bank.
  const review: Route["review"] = [];
  let micro = 0;
  for (const g of gaps) {
    if (g.kind === "skill") continue;
    const sameLevel = g.module?.startsWith(level) ?? false;
    const how = sameLevel && micro < 3 ? "microlesson" : "review_bank";
    if (how === "microlesson") micro++;
    review.push({ label: g.label, module: g.module, how });
    explanations.push(`Добавлено повторение: ${g.label}. ${how === "microlesson" ? "Короткий микроурок в первых занятиях." : "Через банк повторения."}`);
  }

  // Priority skills (15 §4).
  const prioritySkills: Route["prioritySkills"] = [];
  if (overall != null) {
    for (const k of Object.keys(skills) as SkillKey[]) {
      const s = skills[k];
      if (s.assessed && overall - s.sublevel! >= 1) prioritySkills.push({ skill: k, reason: `${SKILL_PRIORITY_TEXT[k]}: сейчас этот навык ниже остальных` });
    }
  }
  for (const g of intake.goals) {
    for (const k of GOAL_SKILLS[g]) {
      if (prioritySkills.some((p) => p.skill === k)) continue;
      const s = skills[k];
      if (s.assessed && overall != null && s.sublevel! > overall) continue;
      prioritySkills.push({ skill: k, reason: `${SKILL_PRIORITY_TEXT[k]}: это важно для вашей цели` });
    }
  }
  for (const p of prioritySkills) explanations.push(p.reason + ".");

  // Pace and forecast (15 §5).
  const pace = cfg.pace.allowed.includes(intake.pace) ? intake.pace : cfg.pace.default;
  const paceWarning = pace < cfg.pace.warnBelow ? `При ${pace} занятиях в неделю сроки увеличатся, а повторение может «проседать». Рекомендуем 4–6.` : undefined;
  const remaining = lvl.modules.slice(startIdx).reduce((n, m) => n + (m.lessons ?? cfg.route.lessonsPerModule), 0);
  const lessonsLeft = remaining + Math.ceil(micro / 4) + 1;
  const weeksLeft = Math.ceil(lessonsLeft / pace);

  // Content availability (16 §3): nothing beyond practice lessons exists yet — say so honestly, never send a learner below their level.
  const startMod = lvl.modules[startIdx];
  const ready = !!startMod.ready;
  const content = ready
    ? { ready: true, message: "Модуль готов — можно начинать." }
    : {
        ready: false,
        message: `Модуль ${startMod.code} «${startMod.title}» ещё готовится. Пока доступны практические уроки уровня ${level} из текущего курса — уровень ниже не назначается.`,
        practiceModuleId: lvl.practice,
      };

  return {
    startModule: start.code,
    startTitle: startMod.title,
    path: start.path,
    level,
    mode: aboveRange ? "check_gaps" : "normal",
    modules,
    review,
    prioritySkills,
    pace,
    paceWarning,
    lessonsLeft,
    weeksLeft,
    content,
    explanations,
    rulesVersion: `route-rules-1/${cfg.version}`,
  };
}

function buildRecommendations(input: { gaps: Gap[]; skills: Record<SkillKey, SkillResult>; route: Route; conf: ConfLevel; intake: Intake; cfg: Config }): string[] {
  const { gaps, skills, route, conf } = input;
  const out: string[] = [];
  const g = gaps.filter((x) => x.kind === "grammar").slice(0, 2);
  for (const x of g) out.push(`Повторить: ${x.label}${x.module ? ` (${x.module})` : ""}.`);
  const v = gaps.find((x) => x.kind === "vocabulary");
  if (v) out.push(`Пополнить словарь по теме «${v.label.replace("лексика: ", "")}».`);
  const lag = route.prioritySkills[0];
  if (lag) out.push(`${lag.reason}.`);
  if (!skills.writing.assessed || !skills.speaking.assessed) out.push("Письмо и устная речь пока не проверены: первые занятия включат калибровочные задания.");
  if (conf === 0) out.push("Уровень уточнится на первой контрольной точке модуля.");
  if (route.paceWarning) out.push(route.paceWarning);
  if (out.length < 3) out.push(`Начните с модуля ${route.startModule} «${route.startTitle}» и держите темп ${route.pace} занятий в неделю.`);
  return out.slice(0, 5);
}

export const BANDS_FOR_TESTS = BANDS;
