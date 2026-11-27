/**
 * Lesson content tool. No app code changes are needed to add content: lessons are JSON files.
 *
 *   npm run lessons -- validate [file ...]          validate files (default: every content/lessons/*.json)
 *   npm run lessons -- new <id> --module A1-M1 [--type A]   create a draft skeleton in content/lessons/drafts/
 *   npm run lessons -- import <file|dir> [--force]   validate and copy into content/lessons/ (refuses a lower/equal version unless --force)
 *   npm run lessons -- modules                       module readiness: published lessons per catalog module
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { LessonSchema, validateLesson, type Lesson } from "../src/lib/lessons/schema";
import { catalog } from "../src/lib/placement/bank";

const DIR = "content/lessons";
const KINDS = ["warmup", "input", "practice", "use", "feedback", "wrapup"];
const modules = new Map(catalog.levels.flatMap((l) => l.modules.map((m) => [m.code, { ...m, level: l.level }])));

function files(args: string[]): string[] {
  if (!args.length) return readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => path.join(DIR, f));
  return args.flatMap((a) => (statSync(a).isDirectory() ? readdirSync(a).filter((f) => f.endsWith(".json")).map((f) => path.join(a, f)) : [a]));
}

/** Schema + structural checks + editorial checks from the lesson standard (11). */
export function check(file: string): { lesson: Lesson | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { lesson: null, errors: [`не JSON: ${(e as Error).message}`], warnings };
  }
  const parsed = LessonSchema.safeParse(json);
  if (!parsed.success) return { lesson: null, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(корень)"}: ${i.message}`), warnings };
  const l = parsed.data;
  errors.push(...validateLesson(l));
  const kinds = l.stages.map((s) => s.kind);
  if (l.type !== "K" && JSON.stringify(kinds) !== JSON.stringify(KINDS)) warnings.push(`этапы ${kinds.join(" → ")} не совпадают с каркасом 11 §2 (${KINDS.join(" → ")})`);
  const mod = modules.get(l.module);
  if (!mod) errors.push(`модуль ${l.module} не найден в content/placement/catalog.json`);
  else if (!(l.level === mod.level || (l.level === "Pre-A1" && mod.code === "A1-M0"))) errors.push(`уровень урока ${l.level} не совпадает с уровнем модуля ${mod.code} (${mod.level})`);
  if (!l.stages.some((s) => s.blocks.some((b) => b.type === "feedback"))) warnings.push("нет блока feedback (этап 5)");
  if (!l.stages.some((s) => s.blocks.some((b) => b.type === "summary"))) warnings.push("нет блока summary с can-do (этап 6)");
  const graded = l.stages.flatMap((s) => s.blocks).filter((b) => ["choice", "gap", "order", "match", "reading", "listening", "dialogue"].includes(b.type)).length;
  if (graded < 6) warnings.push(`мало проверяемых заданий (${graded}) — практика может не дать данных`);
  if (path.basename(file, ".json") !== l.id) warnings.push(`имя файла не совпадает с id (${l.id})`);
  return { lesson: l, errors, warnings };
}

function validate(args: string[]) {
  let bad = 0;
  const ids = new Map<string, string>();
  for (const f of files(args)) {
    const r = check(f);
    if (r.lesson) {
      if (ids.has(r.lesson.id)) r.errors.push(`id ${r.lesson.id} уже есть в ${ids.get(r.lesson.id)}`);
      ids.set(r.lesson.id, f);
    }
    console.log(`${r.errors.length ? "✗" : "✓"} ${f}${r.lesson ? ` — ${r.lesson.title} (${r.lesson.level}, ${r.lesson.module}, ${r.lesson.status})` : ""}`);
    for (const e of r.errors) console.log(`    ошибка: ${e}`);
    for (const w of r.warnings) console.log(`    внимание: ${w}`);
    if (r.errors.length) bad++;
  }
  if (bad) process.exit(1);
}

function skeleton(id: string, moduleCode: string, type: string): Lesson {
  const mod = modules.get(moduleCode);
  if (!mod) throw new Error(`модуль ${moduleCode} не найден в каталоге`);
  const level = (mod.code === "A1-M0" ? "Pre-A1" : mod.level) as Lesson["level"];
  const todo = (s: string) => `TODO: ${s}`;
  return {
    id,
    version: 1,
    status: "draft",
    title: todo("название урока"),
    level,
    module: moduleCode,
    type: type as Lesson["type"],
    objective: todo("главная can-do цель занятия"),
    languageGoals: [todo("языковая цель")],
    minutes: 60,
    feedbackLanguage: level === "B2" ? "en" : level === "B1" ? "mixed" : "ru",
    stages: [
      { id: "warmup", kind: "warmup", title: "Разминка", goal: todo("цель"), minutes: 7, role: "vocabulary-coach", blocks: [{ type: "review", id: "warmup-review", count: 6, fallback: [{ id: "r1", prompt: "TODO ___ .", answers: ["todo"], explanation: todo("объяснение") }] }] },
      { id: "input", kind: "input", title: "Новый материал", goal: todo("цель"), minutes: 13, role: "teacher", blocks: [{ type: "explain", id: "input-explain", body: todo("объяснение правила") }, { type: "choice", id: "input-cc1", check: "concept", prompt: todo("concept-check"), options: ["A", "B"], answer: 0, explanation: todo("почему") }] },
      { id: "practice", kind: "practice", title: "Практика", goal: todo("цель"), minutes: 13, role: "teacher", blocks: [{ type: "gap", id: "practice-g1", check: "practice", prompt: "TODO ___ .", answers: ["todo"], explanation: todo("почему") }] },
      { id: "use", kind: "use", title: "Применение", goal: todo("цель"), minutes: 18, role: "speaking-partner", blocks: [{ type: "writing", id: "use-writing", title: todo("задание"), instruction: todo("инструкция на русском"), prompt: "TODO: task in English", words: [40, 70], targets: [], checklist: [] }] },
      { id: "feedback", kind: "feedback", title: "Обратная связь", goal: "Увидеть, что получилось, и исправить до трёх ключевых ошибок.", minutes: 6, role: "teacher", blocks: [{ type: "feedback", id: "feedback-main" }] },
      { id: "wrapup", kind: "wrapup", title: "Итог", goal: "Отметить, что получается.", minutes: 3, role: "planner", blocks: [{ type: "summary", id: "wrapup-summary", cando: [todo("can-do")] }] },
    ],
  };
}

function create(args: string[]) {
  const id = args[0];
  const flag = (n: string) => args[args.indexOf(n) + 1];
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id) || !args.includes("--module")) {
    console.error("использование: npm run lessons -- new <id> --module A1-M1 [--type A]");
    process.exit(1);
  }
  const lesson = skeleton(id, flag("--module"), args.includes("--type") ? flag("--type") : "A");
  mkdirSync(path.join(DIR, "drafts"), { recursive: true });
  const out = path.join(DIR, "drafts", `${id}.json`);
  if (existsSync(out)) throw new Error(`${out} уже существует`);
  writeFileSync(out, JSON.stringify(lesson, null, 2) + "\n");
  console.log(`✓ черновик создан: ${out}\n  Заполните TODO, затем: npm run lessons -- import ${out}`);
}

function importLessons(args: string[]) {
  const force = args.includes("--force");
  const src = files(args.filter((a) => a !== "--force"));
  let imported = 0;
  for (const f of src) {
    const r = check(f);
    if (!r.lesson || r.errors.length) {
      console.log(`✗ ${f}: не импортирован`);
      for (const e of r.errors) console.log(`    ошибка: ${e}`);
      continue;
    }
    if (JSON.stringify(r.lesson).includes("TODO")) {
      console.log(`✗ ${f}: остались TODO — заполните перед импортом`);
      continue;
    }
    const dest = path.join(DIR, `${r.lesson.id}.json`);
    if (existsSync(dest) && !force) {
      const cur = LessonSchema.safeParse(JSON.parse(readFileSync(dest, "utf8")));
      if (cur.success && cur.data.version >= r.lesson.version) {
        console.log(`✗ ${f}: в ${dest} уже версия ${cur.data.version}. Увеличьте version (старые попытки ссылаются на старую) или используйте --force`);
        continue;
      }
    }
    copyFileSync(f, dest);
    imported++;
    console.log(`✓ ${r.lesson.id} v${r.lesson.version} → ${dest}${r.warnings.length ? ` (замечаний: ${r.warnings.length})` : ""}`);
  }
  console.log(`Импортировано: ${imported} из ${src.length}. Урок появится в приложении после деплоя.`);
}

function modulesReport() {
  const lessons = files([]).map((f) => check(f).lesson).filter((l): l is Lesson => !!l);
  for (const lvl of catalog.levels) {
    console.log(`\n${lvl.level}`);
    for (const m of lvl.modules) {
      const all = lessons.filter((l) => l.module === m.code);
      const pub = all.filter((l) => l.status === "published" || l.status === "reviewed");
      const need = m.lessons ?? 12;
      if (all.length) console.log(`  ${m.code.padEnd(7)} ${m.title.padEnd(28)} ${pub.length}/${need} готово${all.length > pub.length ? `, ${all.length - pub.length} черновик/демо` : ""}${pub.length >= need ? "  ✓ модуль готов" : ""}`);
    }
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "validate") validate(rest);
else if (cmd === "new") create(rest);
else if (cmd === "import") importLessons(rest);
else if (cmd === "modules") modulesReport();
else {
  console.log("команды: validate | new | import | modules");
  process.exit(cmd ? 1 : 0);
}
