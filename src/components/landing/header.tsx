"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#skills", label: "Skills" },
  { href: "#journey", label: "Journey" },
  { href: "#tutor", label: "AI tutor" },
];

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-bg transition-[border-color] duration-200",
        scrolled ? "border-b border-line" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:gap-6 sm:px-8">
        <Link href="/" aria-label="Lingua home" className="mr-2 shrink-0 sm:mr-0">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-md px-3 py-2 text-[14px] text-muted transition-colors hover:text-fg">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex-1" />
        <ThemeToggle />
        {signedIn ? (
          <Link href="/dashboard" className={buttonVariants({ size: "sm", className: "h-9" })}>
            Open dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden h-9 sm:inline-flex")}>
              Log in
            </Link>
            <Link href="/login" className={buttonVariants({ size: "sm", className: "h-9" })}>
              Enter Lingua
            </Link>
          </>
        )}
        <button
          type="button"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-fg md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
        </button>
      </div>
      {open && (
        <nav aria-label="Sections" className="border-t border-line px-5 pb-4 pt-2 md:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block border-b border-line py-3 text-[15px] text-fg last:border-0">
              {n.label}
            </a>
          ))}
          {!signedIn && (
            <Link href="/login" className="block py-3 text-[15px] text-accent-soft">
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
