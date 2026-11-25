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
  "group/brand relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-[#e9e4da] px-8 text-[16px] font-medium text-[#111110] shadow-[0_0_0_0_rgb(200_185_159/0)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-14px_rgb(200_185_159/0.55)] active:translate-y-0 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8b99f]";

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

/**
 * Quiet closing CTA: a thin cream ring instead of a filled pill. On hover the fill rises from the
 * bottom, the label rolls to a second copy and the ring casts a soft warm light.
 */
export const BrandRingClasses =
  "group/ring relative inline-flex h-[72px] items-center gap-4 overflow-hidden rounded-full border border-[#e9e4da]/35 pl-9 pr-3 text-[18px] text-[#e9e4da] transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-0.5 hover:border-[#e9e4da] hover:shadow-[0_24px_70px_-20px_rgb(200_185_159/0.45)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8b99f]";

export function BrandRingInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0 translate-y-full rounded-full bg-[#e9e4da] transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover/ring:translate-y-0" />
      <span className="relative block h-[1.3em] overflow-hidden leading-[1.3em]">
        <span className="block transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover/ring:-translate-y-full">{children}</span>
        <span aria-hidden className="absolute inset-x-0 top-full block text-[#111110] transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover/ring:-translate-y-full">
          {children}
        </span>
      </span>
      <span aria-hidden className="relative inline-flex size-12 items-center justify-center rounded-full bg-[#e9e4da] text-[#111110] transition-[transform,background-color,color] duration-500 group-hover/ring:rotate-[-45deg] group-hover/ring:bg-[#111110] group-hover/ring:text-[#e9e4da]">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  );
}
