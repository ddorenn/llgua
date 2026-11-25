"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Eye, EyeOff, RotateCcw, Search, X } from "lucide-react";
import { vocabularyFile, CEFR, type VocabWord } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { vocabCounts } from "@/lib/store/selectors";
import type { VocabStatus } from "@/lib/store/types";
import { reviewQueue, STATUS_LABEL, toCard } from "@/lib/vocab";
import { cn, plural } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { ExampleSentence, PronounceButton, StrengthMeter, WordCard } from "@/components/vocab/word-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";

const STATUSES: VocabStatus[] = ["new", "learning", "review", "learned"];

function ReviewSession({ queue, onExit }: { queue: VocabWord[]; onExit: () => void }) {
  const { state, actions } = useStore();
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [results, setResults] = React.useState({ knew: 0, missed: 0 });
  const done = i >= queue.length;
  const w = queue[i];
  const card = w ? toCard(w, state.vocabulary[w.id]) : null;

  const answer = React.useCallback(
    (knew: boolean) => {
      if (!w) return;
      actions.reviewWord(w.id, knew);
      setResults((r) => ({ knew: r.knew + (knew ? 1 : 0), missed: r.missed + (knew ? 0 : 1) }));
      setFlipped(false);
      setI((x) => x + 1);
    },
    [w, actions],
  );

  React.useEffect(() => {
    if (done) actions.logReviewSession(queue.length);
  }, [done, queue.length, actions]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped && e.key === "ArrowRight") answer(true);
      if (flipped && e.key === "ArrowLeft") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, answer, done]);

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <p className="text-[14px] text-muted">Повторение завершено</p>
        <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.03em] text-fg">
          Помню {results.knew} из {queue.length}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {results.missed
            ? `${results.missed} ${plural(results.missed, "слово вернётся", "слова вернутся", "слов вернутся")} раньше при следующем повторении.`
            : "Все слова запомнились. Они будут иногда возвращаться, чтобы не забылись."}
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={onExit}>К словарю</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X /> Завершить
        </Button>
        <Progress value={(i / queue.length) * 100} />
        <span className="tabular shrink-0 text-[13px] text-muted">
          {i + 1} из {queue.length}
        </span>
      </div>

      <div className="[perspective:1400px]">
        <motion.button
          key={w.id}
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Скрыть ответ" : "Показать ответ"}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, rotateY: reduce ? 0 : flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative block min-h-[320px] w-full cursor-pointer rounded-xl text-left"
        >
          {/* front */}
          <span
            className={cn(
              "absolute inset-0 flex flex-col rounded-xl border border-line bg-card p-8 shadow-pop [backface-visibility:hidden]",
              reduce && flipped && "invisible",
            )}
          >
            <span className="text-[12.5px] text-subtle">
              {card!.level}, {card!.partOfSpeech}
            </span>
            <span className="my-auto">
              <span className="lang block text-[44px] font-semibold leading-none text-fg">{card!.word}</span>
              {card!.pronunciation && <span className="lang mt-3 block text-[18px] text-muted">{card!.pronunciation}</span>}
            </span>
            <span className="text-[13px] text-subtle">Вспомни значение и нажми на карточку или пробел</span>
          </span>
          {/* back */}
          <span
            className={cn(
              "absolute inset-0 flex flex-col rounded-xl border border-accent-line bg-card p-8 shadow-pop [backface-visibility:hidden] [transform:rotateY(180deg)]",
              reduce && "[transform:none]",
              reduce && !flipped && "invisible",
            )}
          >
            <span className="lang text-[20px] font-semibold text-fg">{card!.word}</span>
            <span className="my-auto">
              <span className="block text-[30px] font-medium leading-tight text-accent-soft">{card!.translation}</span>
              {card!.example && <ExampleSentence text={card!.example} word={card!.word} className="mt-4 text-[17px] leading-relaxed text-muted" />}
            </span>
            <StrengthMeter value={card!.strength} />
          </span>
        </motion.button>
      </div>

      <div className="flex items-center justify-center">
        <PronounceButton text={w.word} />
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" onClick={() => answer(false)}>
              <X /> Не помню
            </Button>
            <Button size="lg" onClick={() => answer(true)}>
              <Check /> Помню
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-center text-[12.5px] text-subtle">Клавиши: пробел переворачивает карточку, ← не помню, → помню</p>
    </div>
  );
}

export default function VocabularyPage() {
  const { state, actions } = useStore();
  const words = vocabularyFile.words;
  const counts = vocabCounts(state, words.length);
  const [status, setStatus] = React.useState<"all" | VocabStatus>("all");
  const [level, setLevel] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [hide, setHide] = React.useState(false);
  const [reviewList, setReviewList] = React.useState<VocabWord[] | null>(null);

  const queue = reviewQueue(words, state.vocabulary);
  const filtered = words.filter((w) => {
    const st = state.vocabulary[w.id]?.status ?? "new";
    if (status !== "all" && st !== status) return false;
    if (level !== "all" && w.level !== level) return false;
    const q = query.trim().toLowerCase();
    return !q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q) || (w.topic ?? "").toLowerCase().includes(q);
  });

  if (reviewList) return <ReviewSession queue={reviewList} onExit={() => setReviewList(null)} />;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Словарь"
        description="Твой банк слов. Каждый верный ответ при повторении укрепляет слово; пять подряд — и оно выучено."
        actions={vocabularyFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />

      {/* Review prompt + status counts */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-end">
        <div className="rounded-xl border border-line bg-card p-6 shadow-lift">
          <p className="text-[13.5px] text-muted">{queue.length ? "Готово к повторению" : "Повторять нечего"}</p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-fg">
            {queue.length} {plural(queue.length, "слово", "слова", "слов")}
          </p>
          <p className="lang mt-2 truncate text-[16px] italic text-muted">{queue.slice(0, 4).map((w) => w.word).join(", ")}</p>
          <Button className="mt-5" onClick={() => setReviewList(queue)} disabled={!queue.length}>
            Начать повторение
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? "all" : s)}
              aria-pressed={status === s}
              className={cn(
                "cursor-pointer border-t-2 pt-3 text-left transition-colors",
                status === s ? "border-accent" : "border-line hover:border-line-strong",
              )}
            >
              <div className={cn("text-[13px]", status === s ? "text-accent-soft" : "text-muted")}>{STATUS_LABEL[s]}</div>
              <div className="tabular mt-1 text-[26px] font-semibold tracking-[-0.03em] text-fg">{counts[s]}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Слово, перевод или тема" className="pl-9" aria-label="Поиск по словарю" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs size="sm" value={level} onChange={setLevel} items={[{ value: "all", label: "Все уровни" }, ...CEFR.map((l) => ({ value: l, label: l }))]} />
            <Button variant="ghost" size="sm" onClick={() => setHide((h) => !h)} aria-pressed={hide}>
              {hide ? <Eye /> : <EyeOff />} {hide ? "Показать" : "Скрыть"} translations
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Слов не найдено"
            description="Попробуй другой запрос или фильтр."
            action={
              <Button variant="secondary" size="sm" onClick={() => { setQuery(""); setLevel("all"); setStatus("all"); }}>
                <RotateCcw /> Сбросить фильтры
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((w) => {
              const card = toCard(w, state.vocabulary[w.id]);
              return (
                <WordCard
                  key={w.id}
                  card={card}
                  hideTranslation={hide}
                  footer={
                    <div className="flex flex-wrap gap-2">
                      {card.status !== "learned" && (
                        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => actions.setWordStatus(w.id, "learned")}>
                          <Check /> Знаю это слово
                        </Button>
                      )}
                      {card.status !== "new" && (
                        <Button variant="ghost" size="sm" className={card.status === "learned" ? "-ml-3" : ""} onClick={() => actions.setWordStatus(w.id, "new")}>
                          <RotateCcw /> Сбросить
                        </Button>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
