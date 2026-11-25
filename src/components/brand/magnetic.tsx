"use client";

import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Pulls gently toward the pointer while hovered; springs back on leave.
 * Wrap any button/link. No effect on touch or with reduced motion.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span className={cn("inline-block", className)} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.span>
  );
}

/** Brand CTA: cream pill; on hover a beige fill sweeps from the left and the arrow nudges forward. */
export const BrandButtonClasses =
  "group/brand relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-[#e9e4da] px-8 text-[16px] font-medium text-[#111110] transition-transform duration-200 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8b99f]";

export function BrandButtonInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0 origin-left scale-x-0 rounded-full bg-[#c8b99f] transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover/brand:scale-x-100" />
      <span className="relative">{children}</span>
      <span aria-hidden className="relative inline-flex size-7 items-center justify-center rounded-full bg-[#111110] text-[#e9e4da] transition-transform duration-300 group-hover/brand:translate-x-1">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  );
}
