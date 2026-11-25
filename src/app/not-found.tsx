import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[12px] tracking-[0.2em] text-accent-soft">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Такой страницы нет</h1>
      <p className="mt-2 text-sm text-muted">Возможно, ссылка устарела или материал ещё не добавлен.</p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>На главную платформы</Link>
    </main>
  );
}
