"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Reveal, RevealText } from "@/components/brand/reveal";

const STAGES = [
  { name: "Обучение", text: "Уроки по программе от A1 до C2: правило, примеры, упражнения." },
  { name: "Практика", text: "План на 60 минут в день: словарь, грамматика, чтение или аудирование, речь или письмо." },
  { name: "Проверка", text: "Тесты и домашние задания показывают, что уже получается." },
  { name: "Анализ", text: "Результаты по навыкам и частые ошибки — основа следующего шага." },
];

function Stage({ i, progress, name, text }: { i: number; progress: MotionValue<number>; name: string; text: string }) {
  const at = i / (STAGES.length - 1);
  const lit = useTransform(progress, [Math.max(0, at - 0.12), at], [0, 1]);
  const color = useTransform(lit, [0, 1], ["var(--c-line-strong)", "var(--c-accent)"]);
  const scale = useTransform(lit, [0, 1], [0.6, 1]);
  return (
    <li className="relative pl-10 lg:pl-0 lg:pt-12">
      <motion.span
        aria-hidden
        style={{ borderColor: color, scale }}
        className="absolute left-0 top-1 size-[18px] rounded-full border-2 bg-bg lg:left-0 lg:top-0"
      />
      <h3 className="text-[22px] font-semibold tracking-[-0.025em] text-fg">{name}</h3>
      <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-muted">{text}</p>
    </li>
  );
}

export function SystemSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useTransform(scrollYProgress, (v) => (reduce ? 1 : Math.min(1, Math.max(0, v))));

  return (
    <section id="about" className="scroll-mt-20 bg-bg">
      <div className="mx-auto max-w-[1320px] px-5 py-28 sm:px-8 lg:py-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-20">
          <RevealText
            text="Английский — это система. Мы помогаем её освоить."
            className="text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-[60px] lg:text-[76px]"
          />
          <Reveal delay={0.2}>
            <p className="max-w-[44ch] text-[17px] leading-relaxed text-muted">
              LINGUA — единая образовательная среда. Обучение, практика, проверка знаний и анализ прогресса связаны между собой, поэтому
              каждое занятие продолжает предыдущее, а не начинается с нуля.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="relative mt-24 lg:mt-32">
          {/* the line that joins the stages */}
          <div aria-hidden className="absolute bottom-2 left-[8px] top-2 w-px bg-line lg:bottom-auto lg:left-0 lg:right-0 lg:top-[8px] lg:h-px lg:w-auto">
            <motion.div style={{ scaleY: progress }} className="absolute inset-0 origin-top bg-accent lg:hidden" />
            <motion.div style={{ scaleX: progress }} className="absolute inset-0 hidden origin-left bg-accent lg:block" />
          </div>
          <ol className="relative grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-10">
            {STAGES.map((s, i) => (
              <Stage key={s.name} i={i} progress={progress} name={s.name} text={s.text} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
