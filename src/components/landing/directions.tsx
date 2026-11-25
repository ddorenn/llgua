"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { RevealText } from "@/components/brand/reveal";
import { cn } from "@/lib/utils";

/** Small visual for each direction; it comes alive on hover/focus (pure CSS, group-hover). */
function Motif({ kind }: { kind: string }) {
  switch (kind) {
    case "grammar":
      return (
        <p className="lang text-[22px] leading-snug text-muted sm:text-[28px] lg:text-[34px]">
          If I <span className="-mx-0.5 rounded px-0.5 transition-colors duration-500 group-hover:bg-accent-muted group-hover:text-fg group-focus-visible:bg-accent-muted">had known</span>, I{" "}
          <span className="-mx-0.5 rounded px-0.5 transition-colors delay-100 duration-500 group-hover:bg-accent-muted group-hover:text-fg group-focus-visible:bg-accent-muted">would have come</span>.
        </p>
      );
    case "vocab":
      return (
        <div className="flex flex-wrap gap-2">
          {["reliable", "thorough", "reluctant", "to rely on"].map((w, i) => (
            <span
              key={w}
              style={{ transitionDelay: `${i * 60}ms` }}
              className="lang rounded-full border border-line px-3 py-1 text-[15px] text-muted transition-[transform,color,border-color] duration-500 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:text-fg"
            >
              {w}
            </span>
          ))}
        </div>
      );
    case "reading":
      return (
        <div className="flex flex-col gap-2" aria-hidden>
          {[100, 92, 97, 60].map((w, i) => (
            <span key={i} className="relative h-1.5 overflow-hidden rounded-full bg-line" style={{ width: `${w}%` }}>
              <span
                style={{ transitionDelay: `${i * 120}ms` }}
                className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-x-100"
              />
            </span>
          ))}
        </div>
      );
    case "listening":
      return (
        <div className="flex h-10 items-center gap-[3px]" aria-hidden>
          {[3, 6, 9, 5, 8, 4, 10, 6, 3, 7, 9, 4, 6, 8, 3, 5].map((h, i) => (
            <span key={i} className="direction-wave w-[3px] rounded-full bg-accent/70" style={{ height: `${h * 4}px`, animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
      );
    case "speaking":
      return (
        <div className="flex items-center gap-3">
          <span aria-hidden className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-line">
            <span className="direction-pulse absolute inset-0 rounded-full border border-accent/60" />
            <span className="size-2.5 rounded-full bg-accent" />
          </span>
          <span className="lang text-[16px] italic text-muted">Describe a trip you remember well.</span>
        </div>
      );
    default:
      return (
        <p className="lang text-[17px] italic text-muted">
          Although it was raining, we went for a walk
          <span aria-hidden className="direction-caret ml-0.5 inline-block h-[1.1em] w-px translate-y-[0.2em] bg-accent" />
        </p>
      );
  }
}

const DIRECTIONS = [
  { kind: "grammar", name: "Грамматика", note: "Понимание структуры языка: от времён до условных предложений.", span: "lg:col-span-7 lg:row-span-2", big: true },
  { kind: "vocab", name: "Словарный запас", note: "Новые слова, выражения и интервальное повторение.", span: "lg:col-span-5" },
  { kind: "reading", name: "Чтение", note: "Тексты по уровню и вопросы на понимание.", span: "lg:col-span-5" },
  { kind: "listening", name: "Аудирование", note: "Понимание живой английской речи.", span: "lg:col-span-4" },
  { kind: "speaking", name: "Разговорная практика", note: "Уверенность в общении.", span: "lg:col-span-4" },
  { kind: "writing", name: "Письмо", note: "Умение грамотно выражать мысли.", span: "lg:col-span-4" },
];

/** Six directions as an editorial grid of uneven tiles: one lead story and five shorter ones. */
export function DirectionsSection() {
  const reduce = useReducedMotion();
  return (
    <section id="directions" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1320px] px-5 py-28 sm:px-8 lg:py-40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <RevealText
            text="Все направления английского в одном пространстве."
            className="max-w-[16ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-[56px] lg:text-[68px]"
          />
          <p className="max-w-[36ch] text-[16px] leading-relaxed text-muted">Каждый день плана затрагивает несколько навыков, поэтому ни один не отстаёт.</p>
        </div>

        <ol className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12 lg:gap-4">
          {DIRECTIONS.map((d, i) => (
            <motion.li
              key={d.name}
              tabIndex={0}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card p-6 outline-none transition-[border-color,box-shadow] duration-500 hover:border-line-strong hover:shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)] focus-visible:border-accent sm:p-8",
                d.big ? "min-h-[340px] sm:col-span-2 lg:min-h-[520px]" : "min-h-[230px] lg:min-h-[250px]",
                d.span,
              )}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={reduce ? undefined : { y: -4 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="tabular text-[13px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                <span aria-hidden className="mt-2 h-px w-10 bg-line transition-[width,background-color] duration-500 group-hover:w-20 group-hover:bg-accent" />
              </div>
              <div className={cn(d.big ? "my-auto py-10" : "mt-7")}>
                <Motif kind={d.kind} />
              </div>
              <div className="mt-auto pt-8">
                <h3 className={cn("font-semibold leading-none tracking-[-0.035em] text-fg", d.big ? "text-[40px] sm:text-[56px] lg:text-[72px]" : "text-[26px] sm:text-[30px]")}>
                  {d.name}
                </h3>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-muted">{d.note}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
