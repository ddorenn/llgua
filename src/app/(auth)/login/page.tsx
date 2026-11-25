import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getAuthMode, DEMO_CREDENTIALS } from "@/lib/auth/config";
import { LoginForm } from "./login-form";
import { BrandField } from "@/components/brand/field";
import { InteractiveWordmark } from "@/components/brand/wordmark";
import { CurtainLink } from "@/components/brand/curtain";
import { CustomCursor } from "@/components/brand/cursor";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const metadata: Metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; tab?: string }> }) {
  const { next, tab } = await searchParams;
  const mode = getAuthMode();

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <CustomCursor />
      {/* Brand side */}
      <BrandField as="div" className="relative hidden flex-col justify-between overflow-hidden px-12 py-10 lg:flex" floor>
        <CurtainLink href="/" className="relative z-10 inline-flex w-fit items-center gap-2 text-[14px] text-[#a39d92] transition-colors hover:text-[#e9e4da]">
          <ArrowLeft className="size-4" /> На главную
        </CurtainLink>
        <div className="relative z-10">
          <InteractiveWordmark className="text-[clamp(5rem,10vw,10rem)] text-[#e9e4da]" delay={0.1} />
          <p className="mt-4 text-[13px] font-medium tracking-[0.55em] text-[#c8b99f]">YOUR ENGLISH TUTOR</p>
        </div>
        <p className="relative z-10 max-w-[40ch] text-[14px] leading-relaxed text-[#77736c]">
          Грамматика, словарь, чтение, аудирование, разговорная практика и письмо — в одной системе.
        </p>
      </BrandField>

      {/* Form side */}
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <CurtainLink href="/" className="inline-flex items-center gap-2 py-2 text-[14px] text-muted transition-colors hover:text-fg lg:invisible">
            <ArrowLeft className="size-4" /> На главную
          </CurtainLink>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center py-10">
          <LoginForm
            mode={mode}
            next={next ?? ""}
            initialTab={tab === "signup" ? "signup" : "signin"}
            demo={mode === "demo" ? { ...DEMO_CREDENTIALS } : undefined}
          />
        </div>
      </div>
    </main>
  );
}
