"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const LETTERS = ["L", "I", "N", "G", "U", "A"];

/** Per-letter "personality": every letter answers the pointer a little differently. */
const CHARACTER = [
  { k: 0.05, d: 0.2, push: 1.0, tilt: -1, lift: 1.0 },
  { k: 0.07, d: 0.24, push: 0.75, tilt: 1, lift: 0.6 },
  { k: 0.055, d: 0.19, push: 1.1, tilt: -1, lift: 1.2 },
  { k: 0.045, d: 0.17, push: 1.15, tilt: 1, lift: 0.9 },
  { k: 0.06, d: 0.21, push: 0.95, tilt: -1, lift: 1.1 },
  { k: 0.05, d: 0.18, push: 1.05, tilt: 1, lift: 0.8 },
];

type Channel = { x: number; v: number; t: number };
const ch = (x = 0): Channel => ({ x, v: 0, t: x });

/** Event other brand layers (the grid) listen to, so a virtual light can drive them on touch devices. */
export const VIRTUAL_POINTER = "lingua:virtual-pointer";
export type VirtualPointerDetail = { x: number; y: number; active: boolean };

/**
 * The LINGUA wordmark as interactive type.
 * - Each letter is driven by damped springs (position, tilt, scale, weight, warmth) with its own
 *   stiffness, damping and amplitude, so motion feels physical and slightly individual.
 * - Fine pointers: letters drift away from the cursor, tilt, gain weight and warm up; on leave they
 *   settle back. One rAF loop for all letters; it stops when everything is at rest.
 * - Touch devices (no hover): a slow light sweeps across the word once after it appears, and a tap
 *   sends the light to that point. Drag works too.
 * - Reduced motion: static.
 */
export function InteractiveWordmark({ className, interactive = true, delay = 0 }: { className?: string; interactive?: boolean; delay?: number }) {
  const refs = React.useRef<(HTMLSpanElement | null)[]>([]);

  React.useEffect(() => {
    if (!interactive) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const touch = window.matchMedia("(hover: none)").matches;
    const els = refs.current.filter(Boolean) as HTMLSpanElement[];
    const S = els.map(() => ({ x: ch(), y: ch(), r: ch(), s: ch(1), w: ch(700), g: ch() }));
    let centers: { cx: number; cy: number; w: number }[] = [];
    let px = -9999, py = -9999;
    let raf = 0;
    let sweep = 0;

    const measure = () => {
      centers = els.map((el) => {
        const b = el.parentElement!.getBoundingClientRect();
        return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width };
      });
    };
    measure();

    const setTargets = () => {
      const R = Math.max(170, (centers[0]?.w ?? 120) * 2.5);
      centers.forEach((c, i) => {
        const p = CHARACTER[i];
        const dx = c.cx - px, dy = c.cy - py;
        const d = Math.hypot(dx, dy) || 1;
        const t = Math.max(0, 1 - d / R);
        const f = t * t * (3 - 2 * t);
        const push = f * Math.min(22, c.w * 0.14) * p.push;
        const st = S[i];
        st.x.t = (dx / d) * push;
        st.y.t = (dy / d) * push - f * 6 * p.lift;
        st.r.t = -(dx / R) * 6 * f + f * 1.5 * p.tilt;
        st.s.t = 1 + 0.04 * f;
        st.w.t = 700 + 100 * f;
        st.g.t = f;
      });
      window.dispatchEvent(new CustomEvent<VirtualPointerDetail>(VIRTUAL_POINTER, { detail: { x: px, y: py, active: px > -9999 } }));
    };

    const step = (c: Channel, k: number, d: number) => {
      c.v += (c.t - c.x) * k;
      c.v *= 1 - d;
      c.x += c.v;
      return Math.abs(c.v) + Math.abs(c.t - c.x);
    };

    const tick = () => {
      let energy = 0;
      els.forEach((el, i) => {
        const st = S[i];
        const { k, d } = CHARACTER[i];
        energy += step(st.x, k, d) + step(st.y, k, d) + step(st.r, k, d) + step(st.s, k * 1.2, d) * 40 + step(st.g, k * 1.4, d) * 20;
        step(st.w, k * 1.3, d);
        el.style.transform = `translate3d(${st.x.x.toFixed(2)}px, ${st.y.x.toFixed(2)}px, 0) rotate(${st.r.x.toFixed(2)}deg) scale(${st.s.x.toFixed(4)})`;
        // Weight changes re-shape text, so step it in 25-unit levels.
        const w = Math.round(st.w.x / 25) * 25;
        if (el.dataset.w !== String(w)) {
          el.dataset.w = String(w);
          el.style.fontVariationSettings = `"wght" ${w}, "wdth" 100, "opsz" 96`;
        }
        const a = Math.max(0, Math.round(st.g.x * 20) / 20);
        if (el.dataset.a !== String(a)) {
          el.dataset.a = String(a);
          el.style.color = a > 0 ? `color-mix(in oklab, #e9e4da ${(100 - a * 36).toFixed(1)}%, #d9c7a4)` : "";
        }
      });
      raf = energy > 0.02 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const pointTo = (x: number, y: number) => {
      px = x;
      py = y;
      setTargets();
      kick();
    };
    const release = () => {
      px = py = -9999;
      setTargets();
      kick();
    };

    /** Touch: a slow light travels across the word along a gentle arc. */
    const runSweep = () => {
      cancelAnimationFrame(sweep);
      if (!centers.length) return;
      const first = centers[0], last = centers[centers.length - 1];
      const x0 = first.cx - first.w, x1 = last.cx + last.w;
      const y0 = first.cy + first.w * 0.2;
      const start = performance.now();
      const dur = 1900;
      const go = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        pointTo(x0 + (x1 - x0) * e, y0 - Math.sin(e * Math.PI) * first.w * 0.35);
        if (t < 1) sweep = requestAnimationFrame(go);
        else release();
      };
      sweep = requestAnimationFrame(go);
    };

    const onMove = (e: PointerEvent) => {
      if (touch && e.pointerType === "mouse") return;
      pointTo(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      cancelAnimationFrame(sweep);
      pointTo(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") window.setTimeout(release, 450);
    };
    const onScrollOrResize = () => {
      measure();
      if (px > -9999) setTargets();
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerleave", release);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    let sweepTimer = 0;
    document.fonts?.ready.then(() => {
      measure();
      if (touch) sweepTimer = window.setTimeout(runSweep, (delay + 1.1) * 1000);
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(sweep);
      window.clearTimeout(sweepTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [interactive, delay]);

  return (
    <span className={cn("inline-flex select-none leading-none tracking-[-0.025em]", className)} aria-label="LINGUA" role="img">
      {LETTERS.map((l, i) => (
        <span key={i} className="wordmark-enter" style={{ animationDelay: `${delay + i * 0.07}s` }} aria-hidden>
          <span ref={(el) => { refs.current[i] = el; }} className="wordmark-letter">
            {l}
          </span>
        </span>
      ))}
    </span>
  );
}
