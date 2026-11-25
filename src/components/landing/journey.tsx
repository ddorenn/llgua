"use client";

import { motion, useReducedMotion } from "motion/react";

const LEVELS = [
  { id: "A1", name: "Beginner", can: "Introduce yourself and handle everyday phrases." },
  { id: "A2", name: "Elementary", can: "Talk about routines, plans and past events." },
  { id: "B1", name: "Intermediate", can: "Describe experiences and give simple opinions." },
  { id: "B2", name: "Upper-intermediate", can: "Argue a point and follow most conversations." },
  { id: "C1", name: "Advanced", can: "Use English flexibly at work and in study." },
  { id: "C2", name: "Proficient", can: "Express yourself precisely, with nuance." },
];

/** CEFR as a staircase: each step rises when the section comes into view. */
export function Journey() {
  const reduce = useReducedMotion();
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 lg:items-end lg:gap-x-3">
      {LEVELS.map((l, i) => (
        <li key={l.id} className="flex flex-col">
          <motion.div
            className="hidden origin-bottom border-t-2 border-accent bg-accent-muted lg:block"
            style={{ height: 24 + i * 30 }}
            initial={reduce ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            aria-hidden
          />
          <div className="border-t-2 border-accent pt-3 lg:border-t-0">
            <div className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-fg">{l.id}</div>
            <div className="mt-1.5 text-[14px] font-medium text-fg">{l.name}</div>
            <p className="mt-1.5 text-[13.5px] leading-snug text-muted">{l.can}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
