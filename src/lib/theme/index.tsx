"use client";

/**
 * Theme system: "light" | "dark" | "system".
 * - The preference is stored per device (localStorage) — appearance is a device choice.
 * - THEME_SCRIPT runs before first paint so there is no flash of the wrong theme.
 * - Changes cross-fade (View Transitions where supported, colour transition otherwise),
 *   and are instant when the user prefers reduced motion.
 */
import * as React from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "lingua:theme";

export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

function applyAnimated(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === resolved) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (reduce) return apply(resolved);
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => apply(resolved));
    return;
  }
  root.classList.add("theme-fade");
  apply(resolved);
  window.setTimeout(() => root.classList.remove("theme-fade"), 320);
}

interface ThemeValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = React.useState<ThemePreference>("system");
  const [resolved, setResolved] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const p = readPreference();
    setPref(p);
    setResolved((document.documentElement.getAttribute("data-theme") as ResolvedTheme) ?? (p === "system" ? systemTheme() : p));
  }, []);

  React.useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = systemTheme();
      setResolved(r);
      applyAnimated(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = React.useCallback((p: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      /* private mode — still apply for this session */
    }
    const r = p === "system" ? systemTheme() : p;
    setPref(p);
    setResolved(r);
    applyAnimated(r);
  }, []);

  const toggle = React.useCallback(() => {
    const current = (document.documentElement.getAttribute("data-theme") as ResolvedTheme) ?? "light";
    setPreference(current === "dark" ? "light" : "dark");
  }, [setPreference]);

  const value = React.useMemo(() => ({ preference, resolved, setPreference, toggle }), [preference, resolved, setPreference, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
