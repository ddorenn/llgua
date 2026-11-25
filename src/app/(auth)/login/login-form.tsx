"use client";

import * as React from "react";
import { useActionState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, Eye, EyeOff, FlaskConical, Loader2, Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import type { AuthMode } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "signin" | "signup";

const MODE_LABEL: Record<AuthMode, string> = {
  supabase: "Защищённый вход через Supabase",
  local: "Личный аккаунт",
  demo: "Демо-режим разработки",
  disabled: "Вход не настроен",
};

export function LoginForm({
  mode,
  next,
  initialTab,
  demo,
}: {
  mode: AuthMode;
  next: string;
  initialTab: Tab;
  demo?: { username: string; password: string };
}) {
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const reduce = useReducedMotion();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = React.useState(false);
  const [client, setClient] = React.useState<{ username?: string; password?: string }>({});
  const formRef = React.useRef<HTMLFormElement>(null);
  const errors = { ...state.fieldErrors, ...client };

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const nextErr: typeof client = {};
    if (!String(fd.get("username") ?? "").trim()) nextErr.username = "Введите логин или email.";
    const pw = String(fd.get("password") ?? "");
    if (!pw) nextErr.password = "Введите пароль.";
    else if (pw.length < 6) nextErr.password = "Пароль должен быть не короче 6 символов.";
    setClient(nextErr);
    if (nextErr.username || nextErr.password) e.preventDefault();
  }

  function fillDemo() {
    if (!demo || !formRef.current) return;
    (formRef.current.elements.namedItem("username") as HTMLInputElement).value = demo.username;
    (formRef.current.elements.namedItem("password") as HTMLInputElement).value = demo.password;
    setClient({});
  }

  const panel = {
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? undefined : { opacity: 0, y: -8 },
    transition: { duration: 0.35, ease: [0.2, 0.7, 0.2, 1] as const },
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 lg:hidden">
        <span className="font-[family-name:var(--font-display)] text-[34px] font-bold tracking-[-0.045em] text-fg">LINGUA</span>
        <p className="mt-1 text-[11px] font-medium tracking-[0.5em] text-accent-soft">YOUR ENGLISH TUTOR</p>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Вход или регистрация" className="relative mb-10 flex gap-8 border-b border-line">
        {(
          [
            ["signin", "Вход"],
            ["signup", "Регистрация"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("relative pb-3 text-[17px] font-medium transition-colors", tab === id ? "text-fg" : "text-subtle hover:text-muted")}
          >
            {label}
            {tab === id && (
              <motion.span layoutId="auth-tab" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-fg" transition={{ type: "spring", stiffness: 420, damping: 36 }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "signin" ? (
          <motion.div key="signin" {...panel}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.04em]">С возвращением</h1>
            <p className="mt-2 text-[15px] text-muted">Войди, чтобы продолжить с того места, где остановился.</p>

            {mode === "demo" && (
              <div className="mt-6 rounded-r-md border-l-2 border-warning bg-surface px-4 py-3 text-[13px] leading-relaxed">
                <div className="flex items-center gap-2 font-medium text-warning">
                  <FlaskConical className="size-3.5" /> Демо-режим — не защищён
                </div>
                <p className="mt-1 text-muted">
                  Сервер авторизации не настроен. Используй демо-аккаунт для просмотра. Перед публикацией подключи Supabase или личный аккаунт.
                </p>
                <button type="button" onClick={fillDemo} className="mt-2 font-medium text-fg underline-offset-4 hover:underline">
                  Подставить демо-данные ({demo?.username} / {demo?.password})
                </button>
              </div>
            )}
            {mode === "disabled" && (
              <div className="mt-6 flex gap-2 rounded-r-md border-l-2 border-danger bg-surface px-4 py-3 text-[13px] text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                Вход на этом сервере не настроен.
              </div>
            )}

            <form ref={formRef} action={formAction} onSubmit={validate} noValidate className="mt-8 space-y-5">
              <input type="hidden" name="next" value={next} />
              <div>
                <Label htmlFor="username">Логин или email</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  defaultValue={state.values?.username}
                  aria-invalid={Boolean(errors.username)}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  onChange={() => client.username && setClient((c) => ({ ...c, username: undefined }))}
                  placeholder="твой логин"
                  className="h-12"
                />
                <FieldError id="username-error">{errors.username}</FieldError>
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    onChange={() => client.password && setClient((c) => ({ ...c, password: undefined }))}
                    className="h-12 pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                    aria-pressed={show}
                    className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-subtle transition-colors hover:text-fg"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError id="password-error">{errors.password}</FieldError>
              </div>

              <label className="flex select-none items-center gap-2.5 text-[14px] text-muted">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked={state.values?.remember ?? true}
                  className="size-4 appearance-none rounded-[4px] border border-line-strong bg-card bg-center bg-no-repeat checked:border-primary checked:bg-primary checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23c8b99f%22 stroke-width=%223.5%22><path d=%22M5 12l5 5L20 7%22/></svg>')] bg-[length:11px]"
                />
                Запомнить меня на 30 дней
              </label>

              <AnimatePresence>
                {state.error && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 overflow-hidden rounded-r-md border-l-2 border-danger bg-surface px-3 py-2.5 text-[14px] text-danger"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {state.error}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" size="lg" className="h-13 w-full rounded-full text-[15.5px]" disabled={pending || mode === "disabled"}>
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" /> Входим…
                  </>
                ) : (
                  "Войти"
                )}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="signup" {...panel}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.04em]">Регистрация</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Сейчас LINGUA работает в закрытом режиме для первых учеников. Аккаунты создаёт администратор платформы.
            </p>
            <ol className="mt-8 space-y-5">
              {[
                ["Получи приглашение", "Администратор создаст для тебя аккаунт и передаст логин и пароль."],
                ["Войди в платформу", "На вкладке «Вход» введи полученные данные."],
                ["Пройди входной тест", "Он покажет стартовую точку, и можно начинать занятия."],
              ].map(([t, d], i) => (
                <motion.li
                  key={t}
                  className="flex gap-4"
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                >
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-[13px] text-muted">{i + 1}</span>
                  <div>
                    <p className="text-[15.5px] font-medium text-fg">{t}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{d}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
            <Button size="lg" className="mt-10 h-13 w-full rounded-full text-[15.5px]" onClick={() => setTab("signin")}>
              У меня уже есть данные — войти
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-10 flex items-center gap-2 border-t border-line pt-5 text-[12.5px] text-subtle">
        <Lock className="size-3" /> {MODE_LABEL[mode]}. Пароли не хранятся в открытом виде.
      </p>
    </div>
  );
}
