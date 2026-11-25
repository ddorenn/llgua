import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthMode, DEMO_CREDENTIALS } from "@/lib/auth/config";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const mode = getAuthMode();

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Left: a quiet page from the product */}
      <aside className="relative hidden flex-col justify-between bg-surface px-12 py-10 lg:flex">
        <Link href="/" aria-label="Lingua home">
          <Logo />
        </Link>
        <div className="max-w-[420px]">
          <p className="lang text-[30px] leading-[1.9] text-fg">
            She <span className="text-muted line-through decoration-accent decoration-2">don&apos;t</span>{" "}
            <span className="italic text-accent-soft">doesn&apos;t</span> like coffee.
          </p>
          <p className="mt-4 border-l-2 border-accent pl-3 text-[14px] leading-relaxed text-muted">
            Third person singular takes <span className="lang italic text-fg">does</span>. Your tutor explains every correction like
            this, in English and Russian.
          </p>
        </div>
        <p className="text-[13px] text-subtle">© {new Date().getFullYear()} Lingua</p>
      </aside>

      {/* Right: the form */}
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-md py-2 pr-2 text-[14px] text-muted transition-colors hover:text-fg">
            <ArrowLeft className="size-4" /> Back to site
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center py-10">
          <LoginForm mode={mode} next={next ?? ""} demo={mode === "demo" ? { ...DEMO_CREDENTIALS } : undefined} />
        </div>
      </div>
    </main>
  );
}
