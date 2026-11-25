"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Headline that rises word by word from behind a mask when it scrolls into view. */
export function RevealText({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  stagger = 0.045,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const MotionTag = motion[Tag];
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
  const word: Variants = {
    hidden: { y: "110%" },
    show: { y: "0%", transition: { duration: 0.8, ease: EASE } },
  };
  if (reduce) return <Tag className={className}>{text}</Tag>;
  return (
    <MotionTag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-12% 0px" }} variants={container} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-top -mb-[0.12em]" aria-hidden>
          <motion.span className="inline-block" variants={word}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/** Block that fades and rises into place once, when it enters the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "section" | "p";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[Tag];
  if (reduce) return <Tag className={className}>{children}</Tag>;
  return (
    <MotionTag
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}
