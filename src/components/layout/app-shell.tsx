"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, CloudOff, FlaskConical, HardDrive, Loader2, LogOut, Menu, X } from "lucide-react";
import { MOBILE_TABS, NAVIGATION, SETTINGS_NAV, type NavItem } from "@/config/navigation";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthMode } from "@/lib/auth/config";
import { useStore, useT } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Switch } from "@/components/ui/switch";

export interface ShellUser {
  name: string;
  mode: AuthMode;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] transition-colors",
        active ? "bg-card text-fg" : "text-muted hover:bg-card/60 hover:text-fg",
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />}
      <Icon className={cn("size-[17px] shrink-0", active ? "text-accent-soft" : "text-subtle group-hover:text-muted")} />
      <span className="truncate">{t.nav[item.key]}</span>
    </Link>
  );
}

function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  const t = useT();
  const { state } = useStore();
  const initials = (state.settings.displayName || user.name).slice(0, 2).toUpperCase();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4">
        <Link href="/dashboard" onClick={onNavigate} aria-label="LINGUA home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Main">
        {NAVIGATION.map((section) => (
          <div key={section.key}>
            <div className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{t.nav[section.key]}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <NavLink item={SETTINGS_NAV} onNavigate={onNavigate} />
        <div className="flex items-center gap-3 rounded-md px-2.5 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[11px] font-semibold text-accent-soft">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-fg">{state.settings.displayName || user.name}</div>
            <div className={cn("truncate text-[11px]", user.mode === "demo" ? "text-warning" : "text-subtle")}>
              {user.mode === "demo" ? "Demo mode · not secure" : user.mode === "supabase" ? "Supabase account" : "Private account"}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label={t.nav.signOut}
              title={t.nav.signOut}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-card hover:text-fg"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SyncIndicator() {
  const { syncStatus } = useStore();
  const meta = {
    local: { icon: HardDrive, label: "This browser", title: "Progress is stored in this browser only", tone: "text-subtle" },
    loading: { icon: Loader2, label: "Loading", title: "Loading your progress", tone: "text-subtle" },
    saving: { icon: Loader2, label: "Saving", title: "Saving to your account", tone: "text-muted" },
    synced: { icon: Cloud, label: "Saved", title: "All progress is saved to your account", tone: "text-success" },
    offline: { icon: CloudOff, label: "Offline", title: "No connection — changes are kept on this device and will sync automatically", tone: "text-warning" },
    error: { icon: CloudOff, label: "Not saved", title: "Your session expired — sign in again to sync", tone: "text-danger" },
  }[syncStatus];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px]", meta.tone)} title={meta.title} role="status" aria-live="polite">
      <Icon className={cn("size-3.5", (syncStatus === "saving" || syncStatus === "loading") && "animate-spin")} />
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}

function SampleToggle() {
  const { state, actions, ready } = useStore();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted" title="Show labelled demonstration analytics">
      <FlaskConical className={cn("size-3.5", state.settings.samplePreview ? "text-warning" : "text-subtle")} />
      <span className="hidden sm:inline">Sample preview</span>
      <Switch
        checked={state.settings.samplePreview}
        onChange={(v) => actions.updateSettings({ samplePreview: v })}
        label="Sample preview"
        disabled={!ready}
      />
    </label>
  );
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useT();
  const { state } = useStore();

  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const level = state.settings.currentLevel;

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-surface lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div
          className={cn("absolute inset-0 bg-black/60 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[272px] max-w-[85vw] border-r border-line bg-surface transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute right-3 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-card hover:text-fg"
          >
            <X className="size-4" />
          </button>
          <SidebarContent user={user} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="-ml-1 inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-card hover:text-fg lg:hidden"
        >
          <Menu className="size-[18px]" />
        </button>
        <Link href="/dashboard" className="lg:hidden" aria-label="LINGUA home">
          <Logo compact />
        </Link>
        <div className="flex-1" />
        {user.mode === "demo" && (
          <span className="hidden items-center gap-1.5 rounded-[5px] border border-warning/30 bg-warning/[0.07] px-2 py-1 text-[11px] font-medium text-warning md:inline-flex">
            Demo auth
          </span>
        )}
        <Link
          href={level ? "/learning" : "/assessments"}
          className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-line bg-surface px-2 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-fg"
          title={level ? "Current level (self-reported)" : "Level not set yet"}
        >
          <span className="text-subtle">Level</span>
          <span className="font-semibold text-accent-soft">{level ?? "—"}</span>
        </Link>
        <SyncIndicator />
        <SampleToggle />
      </header>

      <main id="main" className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]", active ? "text-fg" : "text-subtle")}
            >
              <Icon className={cn("size-[18px]", active && "text-accent-soft")} />
              <span className="max-w-full truncate px-1">{t.nav[item.key]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 cursor-pointer flex-col items-center justify-center gap-1 text-[10.5px] text-subtle"
        >
          <Menu className="size-[18px]" />
          More
        </button>
      </nav>
    </div>
  );
}
