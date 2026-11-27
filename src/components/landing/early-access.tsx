"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { RevealText } from "@/components/brand/reveal";
import { cn } from "@/lib/utils";

const UTM_KEY = "lingua:utm";
const LEVELS = [
  ["", "Не знаю"],
  ["zero", "С нуля"],
  ["beginner", "Начальный"],
  ["intermediate", "Средний"],
  ["advanced", "Продвинутый"],
] as const;

/** Remember where the visitor came from (first touch in this tab): UTM tags + referrer without query. */
function useAttribution() {
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(UTM_KEY)) return;
      const p = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
        const v = p.get(k);
        if (v) utm[k] = v.slice(0, 120);
      }
      const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer.replace(/[?#].*$/, "") : "";
      sessionStorage.setItem(UTM_KEY, JSON.stringify({ utm, referrer: ref }));
    } catch {
      /* ignore */
    }
  }, []);
}

export function EarlyAccess() {
  useAttribution();
  const reduce = useReducedMotion();
  const shownAt = React.useRef(Date.now());
  const [contact, setContact] = React.useState("");
  const [name, setName] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [website, setWebsite] = React.useState("");
  const [state, setState] = React.useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) return setError("Нужно согласие на обработку контакта.");
    setState("busy");
    let attr = { utm: {}, referrer: "" };
    try {
      attr = JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "{}");
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, name, level, consent, website, utm: attr.utm ?? {}, referrer: attr.referrer ?? "", elapsed: Date.now() - shownAt.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return setState("done");
      setState("idle");
      setError(
        data.error === "contact"
          ? "Укажите e-mail или ник в Telegram (например, @username)."
          : data.error === "rate_limited"
            ? "Слишком много заявок с этого адреса. Попробуйте позже."
            : "Не получилось отправить. Попробуйте ещё раз.",
      );
    } catch {
      setState("idle");
      setError("Нет соединения. Попробуйте ещё раз.");
    }
  };

  return (
    <section id="early-access" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:py-32">
        <div>
          <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Ранний доступ</p>
          <RevealText text="LINGUA сейчас в закрытом пилоте." className="mt-4 max-w-[14ch] text-[38px] font-semibold leading-[1.04] tracking-[-0.045em] text-fg sm:text-[52px]" />
          <p className="mt-6 max-w-[44ch] text-[16px] leading-relaxed text-muted">
            Оставьте контакт — напишем, когда откроем доступ для первых учеников. Только одно сообщение об открытии, без рассылок.
          </p>
        </div>

        {state === "done" ? (
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-center rounded-2xl border border-line bg-card p-8">
            <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
              <Check className="size-5" />
            </span>
            <p className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-fg">Заявка принята</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Мы напишем на указанный контакт, когда доступ откроется.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="self-center rounded-2xl border border-line bg-card p-6 sm:p-8" noValidate>
            <label className="block text-[13.5px] font-medium text-fg" htmlFor="ea-contact">
              E-mail или Telegram
            </label>
            <input
              id="ea-contact"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com или @username"
              className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-[16px] text-fg outline-none placeholder:text-subtle focus:border-accent"
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[13.5px] font-medium text-fg" htmlFor="ea-name">
                  Имя <span className="font-normal text-subtle">— необязательно</span>
                </label>
                <input id="ea-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-[16px] text-fg outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[13.5px] font-medium text-fg" htmlFor="ea-level">
                  Уровень <span className="font-normal text-subtle">— примерно</span>
                </label>
                <select id="ea-level" value={level} onChange={(e) => setLevel(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-3 text-[16px] text-fg outline-none focus:border-accent">
                  {LEVELS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* honeypot */}
            <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="ea-website">Сайт</label>
              <input id="ea-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--c-accent)]" />
              <span>
                Согласен(на) на обработку контакта, чтобы получить сообщение об открытии доступа.{" "}
                <Link href="/privacy" className="text-fg underline underline-offset-4">
                  Политика конфиденциальности
                </Link>
              </span>
            </label>
            {error && (
              <p className="mt-3 text-[13.5px] text-danger" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={state === "busy" || !contact.trim()}
              className={cn("mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-[15px] font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto")}
            >
              {state === "busy" ? "Отправляем…" : "Оставить заявку"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
