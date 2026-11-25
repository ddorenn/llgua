"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CurtainLink } from "@/components/brand/curtain";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#about", label: "О платформе" },
  { href: "#directions", label: "Направления" },
  { href: "#why", label: "Преимущества" },
];

/**
 * Transparent over the dark hero (forced dark palette), solid in the user's theme afterwards.
 */
export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [pastHero, setPastHero] = React.useState(false);
  const [overDark, setOverDark] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setPastHero(window.scrollY > window.innerHeight - 72);
      // Is the band under the header one of the dark brand surfaces?
      const fields = document.querySelectorAll<HTMLElement>(".brand-field");
      let dark = false;
      fields.forEach((f) => {
        const r = f.getBoundingClientRect();
        if (r.top <= 36 && r.bottom >= 36) dark = true;
      });
      setOverDark(dark);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const dark = overDark || open;

  return (
    <header
      data-theme={dark ? "dark" : undefined}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300",
        pastHero && !overDark && !open ? "border-b border-line bg-bg" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-6 px-5 sm:px-8">
        <a href="#top" className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[-0.04em] text-fg" aria-label="LINGUA — наверх">
          LINGUA
        </a>
        <nav aria-label="Разделы" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="group relative rounded-md px-3 py-2 text-[14px] text-muted transition-colors hover:text-fg">
              {n.label}
              <span className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex-1" />
        <ThemeToggle />
        {signedIn ? (
          <CurtainLink href="/dashboard" className="hidden h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-on-primary transition-colors hover:bg-primary-hover sm:inline-flex">
            Открыть платформу
          </CurtainLink>
        ) : (
          <>
            <CurtainLink href="/login" className="hidden px-2 text-[14px] text-muted transition-colors hover:text-fg sm:inline">
              Войти
            </CurtainLink>
            <CurtainLink
              href="/login?tab=signup"
              className="hidden h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-on-primary transition-colors hover:bg-primary-hover sm:inline-flex"
            >
              Начать обучение
            </CurtainLink>
          </>
        )}
        <button
          type="button"
          className="relative inline-flex size-10 items-center justify-center rounded-full text-fg md:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={cn("absolute h-px w-5 bg-current transition-transform duration-300", open ? "rotate-45" : "-translate-y-[4px]")} />
          <span className={cn("absolute h-px w-5 bg-current transition-transform duration-300", open ? "-rotate-45" : "translate-y-[4px]")} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Меню"
            className="fixed inset-x-0 bottom-0 top-[72px] flex flex-col bg-bg px-6 pb-10 pt-6 md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
          >
            {NAV.map((n, i) => (
              <motion.a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-5 text-[30px] font-semibold tracking-[-0.03em] text-fg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.45 }}
              >
                {n.label}
              </motion.a>
            ))}
            <div className="mt-auto flex flex-col gap-3">
              <CurtainLink href={signedIn ? "/dashboard" : "/login?tab=signup"} onClick={() => setOpen(false)} className="flex h-14 items-center justify-center rounded-full bg-primary text-[16px] font-medium text-on-primary">
                {signedIn ? "Открыть платформу" : "Начать обучение"}
              </CurtainLink>
              {!signedIn && (
                <CurtainLink href="/login" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center text-[15px] text-muted">
                  Уже есть аккаунт? Войти
                </CurtainLink>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
