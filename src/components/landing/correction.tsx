"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The brand gesture: a mistake struck through, the fix written above it.
 * Draws itself once (delay lets it play after the page settles). Static under reduced motion.
 */
export function Correction({
  wrong,
  right,
  delay = 0.5,
  className,
  play = true,
}: {
  wrong: string;
  right: string;
  delay?: number;
  className?: string;
  play?: boolean;
}) {
  const reduce = useReducedMotion();
  const animate = play && !reduce;
  return (
    <span className={cn("relative inline-block whitespace-nowrap", className)}>
      {/* the fix, set above in accent italic */}
      <motion.span
        aria-hidden
        className="lang absolute bottom-[78%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.82em] italic text-accent-soft"
        initial={animate ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.45, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {right}
      </motion.span>
      <span className="text-muted">{wrong}</span>
      {/* the strike */}
      <motion.span
        aria-hidden
        className="absolute left-[-3%] top-[56%] h-[0.09em] w-[106%] origin-left rounded-full bg-accent"
        initial={animate ? { scaleX: 0 } : false}
        animate={{ scaleX: 1 }}
        transition={{ delay, duration: 0.42, ease: [0.6, 0, 0.3, 1] }}
      />
      <span className="sr-only">
        {" "}
        (corrected to “{right}”)
      </span>
    </span>
  );
}
