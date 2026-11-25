"use client";

import { BrandField } from "@/components/brand/field";
import { CurtainLink } from "@/components/brand/curtain";
import { BrandRingClasses, BrandRingInner, Magnetic } from "@/components/brand/magnetic";
import { Reveal, RevealText } from "@/components/brand/reveal";

/** Closing section + footer on the dark brand field. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <BrandField as="footer" className="overflow-hidden" floor>
      <div className="mx-auto flex min-h-[88svh] max-w-[1320px] flex-col items-center justify-center px-5 pb-16 pt-32 text-center sm:px-8">
        <RevealText
          as="h2"
          text="Ну что, попробуем?"
          className="text-[clamp(3.2rem,10vw,9rem)] font-semibold leading-[0.95] tracking-[-0.055em] text-[#e9e4da]"
        />
        <Reveal delay={0.25}>
          <p className="mt-8 max-w-[48ch] text-[17px] leading-relaxed text-[#a39d92] sm:text-[19px]">
            Твой путь к английскому начинается с первого занятия
          </p>
        </Reveal>
        <Reveal delay={0.4} className="mt-12 flex flex-col items-center gap-6">
          <Magnetic strength={0.35}>
            <CurtainLink href={signedIn ? "/dashboard" : "/login?tab=signup"} className={BrandRingClasses}>
              <BrandRingInner>{signedIn ? "Продолжить обучение" : "Начать обучение"}</BrandRingInner>
            </CurtainLink>
          </Magnetic>
          {!signedIn && (
            <CurtainLink href="/login" className="group text-[15px] text-[#a39d92] transition-colors hover:text-[#e9e4da]">
              Уже есть аккаунт? <span className="text-[#e9e4da] underline decoration-[#c8b99f]/50 underline-offset-4 group-hover:decoration-[#c8b99f]">Войти</span>
            </CurtainLink>
          )}
        </Reveal>
      </div>

      <div className="relative mx-auto max-w-[1320px] px-5 pb-10 sm:px-8">
        <div className="flex flex-col gap-10 border-t border-[#2b2925] pt-10 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-[family-name:var(--font-display)] text-[34px] font-bold leading-none tracking-[-0.045em] text-[#e9e4da]">LINGUA</div>
            <div className="mt-2 text-[12px] tracking-[0.4em] text-[#c8b99f]">YOUR ENGLISH TUTOR</div>
          </div>
          <nav aria-label="Навигация в подвале" className="flex flex-wrap gap-x-8 gap-y-3 text-[14px]">
            <a href="#about" className="text-[#a39d92] transition-colors hover:text-[#e9e4da]">О платформе</a>
            <a href="#directions" className="text-[#a39d92] transition-colors hover:text-[#e9e4da]">Направления</a>
            <a href="#inside" className="text-[#a39d92] transition-colors hover:text-[#e9e4da]">Как это выглядит</a>
            <a href="#why" className="text-[#a39d92] transition-colors hover:text-[#e9e4da]">Преимущества</a>
            <CurtainLink href={signedIn ? "/dashboard" : "/login"} className="text-[#e9e4da] transition-colors hover:text-[#c8b99f]">
              {signedIn ? "Платформа" : "Войти в платформу"}
            </CurtainLink>
          </nav>
        </div>
        <p className="mt-10 text-[12.5px] text-[#77736c]">© {new Date().getFullYear()} LINGUA. Закрытый доступ для первых учеников.</p>
      </div>
    </BrandField>
  );
}
