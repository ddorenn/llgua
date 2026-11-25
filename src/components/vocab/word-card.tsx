"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";
import type { VocabCard } from "@/lib/vocab";
import { VOCAB_RULES } from "@/lib/vocab";
import { speak, ttsSupported } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * Presentational word card. Takes a plain VocabCard view model (no store access),
 * so the same layout can be reused by other clients such as a Telegram Mini App.
 */
export function StrengthMeter({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-label={`Strength ${value} of ${VOCAB_RULES.meterSteps}`}>
      {Array.from({ length: VOCAB_RULES.meterSteps }).map((_, i) => (
        <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < value ? "bg-accent" : "bg-elevated")} />
      ))}
    </span>
  );
}

export function PronounceButton({ text, className }: { text: string; className?: string }) {
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => setSupported(ttsSupported()), []);
  if (!supported) return null;
  return (
    <button
      type="button"
      aria-label={`Pronounce ${text}`}
      title="Pronounce"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { rate: 0.85 });
      }}
      className={cn("inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-fg", className)}
    >
      <Volume2 className="size-4" />
    </button>
  );
}

/** Highlight the target word inside its example sentence. */
export function ExampleSentence({ text, word, className }: { text: string; word: string; className?: string }) {
  const idx = text.toLowerCase().indexOf(word.toLowerCase().split(" ")[0]);
  if (idx < 0) return <p className={cn("lang italic", className)}>{text}</p>;
  const end = idx + word.split(" ")[0].length;
  return (
    <p className={cn("lang italic", className)}>
      {text.slice(0, idx)}
      <span className="not-italic text-fg underline decoration-accent decoration-2 underline-offset-4">{text.slice(idx, end)}</span>
      {text.slice(end)}
    </p>
  );
}

export function WordCard({
  card,
  hideTranslation,
  footer,
}: {
  card: VocabCard;
  hideTranslation?: boolean;
  footer?: React.ReactNode;
}) {
  const [reveal, setReveal] = React.useState(false);
  const hidden = hideTranslation && !reveal;
  return (
    <article className="group flex h-full flex-col rounded-lg border border-line bg-card p-5 shadow-lift transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="lang truncate text-[24px] font-semibold leading-tight text-fg">{card.word}</h3>
          <p className="mt-1 text-[13px] text-muted">
            <span className="italic">{card.partOfSpeech}</span>
            {card.pronunciation && <span className="lang ml-2 text-[14px]">{card.pronunciation}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[12px] font-medium text-subtle">{card.level}</span>
          <PronounceButton text={card.word} />
        </div>
      </header>

      <button
        type="button"
        onClick={() => setReveal((r) => !r)}
        disabled={!hideTranslation}
        className={cn(
          "mt-4 text-left text-[16px] transition-colors disabled:cursor-default",
          hidden ? "cursor-pointer rounded-md bg-elevated px-3 py-1.5 text-[13.5px] text-muted hover:text-fg" : "text-fg",
        )}
        aria-label={hidden ? "Reveal translation" : undefined}
      >
        {hidden ? "Show translation" : card.translation}
      </button>

      {card.example && <ExampleSentence text={card.example} word={card.word} className="mt-3 text-[15px] leading-relaxed text-muted" />}

      <footer className="mt-auto pt-5">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className={cn(card.status === "learned" ? "text-success" : card.status === "new" ? "text-subtle" : "text-accent-soft")}>
            {card.statusLabel}
          </span>
          <span className="text-subtle">{card.reviews ? `${card.reviews} review${card.reviews === 1 ? "" : "s"}` : "Not reviewed yet"}</span>
        </div>
        <StrengthMeter value={card.strength} className="mt-2" />
        {footer && <div className="mt-4">{footer}</div>}
      </footer>
    </article>
  );
}
