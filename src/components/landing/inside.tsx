"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BrandField } from "@/components/brand/field";
import { Reveal, RevealText } from "@/components/brand/reveal";
import { PronounceButton } from "@/components/vocab/word-card";
import { cn } from "@/lib/utils";

const EASE = [0.2, 0.7, 0.2, 1] as const;

const TABS = [
  { id: "word", label: "Карточка слова", where: "Словарь" },
  { id: "grammar", label: "Грамматика", where: "Урок" },
  { id: "reading", label: "Чтение", where: "Практика" },
  { id: "tutor", label: "AI-репетитор", where: "Диалог" },
  { id: "progress", label: "Прогресс", where: "Аналитика" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/* ---------------------------------------------------------------- word card */

function WordDemo() {
  const [flipped, setFlipped] = React.useState(false);
  const [answer, setAnswer] = React.useState<null | "know" | "again">(null);
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-12">
      <div className="[perspective:1400px]">
        <motion.button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Показать слово" : "Показать перевод"}
          className="relative block h-[280px] w-full cursor-pointer text-left [transform-style:preserve-3d] sm:h-[300px]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 18 }}
        >
          <span className="absolute inset-0 flex flex-col rounded-2xl border border-line bg-card p-7 [backface-visibility:hidden]">
            <span className="text-[12px] tracking-[0.18em] text-subtle">B1 · ПРИЛАГАТЕЛЬНОЕ</span>
            <span className="lang mt-auto text-[52px] leading-none text-fg sm:text-[64px]">reliable</span>
            <span className="mt-3 text-[15px] text-muted">/rɪˈlaɪəbl/</span>
            <span className="mt-auto pt-6 text-[13px] text-subtle">Нажми, чтобы перевернуть</span>
          </span>
          <span className="absolute inset-0 flex flex-col rounded-2xl border border-accent/40 bg-elevated p-7 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-[12px] tracking-[0.18em] text-accent-soft">ПЕРЕВОД</span>
            <span className="mt-auto text-[40px] font-semibold leading-none tracking-[-0.03em] text-fg sm:text-[48px]">надёжный</span>
            <span className="lang mt-5 text-[17px] italic leading-snug text-muted">
              She is a <span className="not-italic text-fg underline decoration-accent decoration-2 underline-offset-4">reliable</span> friend — she always keeps
              her word.
            </span>
            <span className="mt-auto pt-6 text-[13px] text-subtle">Нажми, чтобы вернуться</span>
          </span>
        </motion.button>
      </div>
      <div>
        <p className="text-[15px] leading-relaxed text-muted">
          Каждое слово — с транскрипцией, примером и озвучкой. После ответа слово уходит в интервальное повторение и возвращается тогда,
          когда пора его освежить.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <PronounceButton text="reliable" className="size-11 border border-line" />
          <span className="text-[14px] text-subtle">Послушать произношение</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => setAnswer("know")} className={cn("h-11 rounded-full border px-5 text-[14px] transition-colors", answer === "know" ? "border-accent bg-accent-muted text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg")}>
            Знаю
          </button>
          <button type="button" onClick={() => setAnswer("again")} className={cn("h-11 rounded-full border px-5 text-[14px] transition-colors", answer === "again" ? "border-accent bg-accent-muted text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg")}>
            Повторить ещё
          </button>
        </div>
        <AnimatePresence mode="wait">
          {answer && (
            <motion.p key={answer} className="mt-4 text-[14px] text-accent-soft" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {answer === "know" ? "Отлично — слово вернётся через несколько дней." : "Хорошо — слово вернётся уже сегодня."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ choice helper */

function Choice({
  options,
  correct,
  explain,
  lang = false,
}: {
  options: string[];
  correct: number;
  explain: string;
  lang?: boolean;
}) {
  const [picked, setPicked] = React.useState<number | null>(null);
  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {options.map((o, i) => {
          const state = picked === null ? "idle" : i === correct ? "right" : i === picked ? "wrong" : "rest";
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={cn(
                "flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors",
                lang && "lang text-[17px]",
                state === "idle" && "border-line text-fg hover:border-line-strong hover:bg-elevated",
                state === "right" && "border-success/60 bg-success/10 text-fg",
                state === "wrong" && "border-danger/60 bg-danger/10 text-fg",
                state === "rest" && "border-line text-subtle",
              )}
            >
              <span>{o}</span>
              {state === "right" && <span className="text-[13px] text-success">верно</span>}
              {state === "wrong" && <span className="text-[13px] text-danger">не совсем</span>}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <p className="mt-4 text-[14px] leading-relaxed text-muted">{explain}</p>
            <button type="button" onClick={() => setPicked(null)} className="mt-3 text-[14px] text-accent-soft underline underline-offset-4">
              Попробовать ещё раз
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GrammarDemo() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <p className="text-[12px] tracking-[0.18em] text-subtle">B1 · МОДУЛЬ «УСЛОВНЫЕ ПРЕДЛОЖЕНИЯ»</p>
        <h3 className="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-fg">Second Conditional</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">Воображаемая ситуация в настоящем или будущем: «если бы…, то…».</p>
        <div className="mt-6 rounded-xl border border-line bg-elevated/60 p-5">
          <p className="lang text-[18px] text-fg">
            If + <span className="text-accent-soft">Past Simple</span>, would + <span className="text-accent-soft">V</span>
          </p>
          <p className="lang mt-3 text-[16px] italic text-muted">If I lived by the sea, I would swim every day.</p>
        </div>
      </div>
      <div>
        <p className="mb-4 text-[15px] text-fg">
          Выбери пропущенное слово: <span className="lang text-[17px]">If I ___ more time, I would travel.</span>
        </p>
        <Choice
          lang
          options={["have", "had", "would have"]}
          correct={1}
          explain="После if во втором типе нужен Past Simple — had. Would ставится только во второй части предложения."
        />
      </div>
    </div>
  );
}

function ReadingDemo() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
      <div>
        <p className="text-[12px] tracking-[0.18em] text-subtle">B1 · ТЕКСТ · 1 МИНУТА</p>
        <h3 className="lang mt-3 text-[24px] text-fg">Working from home</h3>
        <p className="lang mt-4 text-[17px] leading-[1.7] text-muted">
          Ten years ago, working from home was a privilege for a few. Today many companies let people choose where they work. Some say they
          are more productive at home; others miss the office and their colleagues.
        </p>
      </div>
      <div>
        <p className="mb-4 text-[15px] text-fg">Что говорится в тексте о работе из дома?</p>
        <Choice
          options={["Десять лет назад это было редкостью", "Все предпочитают работать дома", "Компании это запрещают"]}
          correct={0}
          explain="В первом предложении: «was a privilege for a few» — привилегия для немногих."
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- tutor */

const DIALOG: { role: "user" | "tutor"; node: React.ReactNode }[] = [
  { role: "user", node: <span className="lang">Yesterday I have went to the cinema.</span> },
  {
    role: "tutor",
    node: (
      <>
        Почти! <span className="lang text-subtle line-through">have went</span> → <span className="lang font-medium text-fg">went</span>. Со словом{" "}
        <span className="lang">yesterday</span> нужен Past Simple: <span className="lang italic">Yesterday I went to the cinema.</span>
      </>
    ),
  },
  {
    role: "tutor",
    node: (
      <>
        А какой фильм ты смотрел? Ответь по-английски — разберём вместе.
      </>
    ),
  },
];

function TutorDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(reduce ? DIALOG.length : 0);
  React.useEffect(() => {
    if (!inView || shown >= DIALOG.length) return;
    const t = window.setTimeout(() => setShown((s) => s + 1), shown === 0 ? 250 : 1100);
    return () => window.clearTimeout(t);
  }, [inView, shown]);
  const typing = inView && shown < DIALOG.length && shown > 0;

  return (
    <div ref={ref} className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
      <div>
        <p className="text-[12px] tracking-[0.18em] text-subtle">РЕЖИМ «УЧИТЕЛЬ»</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Репетитор объясняет правила, исправляет ошибки и задаёт следующий вопрос. Можно выбрать режим: учитель, экзаменатор, собеседник,
          тренер словаря.
        </p>
        <p className="mt-5 text-[13px] text-subtle">Ниже — заранее написанный пример диалога, а не живой ответ модели.</p>
      </div>
      <div className="flex min-h-[260px] flex-col gap-3">
        {DIALOG.slice(0, shown).map((m, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className={cn(
              "max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
              m.role === "user" ? "self-end rounded-br-md bg-primary text-on-primary" : "self-start rounded-bl-md border border-line bg-card text-muted",
            )}
          >
            {m.node}
          </motion.div>
        ))}
        {typing && (
          <div className="flex gap-1 self-start rounded-2xl border border-line bg-card px-4 py-4" aria-label="Репетитор печатает">
            {[0, 1, 2].map((d) => (
              <motion.span key={d} className="size-1.5 rounded-full bg-subtle" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.15 }} />
            ))}
          </div>
        )}
        {shown >= DIALOG.length && (
          <button type="button" onClick={() => setShown(0)} className="mt-1 self-start text-[13px] text-subtle underline underline-offset-4 hover:text-fg">
            Показать ещё раз
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- progress */

const SKILLS = [
  { name: "Грамматика", v: 72 },
  { name: "Словарь", v: 64 },
  { name: "Чтение", v: 81 },
  { name: "Аудирование", v: 58 },
  { name: "Разговорная речь", v: 46 },
  { name: "Письмо", v: 52 },
];

function ProgressDemo() {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
      <div>
        <p className="text-[12px] tracking-[0.18em] text-subtle">ДЕМО-ДАННЫЕ</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Прогресс считается по реальным ответам: тестам, практике и повторению слов. Видно, какой навык отстаёт и что делать дальше.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { k: "12", l: "дней подряд" },
            { k: "38", l: "слов в повторении" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-line p-4">
              <div className="tabular text-[32px] font-semibold leading-none tracking-[-0.03em] text-fg">{s.k}</div>
              <div className="mt-2 text-[13px] text-subtle">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <ul className="flex flex-col gap-4">
        {SKILLS.map((s, i) => (
          <li key={s.name}>
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="text-fg">{s.name}</span>
              <span className="tabular text-subtle">{s.v}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
              <motion.div
                className="h-full origin-left rounded-full bg-accent"
                style={{ width: `${s.v}%` }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.1 + i * 0.07, ease: EASE }}
              />
            </div>
          </li>
        ))}
        <li className="pt-1 text-[13px] text-subtle">Цифры приведены для примера и не принадлежат реальному ученику.</li>
      </ul>
    </div>
  );
}

const PANELS: Record<TabId, () => React.JSX.Element> = {
  word: WordDemo,
  grammar: GrammarDemo,
  reading: ReadingDemo,
  tutor: TutorDemo,
  progress: ProgressDemo,
};

/** Honest, interactive preview of the learning tools. Everything here is a labelled sample. */
export function InsideSection() {
  const [tab, setTab] = React.useState<TabId>("word");
  const Panel = PANELS[tab];
  const current = TABS.find((t) => t.id === tab)!;
  // The dark chapter opens like a window as it scrolls in: inset + radius shrink to zero.
  const wrap = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start end", "start 15%"] });
  const inset = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [4, 0]);
  const radius = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, 0]);
  const clipPath = useTransform([inset, radius], ([i, r]) => `inset(0 ${i}% round ${r}px)`);

  return (
    <motion.div ref={wrap} style={{ clipPath }} className="bg-surface">
    <BrandField id="inside" data-theme="dark" className="scroll-mt-0 overflow-hidden text-fg" floor={false}>
      <div className="mx-auto max-w-[1320px] px-5 py-28 sm:px-8 lg:py-40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c8b99f]/30 px-3 py-1 text-[12px] tracking-[0.12em] text-[#c8b99f]">
                <span className="size-1.5 rounded-full bg-[#c8b99f]" />
                ДЕМОНСТРАЦИЯ
              </span>
            </Reveal>
            <RevealText
              text="Так выглядит обучение изнутри."
              className="mt-6 max-w-[14ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#e9e4da] sm:text-[56px] lg:text-[68px]"
            />
          </div>
          <Reveal delay={0.15}>
            <p className="max-w-[38ch] text-[16px] leading-relaxed text-[#a39d92]">
              Попробуй сам: переверни карточку, ответь на вопрос, посмотри на диалог. Это интерактивный пример — слова, задания и цифры здесь
              образцы.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-14 lg:mt-20">
          <div role="tablist" aria-label="Примеры" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`inside-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="inside-panel"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative h-11 shrink-0 rounded-full px-5 text-[14px] transition-colors",
                  tab === t.id ? "text-[#111110]" : "text-[#a39d92] hover:text-[#e9e4da]",
                )}
              >
                {tab === t.id && <motion.span layoutId="inside-tab" className="absolute inset-0 rounded-full bg-[#e9e4da]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                {tab !== t.id && <span className="absolute inset-0 rounded-full border border-[#2b2925]" />}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-line bg-surface/80 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.8)] backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5 sm:px-7">
              <span className="font-[family-name:var(--font-display)] text-[14px] font-bold tracking-[-0.03em] text-fg">
                LINGUA <span className="font-sans font-normal tracking-normal text-subtle">· {current.where}</span>
              </span>
              <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-[11.5px] text-accent-soft">Пример</span>
            </div>
            <div id="inside-panel" role="tabpanel" aria-labelledby={`inside-tab-${tab}`} className="min-h-[420px] p-5 sm:p-8 lg:p-12">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                  <Panel />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </BrandField>
    </motion.div>
  );
}
