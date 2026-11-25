"use client";

import * as React from "react";
import { Check, Eye, EyeOff, Layers, PartyPopper, RotateCcw, Search, Volume2, X } from "lucide-react";
import { vocabularyFile, CEFR, type VocabWord } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { vocabCounts } from "@/lib/store/selectors";
import type { VocabStatus } from "@/lib/store/types";
import { speak, ttsSupported } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";

const STATUS_META: Record<VocabStatus, { label: string; variant: "default" | "info" | "accent" | "success" }> = {
  new: { label: "New", variant: "default" },
  learning: { label: "Learning", variant: "info" },
  review: { label: "Reviewing", variant: "accent" },
  learned: { label: "Learned", variant: "success" },
};

function PronounceButton({ text }: { text: string }) {
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => setSupported(ttsSupported()), []);
  if (!supported) return null;
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Pronounce ${text}`} title="Pronounce (browser voice)" onClick={(e) => { e.stopPropagation(); speak(text, { rate: 0.85 }); }}>
      <Volume2 />
    </Button>
  );
}

function WordCard({ w, hideTranslation }: { w: VocabWord; hideTranslation: boolean }) {
  const { state, actions } = useStore();
  const status = state.vocabulary[w.id]?.status ?? "new";
  const [reveal, setReveal] = React.useState(false);
  return (
    <Card className="flex flex-col transition-colors hover:border-line-strong">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-[17px] font-semibold tracking-tight">{w.word}</h3>
              <PronounceButton text={w.word} />
            </div>
            <div className="text-[12px] text-subtle">
              <span className="italic">{w.pos}</span>
              {w.ipa && <span className="ml-2 font-mono text-muted">{w.ipa}</span>}
            </div>
          </div>
          <Badge variant="outline">{w.level}</Badge>
        </div>

        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          className={cn(
            "flex cursor-pointer items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-left text-[14px]",
            hideTranslation && !reveal ? "text-subtle" : "text-fg",
          )}
          aria-label={hideTranslation && !reveal ? "Reveal translation" : "Translation"}
        >
          <span>{hideTranslation && !reveal ? "Tap to reveal translation" : w.translation}</span>
          {hideTranslation && (reveal ? <EyeOff className="size-3.5 text-subtle" /> : <Eye className="size-3.5 text-subtle" />)}
        </button>

        {w.examples[0] && <p className="text-[13px] leading-relaxed text-muted">“{w.examples[0]}”</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-2 text-[11.5px] text-subtle">
            <span className={cn("size-1.5 rounded-full", { new: "bg-line-strong", learning: "bg-info", review: "bg-accent-soft", learned: "bg-success" }[status])} />
            {state.vocabulary[w.id]?.reviews ? `${state.vocabulary[w.id].reviews} reviews` : "Not reviewed"}
          </span>
          <Select
            aria-label={`Set status for ${w.word}`}
            value={status}
            onChange={(e) => actions.setWordStatus(w.id, e.target.value as VocabStatus)}
            className="h-8 w-[124px] text-[12px]"
          >
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewSession({ queue, onExit }: { queue: VocabWord[]; onExit: () => void }) {
  const { actions } = useStore();
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [results, setResults] = React.useState({ knew: 0, missed: 0 });
  const done = i >= queue.length;
  const w = queue[i];

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
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped && e.key === "ArrowRight") answer(true);
      if (flipped && e.key === "ArrowLeft") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, answer, done]);

  if (done) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-accent/30 bg-accent-muted text-accent-soft">
            <PartyPopper className="size-5" />
          </div>
          <h2 className="text-[20px] font-semibold">Session complete</h2>
          <p className="mt-1.5 text-[14px] text-muted">
            {results.knew} known · {results.missed} to practise again
          </p>
          <Button className="mt-6" onClick={onExit}>Back to vocabulary</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(i / queue.length) * 100} />
        <span className="tabular shrink-0 text-[12px] text-muted">{i + 1} / {queue.length}</span>
        <Button variant="ghost" size="sm" onClick={onExit}>End</Button>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-72 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-line bg-card px-8 py-10 text-center transition-colors hover:border-line-strong"
        aria-label={flipped ? "Hide answer" : "Show answer"}
      >
        <Badge variant="outline" className="mb-4">{w.level} · {w.pos}</Badge>
        <div className="text-[32px] font-semibold tracking-tight">{w.word}</div>
        {w.ipa && <div className="mt-1 font-mono text-[13px] text-muted">{w.ipa}</div>}
        {flipped ? (
          <div className="mt-6 animate-fade-in space-y-2">
            <div className="text-[20px] text-accent-soft">{w.translation}</div>
            {w.examples[0] && <p className="text-[14px] text-muted">“{w.examples[0]}”</p>}
          </div>
        ) : (
          <div className="mt-6 text-[13px] text-subtle">Recall the meaning, then tap or press Space</div>
        )}
      </button>
      <div className="flex items-center justify-center gap-2">
        <PronounceButton text={w.word} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="danger" size="lg" disabled={!flipped} onClick={() => answer(false)}>
          <X /> Didn’t know
        </Button>
        <Button size="lg" disabled={!flipped} onClick={() => answer(true)}>
          <Check /> I knew it
        </Button>
      </div>
      <p className="text-center text-[11.5px] text-subtle">Keyboard: Space to flip · ← didn’t know · → knew it</p>
    </div>
  );
}

export default function VocabularyPage() {
  const { state } = useStore();
  const words = vocabularyFile.words;
  const counts = vocabCounts(state, words.length);
  const [status, setStatus] = React.useState<"all" | VocabStatus>("all");
  const [level, setLevel] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [hide, setHide] = React.useState(false);
  const [reviewQueue, setReviewQueue] = React.useState<VocabWord[] | null>(null);

  const filtered = words.filter((w) => {
    const st = state.vocabulary[w.id]?.status ?? "new";
    if (status !== "all" && st !== status) return false;
    if (level !== "all" && w.level !== level) return false;
    const q = query.trim().toLowerCase();
    return !q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q) || (w.topic ?? "").toLowerCase().includes(q);
  });

  const due = words.filter((w) => (state.vocabulary[w.id]?.status ?? "new") !== "learned");

  if (reviewQueue) return <ReviewSession queue={reviewQueue} onExit={() => setReviewQueue(null)} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vocabulary"
        description="Your personal word bank. Review with flashcards; words move from New → Learning → Reviewing → Learned as you answer correctly."
        actions={
          <>
            {vocabularyFile.meta.sample && <SampleBadge kind="content" />}
            <Button onClick={() => setReviewQueue([...due].sort(() => Math.random() - 0.5).slice(0, 15))} disabled={!due.length}>
              <Layers /> Review {Math.min(15, due.length)} cards
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["new", "learning", "review", "learned"] as VocabStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? "all" : s)}
            aria-pressed={status === s}
            className={cn(
              "cursor-pointer rounded-lg border px-4 py-3.5 text-left transition-colors",
              status === s ? "border-accent/50 bg-accent-muted/50" : "border-line bg-card hover:border-line-strong",
            )}
          >
            <div className="text-[12px] text-muted">{STATUS_META[s].label}</div>
            <div className="tabular mt-1 text-[22px] font-semibold">{counts[s]}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search words, translations or topics" className="pl-9" aria-label="Search vocabulary" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            size="sm"
            value={level}
            onChange={setLevel}
            items={[{ value: "all", label: "All levels" }, ...CEFR.map((l) => ({ value: l, label: l }))]}
          />
          <Button variant="secondary" size="sm" onClick={() => setHide((h) => !h)} aria-pressed={hide}>
            {hide ? <Eye /> : <EyeOff />} {hide ? "Show" : "Hide"} translations
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No words match"
          description="Try a different search or filter."
          action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); setLevel("all"); setStatus("all"); }}><RotateCcw /> Reset filters</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => (
            <WordCard key={w.id} w={w} hideTranslation={hide} />
          ))}
        </div>
      )}
    </div>
  );
}
