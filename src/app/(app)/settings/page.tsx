"use client";

import * as React from "react";
import { Bell, Check, Database, Globe2, KeyRound, Palette, Target, User } from "lucide-react";
import { ThemePicker } from "@/components/shared/theme-toggle";
import { CEFR, SKILLS, type Cefr, type Skill } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import type { Settings, TargetExam, TeachingLanguage } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { DataControls } from "@/components/account/data-controls";
import { PageHeader, Notice, SKILL_LABEL } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/section";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const DURATIONS = [30, 45, 60, 75, 90, 120];

function Section({ id, icon: Icon, title, description, children, footer }: {
  id: string; icon: typeof User; title: string; description: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20 pb-4">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-subtle" aria-hidden /> {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
      {footer && <CardFooter className="justify-end">{footer}</CardFooter>}
    </Card>
  );
}

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-6">
      <div>
        <Label htmlFor={htmlFor} className="mb-0">{label}</Label>
        {hint && <p className="mt-0.5 text-[12px] text-subtle">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { state, actions, syncMode } = useStore();
  const s = state.settings;
  const [profile, setProfile] = React.useState({ displayName: s.displayName, email: s.email });
  const [errors, setErrors] = React.useState<{ displayName?: string; email?: string }>({});
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  const set = (patch: Partial<Settings>) => {
    actions.updateSettings(patch);
    setSavedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
  };

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!profile.displayName.trim()) next.displayName = "Укажи имя.";
    else if (profile.displayName.length > 40) next.displayName = "Не длиннее 40 символов.";
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) next.email = "Введи корректный email.";
    setErrors(next);
    if (Object.keys(next).length) return;
    set({ displayName: profile.displayName.trim(), email: profile.email.trim() });
  }

  function toggleSkill(sk: Skill) {
    const has = s.focusSkills.includes(sk);
    if (has && s.focusSkills.length === 1) return;
    set({ focusSkills: has ? s.focusSkills.filter((x) => x !== sk) : [...s.focusSkills, sk] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader
        title="Настройки"
        description="Настрой обучение под себя. Изменения сохраняются автоматически."
        actions={savedAt ? <span className="inline-flex items-center gap-1.5 text-[12px] text-success"><Check className="size-3.5" /> Сохранено в {savedAt}</span> : undefined}
      />

      <nav className="flex gap-1.5 overflow-x-auto" aria-label="Разделы настроек">
        {[["appearance", "Оформление"], ["profile", "Профиль"], ["goals", "Цель на день"], ["language", "Язык"], ["notifications", "Уведомления"], ["account", "Аккаунт"]].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full bg-elevated px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-fg">{label}</a>
        ))}
      </nav>

      <Section id="appearance" icon={Palette} title="Оформление" description="Как LINGUA выглядит на этом устройстве. «Системная» следует настройкам устройства.">
        <ThemePicker />
      </Section>

      <form onSubmit={saveProfile}>
        <Section
          id="profile"
          icon={User}
          title="Профиль"
          description="Как LINGUA к тебе обращается."
          footer={<Button type="submit" size="sm">Сохранить профиль</Button>}
        >
          <Row label="Имя" htmlFor="displayName">
            <Input id="displayName" value={profile.displayName} aria-invalid={Boolean(errors.displayName)} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} />
            <FieldError>{errors.displayName}</FieldError>
          </Row>
          <Row label="Email" hint="Необязательно, для будущих отчётов" htmlFor="email">
            <Input id="email" type="email" value={profile.email} aria-invalid={Boolean(errors.email)} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
            <FieldError>{errors.email}</FieldError>
          </Row>
        </Section>
      </form>

      <Section id="goals" icon={Target} title="Цель на день и предпочтения" description="Уровень, цель, время занятий и приоритеты.">
        <Row label="Текущий уровень" hint="Указывается вручную, пока нет валидированного теста" htmlFor="currentLevel">
          <Select id="currentLevel" value={s.currentLevel ?? ""} onChange={(e) => set({ currentLevel: (e.target.value || null) as Cefr | null })}>
            <option value="">Не задан</option>
            {CEFR.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Row>
        <Row label="Целевой уровень" htmlFor="targetLevel">
          <Select id="targetLevel" value={s.targetLevel} onChange={(e) => set({ targetLevel: e.target.value as Cefr })}>
            {CEFR.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Row>
        <Row label="Главная цель" htmlFor="mainGoal">
          <Input id="mainGoal" value={s.mainGoal} maxLength={120} onChange={(e) => actions.updateSettings({ mainGoal: e.target.value })} onBlur={() => set({ mainGoal: s.mainGoal.trim() || "Сбалансированное развитие всех навыков английского" })} />
        </Row>
        <Row label="Время занятий в день" hint="Блоки плана масштабируются пропорционально">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Время занятий в день">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={s.dailyMinutes === d}
                onClick={() => set({ dailyMinutes: d })}
                className={cn(
                  "tabular h-9 min-w-14 cursor-pointer rounded-md border px-3 text-[13px] transition-colors",
                  s.dailyMinutes === d ? "border-accent bg-accent-muted text-fg" : "border-line bg-surface text-muted hover:border-line-strong",
                )}
              >
                {d} мин
              </button>
            ))}
          </div>
        </Row>
        <Row label="Приоритетные навыки" hint="Хотя бы один">
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((sk) => {
              const on = s.focusSkills.includes(sk);
              return (
                <button
                  key={sk}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSkill(sk)}
                  className={cn(
                    "h-8 cursor-pointer rounded-full border px-3 text-[12.5px] transition-colors",
                    on ? "border-accent-line bg-accent-muted text-fg" : "border-line text-muted hover:border-line-strong",
                  )}
                >
                  {SKILL_LABEL[sk]}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="Подготовка к экзамену" hint="Модули IELTS и TOEFL в планах" htmlFor="exam">
          <Select id="exam" value={s.targetExam} onChange={(e) => set({ targetExam: e.target.value as TargetExam })}>
            <option value="none">Пока нет</option>
            <option value="ielts">IELTS (модуль в планах)</option>
            <option value="toefl">TOEFL (модуль в планах)</option>
          </Select>
        </Row>
      </Section>

      <Section id="language" icon={Globe2} title="Язык" description="Язык интерфейса и объяснений.">
        <Row label="Язык интерфейса" hint="Учебные материалы остаются на английском">
          <p className="text-[15px] text-fg">Русский</p>
        </Row>
        <Row label="Язык объяснений" hint="На каком языке объясняет AI-репетитор" htmlFor="teach-lang">
          <Select id="teach-lang" value={s.teachingLanguage} onChange={(e) => set({ teachingLanguage: e.target.value as TeachingLanguage })}>
            <option value="ru+en">Русский + английский</option>
            <option value="en">Только английский</option>
          </Select>
        </Row>
      </Section>

      <Section id="notifications" icon={Bell} title="Уведомления" description="Настройки сохраняются, но сами уведомления пока не отправляются.">
        {([
          ["dailyReminder", "Напоминание о занятии", "Напоминание в выбранное время"],
          ["homeworkDue", "Срок домашнего задания", "Когда до срока задания меньше суток"],
          ["weeklyReport", "Недельный отчёт о прогрессе", "Сводка от AI-аналитика"],
        ] as const).map(([key, label, hint]) => (
          <Row key={key} label={label} hint={hint}>
            <Switch checked={s.notifications[key]} onChange={(v) => set({ notifications: { ...s.notifications, [key]: v } })} label={label} />
          </Row>
        ))}
        <Row label="Время напоминания" htmlFor="reminderTime">
          <Input id="reminderTime" type="time" className="w-36" value={s.notifications.reminderTime} disabled={!s.notifications.dailyReminder} onChange={(e) => set({ notifications: { ...s.notifications, reminderTime: e.target.value } })} />
        </Row>
      </Section>

      <Section id="account" icon={KeyRound} title="Аккаунт и данные" description="Вход, хранение данных и экспорт.">
        {syncMode === "remote" ? (
          <Notice icon={Database} title="Прогресс синхронизируется с аккаунтом" tone="accent">
            Всё, что ты делаешь, сохраняется в Supabase и доступно на любом устройстве после входа. Копия хранится на этом устройстве,
            поэтому заниматься можно и без интернета — изменения отправятся, когда связь вернётся.
          </Notice>
        ) : (
          <Notice icon={Database} title="Данные хранятся в этом браузере">
            Прогресс сохраняется локально. Войди через Supabase, чтобы синхронизировать устройства.
          </Notice>
        )}
        <Row label="Демо-данные" hint="Показывать демонстрационную аналитику с пометкой">
          <Switch checked={s.samplePreview} onChange={(v) => set({ samplePreview: v })} label="Демо-данные" />
        </Row>
        <DataControls />
      </Section>
    </div>
  );
}
