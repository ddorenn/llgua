"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";

/**
 * Page curtain between the public site and the platform: a charcoal panel rises,
 * the route changes underneath, then the panel lifts away. Plain navigation with reduced motion.
 */
interface CurtainCtx {
  go: (href: string) => void;
}
const Ctx = React.createContext<CurtainCtx | null>(null);

export function CurtainProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = React.useState<"idle" | "covering" | "covered">("idle");
  const target = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (phase === "covered" && target.current && pathname === target.current.split("?")[0]) {
      const t = setTimeout(() => setPhase("idle"), 120);
      return () => clearTimeout(t);
    }
  }, [pathname, phase]);

  const go = React.useCallback(
    (href: string) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      target.current = href;
      router.prefetch(href);
      setPhase("covering");
    },
    [router],
  );

  return (
    <Ctx.Provider value={{ go }}>
      {children}
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            key="curtain"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-[#111110]"
            initial={{ clipPath: "inset(100% 0 0 0)" }}
            animate={{ clipPath: "inset(0% 0 0 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
            onAnimationComplete={() => {
              if (phase === "covering" && target.current) {
                setPhase("covered");
                router.push(target.current);
              }
            }}
          >
            <span className="font-[family-name:var(--font-display)] text-[44px] font-bold tracking-[-0.04em] text-[#e9e4da]/90">LINGUA</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

/** Link that navigates through the curtain (falls back to a normal link without the provider). */
export function CurtainLink({ href, children, className, onClick, ...rest }: React.ComponentProps<typeof Link> & { href: string }) {
  const ctx = React.useContext(Ctx);
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (!ctx || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        ctx.go(href);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
