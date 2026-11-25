"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BrandField } from "@/components/brand/field";
import { InteractiveWordmark } from "@/components/brand/wordmark";
import { CurtainLink } from "@/components/brand/curtain";
import { BrandButtonClasses, BrandButtonInner, Magnetic } from "@/components/brand/magnetic";

/** Full-screen brand opening: always dark, the interactive LINGUA at its centre. */
export function Hero({ signedIn }: { signedIn: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.94]);

  return (
    <BrandField id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <div ref={ref} className="absolute inset-0" aria-hidden />
      <motion.div style={{ y, opacity, scale }} className="relative flex flex-1 flex-col items-center justify-center px-5 pb-24 pt-28 text-center">
        <h1 className="sr-only">LINGUA — Your English Tutor</h1>
        <InteractiveWordmark className="text-[clamp(5.2rem,24vw,19rem)] text-[#e9e4da]" delay={0.15} />
        <motion.p
          className="mt-4 text-[12px] font-medium tracking-[0.55em] text-[#c8b99f] sm:mt-6 sm:text-[14px]"
          initial={reduce ? false : { opacity: 0, letterSpacing: "0.9em" }}
          animate={{ opacity: 1, letterSpacing: "0.55em" }}
          transition={{ delay: 0.75, duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
        >
          YOUR ENGLISH TUTOR
        </motion.p>
        <motion.p
          className="mt-10 max-w-[46ch] text-[16px] leading-relaxed text-[#a39d92] sm:text-[17px]"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Персональная платформа для системного изучения английского языка. Учись в собственном темпе, развивай все языковые навыки и
          отслеживай свой прогресс.
        </motion.p>
        <motion.div
          className="mt-10 flex w-full flex-col items-center gap-5 sm:w-auto sm:flex-row sm:gap-7"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <Magnetic className="w-full max-w-[360px] sm:w-auto">
            <CurtainLink href={signedIn ? "/dashboard" : "/login?tab=signup"} className={BrandButtonClasses + " w-full justify-center sm:w-auto"}>
              <BrandButtonInner>{signedIn ? "Продолжить обучение" : "Начать обучение"}</BrandButtonInner>
            </CurtainLink>
          </Magnetic>
          {!signedIn && (
            <CurtainLink href="/login" className="group text-[15px] text-[#a39d92] transition-colors hover:text-[#e9e4da]">
              Уже есть аккаунт? <span className="text-[#e9e4da] underline decoration-[#c8b99f]/50 underline-offset-4 group-hover:decoration-[#c8b99f]">Войти</span>
            </CurtainLink>
          )}
        </motion.div>
      </motion.div>

      <motion.a
        href="#about"
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[12px] tracking-[0.2em] text-[#77736c] transition-colors hover:text-[#c8b99f]"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        Листайте
        <span className="h-10 w-px bg-gradient-to-b from-[#77736c] to-transparent" />
      </motion.a>
    </BrandField>
  );
}
