"use client";

import * as React from "react";
import { Bell, Check, Database, Download, Globe2, KeyRound, Target, Trash2, User } from "lucide-react";
import { CEFR, SKILLS, type Cefr, type Skill } from "@/lib/content";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useStore } from "@/lib/store/store";
import type { Settings, TargetExam, TeachingLanguage } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { PageHeader, Notice, SKILL_LABEL } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const DURATIONS = [30, 45, 60, 75, 90, 120];

function Section({ id, icon: Icon, title, description, children, footer }: {
  id: string; icon: typeof User; title: string; description: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-muted"><Icon className="size-4" /></div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
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
  const { state, actions } = useStore();
  const s = state.settings;
  const [profile, setProfile] = React.useState({ displayName: s.displayName, email: s.email });
  const [errors, setErrors] = React.useState<{ displayName?: string; email?: string }>({});
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const set = (patch: Partial<Settings>) => {
    actions.updateSettings(patch);
    setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  };

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!profile.displayName.trim()) next.displayName = "Name is required.";
    else if (profile.displayName.length > 40) next.displayName = "Keep it under 40 characters.";
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;
    set({ displayName: profile.displayName.trim(), email: profile.email.trim() });
  }

  function toggleSkill(sk: Skill) {
    const has = s.focusSkills.includes(sk);
    if (has && s.focusSkills.length === 1) return;
    set({ focusSkills: has ? s.focusSkills.filter((x) => x !== sk) : [...s.focusSkills, sk] });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lingua-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Settings"
        description="Personalise your learning. Changes save automatically."
        actions={savedAt ? <span className="inline-flex items-center gap-1.5 text-[12px] text-success"><Check className="size-3.5" /> Saved {savedAt}</span> : undefined}
      />

      <nav className="flex gap-1.5 overflow-x-auto" aria-label="Settings sections">
        {[["profile", "Profile"], ["goals", "Learning goals"], ["language", "Language"], ["notifications", "Notifications"], ["account", "Account"]].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line px-3 py-1 text-[12px] text-muted hover:border-line-strong hover:text-fg">{label}</a>
        ))}
      </nav>

      <form onSubmit={saveProfile}>
        <Section
          id="profile"
          icon={User}
          title="Profile"
          description="How LINGUA addresses you."
          footer={<Button type="submit" size="sm">Save profile</Button>}
        >
          <Row label="Display name" htmlFor="displayName">
            <Input id="displayName" value={profile.displayName} aria-invalid={Boolean(errors.displayName)} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} />
            <FieldError>{errors.displayName}</FieldError>
          </Row>
          <Row label="Email" hint="Optional · used for future reports" htmlFor="email">
            <Input id="email" type="email" value={profile.email} aria-invalid={Boolean(errors.email)} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
            <FieldError>{errors.email}</FieldError>
          </Row>
        </Section>
      </form>

      <Section id="goals" icon={Target} title="Learning goals" description="Your level, target and daily study time.">
        <Row label="Current level" hint="Self-reported until a validated assessment exists" htmlFor="currentLevel">
          <Select id="currentLevel" value={s.currentLevel ?? ""} onChange={(e) => set({ currentLevel: (e.target.value || null) as Cefr | null })}>
            <option value="">Not set</option>
            {CEFR.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Row>
        <Row label="Target level" htmlFor="targetLevel">
          <Select id="targetLevel" value={s.targetLevel} onChange={(e) => set({ targetLevel: e.target.value as Cefr })}>
            {CEFR.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Row>
        <Row label="Main goal" htmlFor="mainGoal">
          <Input id="mainGoal" value={s.mainGoal} maxLength={120} onChange={(e) => actions.updateSettings({ mainGoal: e.target.value })} onBlur={() => set({ mainGoal: s.mainGoal.trim() || "Balanced development of all English skills" })} />
        </Row>
        <Row label="Daily study duration" hint="Daily Plan blocks scale proportionally">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Daily study duration">
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
                {d} min
              </button>
            ))}
          </div>
        </Row>
        <Row label="Focus skills" hint="At least one">
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
                    on ? "border-accent/60 bg-accent-muted text-fg" : "border-line text-muted hover:border-line-strong",
                  )}
                >
                  {SKILL_LABEL[sk]}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="Exam preparation" hint="IELTS and TOEFL modules are planned" htmlFor="exam">
          <Select id="exam" value={s.targetExam} onChange={(e) => set({ targetExam: e.target.value as TargetExam })}>
            <option value="none">None for now</option>
            <option value="ielts">IELTS (future module)</option>
            <option value="toefl">TOEFL (future module)</option>
          </Select>
        </Row>
      </Section>

      <Section id="language" icon={Globe2} title="Language" description="Interface and teaching languages.">
        <Row label="Interface language" hint="Navigation and common labels" htmlFor="ui-lang">
          <Select id="ui-lang" value={s.interfaceLanguage} onChange={(e) => set({ interfaceLanguage: e.target.value as Locale })}>
            {Object.entries(LOCALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Row>
        <Row label="Teaching language" hint="How the AI tutor explains" htmlFor="teach-lang">
          <Select id="teach-lang" value={s.teachingLanguage} onChange={(e) => set({ teachingLanguage: e.target.value as TeachingLanguage })}>
            <option value="ru+en">Russian + English</option>
            <option value="en">English only</option>
          </Select>
        </Row>
      </Section>

      <Section id="notifications" icon={Bell} title="Notifications" description="Preferences are saved now; delivery (email/push) is not implemented yet.">
        {([
          ["dailyReminder", "Daily study reminder", "A nudge at your chosen time"],
          ["homeworkDue", "Homework due", "When an assignment is due within 24 h"],
          ["weeklyReport", "Weekly progress report", "Summary from the AI Analyst"],
        ] as const).map(([key, label, hint]) => (
          <Row key={key} label={label} hint={hint}>
            <Switch checked={s.notifications[key]} onChange={(v) => set({ notifications: { ...s.notifications, [key]: v } })} label={label} />
          </Row>
        ))}
        <Row label="Reminder time" htmlFor="reminderTime">
          <Input id="reminderTime" type="time" className="w-36" value={s.notifications.reminderTime} disabled={!s.notifications.dailyReminder} onChange={(e) => set({ notifications: { ...s.notifications, reminderTime: e.target.value } })} />
        </Row>
      </Section>

      <Section id="account" icon={KeyRound} title="Account & data" description="Sign-in, data storage and export.">
        <Notice icon={Database} title="Data is stored in this browser">
          Progress is saved locally (localStorage). Connect Supabase to sync across devices — see README → Database.
        </Notice>
        <Row label="Sample preview" hint="Show labelled demonstration analytics">
          <Switch checked={s.samplePreview} onChange={(v) => set({ samplePreview: v })} label="Sample preview" />
        </Row>
        <Row label="Export data" hint="Download everything as JSON">
          <Button variant="secondary" size="sm" onClick={exportData}><Download /> Export</Button>
        </Row>
        <Row label="Reset progress" hint="Deletes all local learning data">
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-danger">This cannot be undone.</span>
              <Button variant="danger" size="sm" onClick={() => { actions.resetAll(); setConfirmReset(false); }}>Yes, reset everything</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}><Trash2 /> Reset</Button>
          )}
        </Row>
      </Section>
    </div>
  );
}
