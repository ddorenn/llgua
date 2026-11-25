"use client";

import { motion, useReducedMotion } from "motion/react";
import { RevealText } from "@/components/brand/reveal";

const DIRECTIONS = [
  { name: "Грамматика", note: "Понимание структуры языка", sample: "If I had known, I would have come." },
  { name: "Словарный запас", note: "Новые слова, выражения и повторение", sample: "reliable, thorough, reluctant" },
  { name: "Чтение", note: "Работа с текстами и пониманием смысла", sample: "Ten years ago, working from home was a privilege…" },
  { name: "Аудирование", note: "Понимание английской речи", sample: "Would you like anything to eat?" },
  { name: "Разговорная практика", note: "Уверенность в общении", sample: "Describe a trip you remember well." },
  { name: "Письмо", note: "Умение грамотно выражать мысли", sample: "Although it was raining, we went for a walk." },
];

/** Editorial index of the six directions: big type rows; hover slides the row and reveals an English sample. */
export function DirectionsSection() {
  const reduce = useReducedMotion();
  return (
    <section id="directions" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1320px] px-5 py-28 sm:px-8 lg:py-40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <RevealText
            text="Все направления английского в одном пространстве."
            className="max-w-[16ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-[56px] lg:text-[68px]"
          />
          <p className="max-w-[36ch] text-[16px] leading-relaxed text-muted">Каждый день плана затрагивает несколько навыков, поэтому ни один не отстаёт.</p>
        </div>

        <ol className="mt-20 border-t border-line">
          {DIRECTIONS.map((d, i) => (
            <motion.li
              key={d.name}
              className="group relative border-b border-line"
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-accent-muted transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-y-100" />
              <div className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 py-7 transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:translate-x-3 sm:py-9 lg:grid-cols-[3.5rem_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-x-8">
                <span className="tabular text-[14px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[30px] font-semibold leading-none tracking-[-0.035em] text-fg sm:text-[44px] lg:text-[52px]">{d.name}</h3>
                <p className="col-start-2 text-[15px] text-muted lg:col-start-auto">{d.note}</p>
                <p className="lang col-start-2 text-[17px] italic text-accent-soft transition-opacity duration-500 lg:col-start-auto lg:text-right lg:opacity-0 lg:group-hover:opacity-100">
                  {d.sample}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
