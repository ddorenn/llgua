"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Quick toggle between light and dark (used in headers). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const reduce = useReducedMotion();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={dark ? "Светлая тема" : "Тёмная тема"}
      className={cn(
        "relative inline-flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-md text-muted transition-colors hover:bg-elevated hover:text-fg",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={reduce ? false : { y: 10, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={reduce ? undefined : { y: -10, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="inline-flex"
        >
          {dark ? <Moon className="size-[17px]" /> : <Sun className="size-[17px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
];

/** Full three-way picker (Settings → Appearance). */
export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Тема" className="grid grid-cols-3 gap-2 sm:max-w-md">
      {OPTIONS.map((o) => {
        const active = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(o.value)}
            className={cn(
              "group flex cursor-pointer flex-col gap-2 rounded-lg border p-2 text-left transition-colors",
              active ? "border-accent bg-accent-muted" : "border-line bg-surface hover:border-line-strong",
            )}
          >
            <ThemeSwatch kind={o.value} />
            <span className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-fg">
              <o.icon className="size-3.5 text-muted" /> {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ThemeSwatch({ kind }: { kind: ThemePreference }) {
  const light = { bg: "#f1eff3", card: "#fbfafc", line: "#e2dee7", ink: "#23212a", acc: "#5e45b8" };
  const dark = { bg: "#18171c", card: "#26232c", line: "#302d37", ink: "#ece9f1", acc: "#7655d6" };
  const half = (c: typeof light) => (
    <div className="flex h-full flex-col gap-1.5 p-2" style={{ background: c.bg }}>
      <div className="h-1.5 w-8 rounded-full" style={{ background: c.ink, opacity: 0.8 }} />
      <div className="flex-1 rounded-[4px] border p-1.5" style={{ background: c.card, borderColor: c.line }}>
        <div className="h-1 w-6 rounded-full" style={{ background: c.acc }} />
      </div>
    </div>
  );
  return (
    <div className="h-16 overflow-hidden rounded-md border border-line" aria-hidden>
      {kind === "system" ? (
        <div className="grid h-full grid-cols-2">
          {half(light)}
          {half(dark)}
        </div>
      ) : (
        half(kind === "dark" ? dark : light)
      )}
    </div>
  );
}
