"use client";

import { motion, useReducedMotion } from "motion/react";
import { Correction } from "./correction";

/**
 * A static example of a tutoring exchange (an illustration — not a live AI call).
 * Messages appear in order when the panel scrolls into view.
 */
export function TutorDemo() {
  const reduce = useReducedMotion();
  const step = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-60px" },
          transition: { delay: 0.15 + i * 0.45, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as const },
        };

  return (
    <div className="rounded-xl border border-line bg-card shadow-pop">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="text-[14px] font-medium text-fg">Examiner</div>
        <div className="text-[12.5px] text-subtle">Example conversation</div>
      </div>
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <motion.div {...step(0)} className="ml-auto max-w-[80%] rounded-lg bg-accent px-4 py-2.5 text-[14.5px] text-on-accent">
          Can you check this? <span className="lang italic">I have seen him yesterday.</span>
        </motion.div>

        <motion.div {...step(1)} className="max-w-[92%] space-y-3">
          <p className="lang text-[20px] leading-[2] text-fg">
            I <Correction wrong="have seen" right="saw" delay={reduce ? 0 : 1.2} play={!reduce} /> him yesterday.
          </p>
          <p className="text-[14.5px] leading-relaxed text-muted">
            <span className="text-fg">Yesterday</span> points to a finished time, so use the Past Simple. По-русски тут нет разницы,
            поэтому это одна из самых частых ошибок.
          </p>
        </motion.div>

        <motion.div {...step(2)} className="rounded-md bg-surface px-4 py-3">
          <div className="text-[12.5px] text-muted">Try one more</div>
          <p className="lang mt-1 text-[16px] text-fg">
            She <span className="inline-block min-w-16 border-b border-line-strong text-center text-subtle">?</span> the report an hour ago.
            <span className="ml-1 text-muted">(finish)</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
