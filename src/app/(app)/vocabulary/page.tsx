"use client";

import * as React from "react";
import { Check, Eye, EyeOff, Plus, RotateCcw, Search } from "lucide-react";
import { vocabularyFile, CEFR } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { vocabCounts } from "@/lib/store/selectors";
import type { SrsItem, VocabStatus } from "@/lib/store/types";
import { newItem, wordId } from "@/lib/srs";
import { SrsOverview, SrsSession } from "@/components/vocab/srs";
import { STATUS_LABEL, toCard } from "@/lib/vocab";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { WordCard } from "@/components/vocab/word-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

const STATUSES: VocabStatus[] = ["new", "learning", "review", "learned"];

export default function VocabularyPage() {
  const { state, actions } = useStore();
  const words = vocabularyFile.words;
  const counts = vocabCounts(state, words.length);
  const [status, setStatus] = React.useState<"all" | VocabStatus>("all");
  const [level, setLevel] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [hide, setHide] = React.useState(false);
  const [session, setSession] = React.useState<SrsItem[] | null>(null);
  const filtered = words.filter((w) => {
    const st = state.vocabulary[w.id]?.status ?? "new";
    if (status !== "all" && st !== status) return false;
    if (level !== "all" && w.level !== level) return false;
    const q = query.trim().toLowerCase();
    return !q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q) || (w.topic ?? "").toLowerCase().includes(q);
  });

  if (session) return <SrsSession items={session} onExit={() => setSession(null)} />;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Словарь"
        description="Персональный словарь и интервальное повторение: слова из занятий, ваши ошибки и слова курса."
        actions={vocabularyFile.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />

      <SrsOverview onStart={setSession} />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-fg">Слова курса</h2>
          <span className="text-[13px] text-subtle">{counts.learned} из {words.length} выучено</span>
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
                      {!state.srs?.[wordId(w.word)] && (
                        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => actions.srsAdd([newItem({ id: wordId(w.word), kind: "word", front: w.word, back: w.translation, example: w.examples[0], source: { type: "content", ref: w.id, label: "слова курса" } })])}>
                          <Plus /> В повторение
                        </Button>
                      )}
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
