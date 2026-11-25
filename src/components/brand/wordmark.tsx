"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const LETTERS = ["L", "I", "N", "G", "U", "A"];

interface LetterState {
  x: number; y: number; r: number; s: number; w: number; glow: number;
}

/**
 * The LINGUA wordmark as interactive type. Each letter drifts away from the pointer, tilts,
 * gains weight and a warm glow as the cursor approaches, then settles back with an easing
 * "spring". One rAF loop drives all six letters and stops when everything is at rest.
 * Touch: dragging a finger over the word works the same way. Reduced motion: static.
 */
export function InteractiveWordmark({ className, interactive = true, delay = 0 }: { className?: string; interactive?: boolean; delay?: number }) {
  const wrap = React.useRef<HTMLSpanElement>(null);
  const refs = React.useRef<(HTMLSpanElement | null)[]>([]);

  React.useEffect(() => {
    if (!interactive) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = refs.current.filter(Boolean) as HTMLSpanElement[];
    const cur: LetterState[] = els.map(() => ({ x: 0, y: 0, r: 0, s: 1, w: 700, glow: 0 }));
    const tgt: LetterState[] = els.map(() => ({ x: 0, y: 0, r: 0, s: 1, w: 700, glow: 0 }));
    let centers: { cx: number; cy: number; w: number }[] = [];
    let px = -9999, py = -9999;
    let raf = 0;

    const measure = () => {
      centers = els.map((el) => {
        // measure without our transform
        const b = el.parentElement!.getBoundingClientRect();
        return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width };
      });
    };
    measure();

    const computeTargets = () => {
      const R = Math.max(180, (centers[0]?.w ?? 120) * 2.6);
      centers.forEach((c, i) => {
        const dx = c.cx - px, dy = c.cy - py;
        const d = Math.hypot(dx, dy) || 1;
        const t = Math.max(0, 1 - d / R);
        const f = t * t * (3 - 2 * t); // smoothstep
        const push = f * Math.min(22, c.w * 0.14);
        tgt[i] = {
          x: (dx / d) * push,
          y: (dy / d) * push - f * 6,
          r: (dx / R) * 6 * f,
          s: 1 + 0.045 * f,
          w: 700 + 100 * f,
          glow: f,
        };
      });
    };

    const tick = () => {
      let busy = false;
      els.forEach((el, i) => {
        const c = cur[i], t = tgt[i];
        const k = 0.12;
        c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.r += (t.r - c.r) * k;
        c.s += (t.s - c.s) * k; c.w += (t.w - c.w) * k; c.glow += (t.glow - c.glow) * k;
        if (Math.abs(t.x - c.x) + Math.abs(t.y - c.y) + Math.abs(t.r - c.r) + Math.abs(t.glow - c.glow) * 10 > 0.02) busy = true;
        el.style.transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) rotate(${c.r.toFixed(2)}deg) scale(${c.s.toFixed(4)})`;
        // Weight changes re-shape text, so step it (4 levels) instead of every frame.
        const w = Math.round(c.w / 25) * 25;
        if (el.dataset.w !== String(w)) {
          el.dataset.w = String(w);
          el.style.fontVariationSettings = `"wght" ${w}, "wdth" 100, "opsz" 96`;
        }
        const a = Math.round(c.glow * 20) / 20;
        if (el.dataset.a !== String(a)) {
          el.dataset.a = String(a);
          el.style.color = a > 0 ? `color-mix(in oklab, #e9e4da ${(100 - a * 38).toFixed(1)}%, #d9c7a4)` : "";
        }
      });
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      computeTargets();
      kick();
    };
    const onLeave = () => {
      px = py = -9999;
      computeTargets();
      kick();
    };
    const onScrollOrResize = () => {
      measure();
      if (px > -9999) computeTargets();
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave();
    };
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    const fontsReady = document.fonts?.ready.then(measure);
    void fontsReady;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [interactive]);

  return (
    <span ref={wrap} className={cn("inline-flex select-none leading-none tracking-[-0.045em]", className)} aria-label="LINGUA" role="img">
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
