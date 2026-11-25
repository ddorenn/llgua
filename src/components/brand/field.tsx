"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dark brand surface: coordinate grid + perspective floor + a warm light that follows the pointer,
 * lighting grid lines and the cell under the cursor. Moving layers are small and positioned with
 * transforms in one rAF loop (no React re-renders, no full-screen repaints). Static under reduced motion.
 */
export function BrandField({
  children,
  className,
  floor = true,
  as: Tag = "section",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { floor?: boolean; as?: "section" | "div" | "footer" }) {
  const ref = React.useRef<HTMLElement>(null);
  const glow = React.useRef<HTMLDivElement>(null);
  const lit = React.useRef<HTMLDivElement>(null);
  const cell = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0, ty = 0, x = 0, y = 0, g = 0, tg = 0;
    let raf = 0;
    let rect = el.getBoundingClientRect();
    const measure = () => {
      rect = el.getBoundingClientRect();
      // size the bright grid to the field (plus one cell) instead of a fixed huge layer
      const inner = lit.current?.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.width = `${Math.ceil(rect.width) + 64}px`;
        inner.style.height = `${Math.ceil(rect.height) + 64}px`;
      }
    };
    measure();
    const mod = (n: number, m: number) => ((n % m) + m) % m;

    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      g += (tg - g) * 0.08;
      const op = g.toFixed(3);
      if (glow.current) {
        glow.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        glow.current.style.opacity = op;
      }
      // grid origin is the centre of the field; keep the bright layer aligned to it
      const ox = rect.width / 2, oy = rect.height / 2;
      if (lit.current) {
        // outer window moves; the inner grid moves back by the same amount so lines stay put (no repaint)
        lit.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const inner = lit.current.firstElementChild as HTMLElement | null;
        if (inner) inner.style.transform = `translate3d(${(-x + 224 + mod(ox, 32) - 32).toFixed(1)}px, ${(-y + 224 + mod(oy, 32) - 32).toFixed(1)}px, 0)`;
        lit.current.style.opacity = op;
      }
      if (cell.current) {
        const cx = Math.floor((x - ox) / 32) * 32 + ox;
        const cy = Math.floor((y - oy) / 32) * 32 + oy;
        cell.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        cell.current.style.opacity = String(Math.min(1, g * 1.2).toFixed(3));
      }
      const busy = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 || Math.abs(tg - g) > 0.01;
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      tx = e.clientX - rect.left;
      ty = e.clientY - rect.top;
      tg = inside ? 1 : 0;
      if (g < 0.02 && inside) {
        x = tx;
        y = ty;
      }
      kick();
    };
    const onLeave = () => {
      tg = 0;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("scroll", measure);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <Tag ref={ref as React.Ref<HTMLElement & HTMLDivElement>} data-theme="dark" className={cn("brand-field text-fg", className)} {...rest}>
      <div className="brand-field__grid" aria-hidden />
      {floor && <div className="brand-field__floor" aria-hidden />}
      <div ref={glow} className="brand-field__glow" aria-hidden />
      <div ref={lit} className="brand-field__lit" aria-hidden>
        <div className="brand-field__lit-grid" />
      </div>
      <div ref={cell} className="brand-field__cell" aria-hidden />
      {children}
    </Tag>
  );
}
