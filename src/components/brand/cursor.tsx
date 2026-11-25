"use client";

import * as React from "react";

/**
 * Brand cursor: a thin cream ring that trails the pointer, with a dot at its centre.
 * - Grows over links/buttons ([data-cursor="hover"] too), squeezes on press.
 * - Hidden over text fields (the native caret is kept there).
 * - Only on fine pointers with motion allowed; touch and reduced-motion users get the native cursor.
 * Rendering is done with refs + one requestAnimationFrame loop (no React re-renders).
 */
export function CustomCursor() {
  const ring = React.useRef<HTMLDivElement>(null);
  const dot = React.useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fine.matches && !reduce.matches);
    update();
    fine.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("has-brand-cursor");

    let x = -100, y = -100, rx = -100, ry = -100;
    let scale = 1, targetScale = 1, visible = 0, targetVisible = 0;
    let raf = 0;
    let pressed = false;
    let mode: "default" | "hover" | "text" = "default";

    const tick = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      const base = mode === "hover" ? 1.65 : mode === "text" ? 0.4 : 1;
      targetScale = base * (pressed ? 0.8 : 1);
      scale += (targetScale - scale) * 0.2;
      visible += (targetVisible - visible) * 0.2;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
        ring.current.style.opacity = String(visible * (mode === "text" ? 0 : 1));
        ring.current.dataset.mode = mode;
      }
      if (dot.current) {
        dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${pressed ? 0.6 : 1})`;
        dot.current.style.opacity = String(visible * (mode === "text" ? 0 : 1));
      }
      const moving = Math.abs(x - rx) + Math.abs(y - ry) + Math.abs(targetScale - scale) + Math.abs(targetVisible - visible) > 0.05;
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      targetVisible = 1;
      const el = e.target as Element | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) mode = "text";
      else if (el?.closest("a, button, [role=button], [role=tab], [role=radio], [role=checkbox], [role=switch], label, [data-cursor=hover]")) mode = "hover";
      else mode = "default";
      kick();
    };
    const onDown = () => { pressed = true; kick(); };
    const onUp = () => { pressed = false; kick(); };
    const onLeave = () => { targetVisible = 0; kick(); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      root.classList.remove("has-brand-cursor");
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] size-8 rounded-full border border-[#e9e4da] opacity-0 mix-blend-difference transition-[background-color,border-width] duration-200 data-[mode=hover]:border-[0.5px] data-[mode=hover]:bg-[#e9e4da]/15"
      />
      <div ref={dot} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[100] size-1 rounded-full bg-[#e9e4da] opacity-0 mix-blend-difference" />
    </>
  );
}
