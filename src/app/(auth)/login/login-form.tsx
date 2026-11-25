"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Eye, EyeOff, FlaskConical, Loader2, Lock, ShieldCheck } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import type { AuthMode } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<AuthMode, string> = {
  supabase: "Supabase Auth",
  local: "Private account",
  demo: "Development demo mode",
  disabled: "Not configured",
};

export function LoginForm({
  mode,
  next,
  demo,
}: {
  mode: AuthMode;
  next: string;
  demo?: { username: string; password: string };
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = React.useState(false);
  const [client, setClient] = React.useState<{ username?: string; password?: string }>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  const errors = { ...state.fieldErrors, ...client };

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const next: typeof client = {};
    if (!String(fd.get("username") ?? "").trim()) next.username = "Enter your username or email.";
    const pw = String(fd.get("password") ?? "");
    if (!pw) next.password = "Enter your password.";
    else if (pw.length < 6) next.password = "Password must be at least 6 characters.";
    setClient(next);
    if (next.username || next.password) e.preventDefault();
  }

  function fillDemo() {
    if (!demo || !formRef.current) return;
    (formRef.current.elements.namedItem("username") as HTMLInputElement).value = demo.username;
    (formRef.current.elements.namedItem("password") as HTMLInputElement).value = demo.password;
    setClient({});
  }

  return (
    <div className="w-full max-w-[400px] animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Sign in to your private learning space.</p>
      </div>

      <div className="rounded-xl border border-line bg-surface/80 p-6 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.7)] backdrop-blur sm:p-7">
        {mode === "demo" && (
          <div className="mb-5 rounded-md border border-warning/30 bg-warning/[0.07] p-3 text-[12.5px] leading-relaxed text-warning">
            <div className="flex items-center gap-2 font-medium">
              <FlaskConical className="size-3.5" /> Development demo mode — not secure
            </div>
            <p className="mt-1 text-warning/80">
              No authentication backend is configured. Use the demo account to preview the app. Configure Supabase or a
              private account before deploying (see README).
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-2 cursor-pointer font-medium text-fg underline-offset-4 hover:underline"
            >
              Fill demo credentials ({demo?.username} / {demo?.password})
            </button>
          </div>
        )}

        {mode === "disabled" && (
          <div className="mb-5 flex gap-2 rounded-md border border-danger/30 bg-danger/[0.07] p-3 text-[12.5px] text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Sign-in is not configured on this server. Set Supabase or private-account environment variables.
          </div>
        )}

        <form ref={formRef} action={formAction} onSubmit={validate} noValidate className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <div>
            <Label htmlFor="username">Username or email</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              defaultValue={state.values?.username}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? "username-error" : undefined}
              onChange={() => client.username && setClient((c) => ({ ...c, username: undefined }))}
              placeholder="your username"
            />
            <FieldError id="username-error">{errors.username}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                onChange={() => client.password && setClient((c) => ({ ...c, password: undefined }))}
                className="pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:text-fg"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id="password-error">{errors.password}</FieldError>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-muted">
            <input
              type="checkbox"
              name="remember"
              defaultChecked={state.values?.remember ?? true}
              className="size-4 cursor-pointer appearance-none rounded-[4px] border border-line-strong bg-surface bg-center bg-no-repeat checked:border-accent checked:bg-accent checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223.5%22><path d=%22M5 12l5 5L20 7%22/></svg>')] bg-[length:11px]"
            />
            Keep me signed in for 30 days
          </label>

          {state.error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/[0.07] px-3 py-2.5 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || mode === "disabled"}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4 text-[12px] text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3" /> Private workspace · No public registration
        </span>
        <span className={cn("inline-flex items-center gap-1.5", mode === "demo" && "text-warning/80")}>
          <ShieldCheck className="size-3" /> {MODE_LABEL[mode]}
        </span>
      </div>
    </div>
  );
}
