"use client";

import { motion, useReducedMotion } from "motion/react";
import { Volume2 } from "lucide-react";
import { Correction } from "./correction";

const PLAN = [
  { label: "Vocabulary", min: 10, done: true },
  { label: "Grammar", min: 15, done: true },
  { label: "Reading", min: 15, done: false, current: true },
  { label: "Speaking", min: 15, done: false },
  { label: "Review", min: 5, done: false },
];

/** Hero illustration assembled from real interface pieces: a lesson sheet, a word card, today's plan. */
export function HeroSheet() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] as const },
        };

  return (
    <div className="relative mx-auto w-full max-w-[560px] pb-24 pt-2 sm:pb-20 lg:mx-0" role="img" aria-label="Example of a Lingua lesson: a sentence with a corrected verb, a vocabulary card and today's study plan.">
      {/* Lesson sheet */}
      <motion.div {...enter(0.1)} className="relative rounded-xl border border-line bg-card p-6 shadow-pop sm:p-8">
        <div className="flex items-center justify-between text-[12.5px] text-muted">
          <span>Grammar, B1</span>
          <span>Lesson 7 of 12</span>
        </div>
        <h3 className="mt-2 text-[19px] font-semibold tracking-[-0.02em] text-fg">Present Perfect or Past Simple</h3>

        <div className="mt-12 pb-20 sm:pb-24">
          <p className="lang text-[22px] leading-[1.9] text-fg sm:text-[27px]">
            I <Correction wrong="have seen" right="saw" delay={0.9} /> him yesterday.
          </p>
          <motion.aside
            {...(reduce ? {} : { initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 }, transition: { delay: 1.75, duration: 0.5 } })}
            className="mt-3 max-w-[300px] border-l-2 border-accent pl-3 text-[13.5px] leading-snug text-muted"
          >
            <span className="font-medium text-fg">Yesterday</span> is finished time, so the verb takes the Past Simple.
          </motion.aside>
        </div>
      </motion.div>

      {/* Word card */}
      <motion.div
        {...enter(0.35)}
        className="absolute bottom-2 left-3 w-[200px] sm:bottom-0 sm:-left-10 sm:w-[250px] rounded-lg border border-line bg-card p-4 shadow-pop"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="lang text-[22px] font-semibold leading-tight text-fg">reliable</div>
            <div className="lang mt-0.5 text-[13.5px] text-muted">/rɪˈlaɪəbl/</div>
          </div>
          <Volume2 className="mt-1 size-4 text-subtle" aria-hidden />
        </div>
        <div className="mt-3 text-[14px] text-fg">надёжный</div>
        <div className="mt-3 flex items-center gap-1" aria-hidden>
          {[1, 1, 1, 0, 0].map((f, i) => (
            <span key={i} className={f ? "h-1 flex-1 rounded-full bg-accent" : "h-1 flex-1 rounded-full bg-elevated"} />
          ))}
        </div>
        <div className="mt-1.5 text-[12px] text-subtle">Reviewing, 3 of 5</div>
      </motion.div>

      {/* Today's plan */}
      <motion.div
        {...enter(0.5)}
        className="absolute -bottom-4 right-3 w-[190px] rounded-lg border border-line bg-card p-4 shadow-pop sm:-bottom-6 sm:-right-6 sm:w-[250px]"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-fg">Today</span>
          <span className="tabular text-[12.5px] text-muted">25 of 60 min</span>
        </div>
        <div className="mt-3 flex h-1.5 gap-[3px]" aria-hidden>
          {PLAN.map((p) => (
            <span
              key={p.label}
              style={{ flexGrow: p.min }}
              className={p.done ? "rounded-full bg-accent" : p.current ? "rounded-full bg-accent/35" : "rounded-full bg-elevated"}
            />
          ))}
        </div>
        <div className="mt-3 text-[12.5px] text-muted">
          Next: <span className="text-fg">Reading, 15 min</span>
        </div>
      </motion.div>
    </div>
  );
}
