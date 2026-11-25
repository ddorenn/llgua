import type { Metadata } from "next";
import { getAuthMode, DEMO_CREDENTIALS } from "@/lib/auth/config";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const mode = getAuthMode();

  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* restrained backdrop: one soft accent glow + hairline grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <span className="hidden text-[12px] text-subtle sm:block">Your Personal AI English Tutor</span>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <LoginForm
          mode={mode}
          next={next ?? ""}
          demo={mode === "demo" ? { ...DEMO_CREDENTIALS } : undefined}
        />
      </div>

      <footer className="relative z-10 px-6 pb-6 text-center text-[12px] text-subtle sm:px-10">
        © {new Date().getFullYear()} LINGUA · Personal edition
      </footer>
    </main>
  );
}
