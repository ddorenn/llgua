"use client";

import { motion, useReducedMotion } from "motion/react";
import { RevealText } from "@/components/brand/reveal";

/** Line icons drawn with strokes so they can draw themselves on reveal. */
const ICONS: Record<string, string[]> = {
  system: ["M4 20h4v-4h4v-4h4V8h4V4", "M4 20V4"],
  personal: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"],
  skills: ["M12 3v18", "M3 12h18", "M5.6 5.6l12.8 12.8", "M18.4 5.6 5.6 18.4"],
  daily: ["M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z", "M12 8v4.5l3 2"],
  analytics: ["M4 20h16", "M7 16v-4", "M12 16V8", "M17 16v-7"],
  tutor: ["M4 5h16v10H9l-5 4V5Z", "M8 9.5h8", "M8 12h5"],
};

const ITEMS = [
  { icon: "system", title: "Системное обучение", text: "Программа по уровням вместо случайных уроков." },
  { icon: "personal", title: "Персональный подход", text: "Уровень, цели и темп — под тебя." },
  { icon: "skills", title: "Все языковые навыки", text: "Шесть направлений в одной программе." },
  { icon: "daily", title: "Ежедневная практика", text: "Час в день, пять блоков, готовый план." },
  { icon: "analytics", title: "Аналитика прогресса", text: "Навыки, ошибки и рост — на виду." },
  { icon: "tutor", title: "AI-репетитор", text: "Объясняет, исправляет, разговаривает." },
];

function DrawIcon({ name, delay }: { name: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 24 24" className="size-9 text-accent" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.1, delay: delay + i * 0.15, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </svg>
  );
}

export function WhySection() {
  const reduce = useReducedMotion();
  return (
    <section id="why" className="scroll-mt-20 bg-bg">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-16 px-5 py-28 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:gap-24 lg:py-40">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <RevealText text="Почему LINGUA?" className="text-[44px] font-semibold leading-[1] tracking-[-0.045em] text-fg sm:text-[64px] lg:text-[72px]" />
          <p className="mt-6 max-w-[34ch] text-[16px] leading-relaxed text-muted">
            Коротко — о том, что делает занятия результатом.
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2">
          {ITEMS.map((it, i) => (
            <motion.li
              key={it.title}
              className="group relative border-t border-line py-10 sm:pr-10 sm:[&:nth-child(even)]:pl-10 sm:[&:nth-child(even)]:pr-0"
              initial={reduce ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.8, delay: (i % 2) * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <span aria-hidden className="absolute left-0 top-[-1px] h-px w-0 bg-accent transition-[width] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:w-full sm:group-[&:nth-child(even)]:left-10" />
              <DrawIcon name={it.icon} delay={(i % 2) * 0.12 + 0.2} />
              <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.025em] text-fg">{it.title}</h3>
              <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-muted">{it.text}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
