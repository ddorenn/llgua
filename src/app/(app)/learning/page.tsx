"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, Hourglass, Lock, PlayCircle } from "lucide-react";
import { course, levels, CEFR, SKILLS, type Cefr } from "@/lib/content";
import { useStore } from "@/lib/store/store";
import { lessonState, levelProgress, moduleProgress, type LessonState } from "@/lib/learning";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState, SKILL_LABEL } from "@/components/shared/page";
import { SampleBadge } from "@/components/shared/sample";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";

const STATE_META: Record<LessonState, { label: string; icon: typeof Circle; tone: string; badge: "success" | "accent" | "default" | "outline" }> = {
  completed: { label: "Completed", icon: CheckCircle2, tone: "text-success", badge: "success" },
  in_progress: { label: "In progress", icon: PlayCircle, tone: "text-accent-soft", badge: "accent" },
  available: { label: "Available", icon: Circle, tone: "text-fg", badge: "default" },
  locked: { label: "Locked", icon: Lock, tone: "text-subtle", badge: "outline" },
  pending: { label: "Content pending", icon: Hourglass, tone: "text-subtle", badge: "outline" },
};

export default function LearningPage() {
  const { state } = useStore();
  const defaultLevel = (state.settings.currentLevel ?? "A1") as Cefr;
  const [level, setLevel] = React.useState<Cefr>(defaultLevel);
  const [skill, setSkill] = React.useState<string>("all");

  const modules = course.modules.filter((m) => m.level === level);
  const levelInfo = levels.find((l) => l.id === level)!;

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Learning"
        description="Your structured path from A1 to C2. Lessons unlock in order as you complete them."
        actions={course.meta.sample ? <SampleBadge kind="content" /> : undefined}
      />

      {/* Level rail */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CEFR.map((id) => {
          const p = levelProgress(state, id);
          const active = id === level;
          const isCurrent = state.settings.currentLevel === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setLevel(id)}
              aria-pressed={active}
              className={cn(
                "group cursor-pointer rounded-lg border p-3 text-left transition-colors",
                active ? "border-accent/60 bg-accent-muted" : "border-line bg-card hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-[18px] font-semibold tracking-tight", active ? "text-fg" : "text-fg/90")}>{id}</span>
                {isCurrent && <span className="size-1.5 rounded-full bg-accent-soft" title="Your current level" />}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted">{levels.find((l) => l.id === id)?.name}</div>
              <Progress value={p.percent} className="mt-3 h-1" />
              <div className="tabular mt-1.5 text-[11px] text-subtle">
                {p.done}/{p.total} lessons
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">
            {level} · {levelInfo.name}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">{levelInfo.summary}</p>
        </div>
        <Tabs
          size="sm"
          value={skill}
          onChange={setSkill}
          items={[{ value: "all", label: "All skills" }, ...SKILLS.map((s) => ({ value: s, label: SKILL_LABEL[s] }))]}
        />
      </div>

      {modules.length === 0 ? (
        <EmptyState icon={Hourglass} title={`No ${level} modules yet`} description="Add modules for this level in content/curriculum/course.json." />
      ) : (
        <div className="space-y-5">
          {modules.map((m, mi) => {
            const mp = moduleProgress(state, m.id);
            const lessons = m.lessons.filter((l) => skill === "all" || l.skill === skill);
            return (
              <section key={m.id} className="rounded-lg border border-line bg-card">
                <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Module {mi + 1}</div>
                    <h3 className="mt-0.5 text-[15px] font-medium">{m.title}</h3>
                    <p className="mt-0.5 text-[13px] text-muted">{m.description}</p>
                  </div>
                  <div className="flex w-full items-center gap-3 sm:w-48">
                    <Progress value={mp.percent} />
                    <span className="tabular shrink-0 text-[12px] text-muted">
                      {mp.done}/{mp.total}
                    </span>
                  </div>
                </header>
                {lessons.length === 0 ? (
                  <p className="px-5 py-5 text-[13px] text-subtle">No {SKILL_LABEL[skill]?.toLowerCase()} lessons in this module.</p>
                ) : (
                  <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
                    {lessons.map((l) => {
                      const ls = lessonState(state, l.id);
                      const meta = STATE_META[ls];
                      const Icon = meta.icon;
                      const clickable = ls !== "locked" && ls !== "pending";
                      const inner = (
                        <div className={cn("flex h-full flex-col gap-3 bg-card p-4 transition-colors", clickable && "group-hover:bg-card-hover")}>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline">{SKILL_LABEL[l.skill]}</Badge>
                            <Icon className={cn("size-4", meta.tone)} aria-hidden />
                          </div>
                          <div className={cn("text-[14px] font-medium leading-snug", ls === "locked" || ls === "pending" ? "text-muted" : "text-fg")}>
                            {l.title}
                          </div>
                          <div className="mt-auto flex items-center justify-between text-[12px] text-subtle">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" /> {l.minutes} min
                            </span>
                            <Badge variant={meta.badge}>{meta.label}</Badge>
                          </div>
                        </div>
                      );
                      return (
                        <li key={l.id} className="group">
                          {clickable ? (
                            <Link href={`/learning/${l.id}`} className="block h-full">
                              {inner}
                            </Link>
                          ) : (
                            <div title={ls === "locked" ? "Complete the previous lesson to unlock" : "Lesson content has not been added yet"} className="h-full">
                              {inner}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
