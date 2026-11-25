import Link from "next/link";
import { Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { LandingHeader } from "@/components/landing/header";
import { HeroSheet } from "@/components/landing/hero-sheet";
import { Journey } from "@/components/landing/journey";
import { TutorDemo } from "@/components/landing/tutor-demo";
import { Logo } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PRINCIPLES = [
  {
    title: "Start from where you are",
    body: "A short assessment gives a starting snapshot. Lessons, words and texts are chosen for your level and your goals, and change as you improve.",
    visual: "levels",
  },
  {
    title: "Practise a little every day",
    body: "One hour, split into five focused blocks: vocabulary, grammar, reading or listening, speaking or writing, and a short review.",
    visual: "plan",
  },
  {
    title: "Get feedback that explains",
    body: "The AI tutor corrects your sentences, explains why in English and Russian, and gives you one more to try.",
    visual: "correction",
  },
  {
    title: "See what is actually changing",
    body: "Progress comes from your own assessments and practice, compared over time. No invented scores.",
    visual: "progress",
  },
] as const;

const SKILLS = [
  { name: "Grammar", note: "Rules, then use in context.", sample: "If I had known, I would have come." },
  { name: "Vocabulary", note: "Words with sound, examples and spaced review.", sample: "reliable, thorough, reluctant" },
  { name: "Reading", note: "Graded texts with questions.", sample: "Ten years ago, working from home was a privilege…" },
  { name: "Listening", note: "Dialogues first, transcript after.", sample: "Would you like anything to eat?", audio: true },
  { name: "Speaking", note: "Prompts you answer out loud and record.", sample: "Describe a trip you remember well." },
  { name: "Writing", note: "Tasks with word targets and rubrics.", sample: "Although it was raining, we went for a walk." },
];

function PrincipleVisual({ kind }: { kind: (typeof PRINCIPLES)[number]["visual"] }) {
  if (kind === "levels")
    return (
      <div className="flex gap-1.5" aria-hidden>
        {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
          <span
            key={l}
            className={
              l === "B1"
                ? "rounded-md bg-accent px-2 py-1 text-[12.5px] font-medium text-on-accent"
                : "rounded-md bg-elevated px-2 py-1 text-[12.5px] text-muted"
            }
          >
            {l}
          </span>
        ))}
      </div>
    );
  if (kind === "plan")
    return (
      <div className="w-[220px]" aria-hidden>
        <div className="flex h-2 gap-[3px]">
          {[10, 15, 15, 15, 5].map((m, i) => (
            <span key={i} style={{ flexGrow: m }} className={i < 2 ? "rounded-full bg-accent" : "rounded-full bg-elevated"} />
          ))}
        </div>
        <div className="tabular mt-2 flex justify-between text-[12px] text-subtle">
          <span>0</span>
          <span>60 min</span>
        </div>
      </div>
    );
  if (kind === "correction")
    return (
      <p className="lang text-[17px] text-fg" aria-hidden>
        She <span className="text-muted line-through decoration-accent decoration-2">don&apos;t</span>{" "}
        <span className="italic text-accent-soft">doesn&apos;t</span> like coffee.
      </p>
    );
  return (
    <div className="flex h-12 items-end gap-1.5" aria-hidden>
      {[38, 44, 52, 50, 61, 67].map((h, i) => (
        <span key={i} className={i === 0 ? "w-3 rounded-t-sm bg-[var(--c-chart-baseline)]" : "w-3 rounded-t-sm bg-accent"} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default async function LandingPage() {
  const user = await getCurrentUser().catch(() => null);
  const signedIn = Boolean(user);
  const enterHref = signedIn ? "/dashboard" : "/login";

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        Skip to content
      </a>
      <LandingHeader signedIn={signedIn} />

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
          <div>
            <h1 className="max-w-[12ch] text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-[64px] lg:text-[72px]">
              English learning, built around you.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-muted sm:text-[18px]">
              Your personal learning space to improve grammar, vocabulary, reading, listening, speaking and writing — one step at a time.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={enterHref} className={buttonVariants({ size: "lg" })}>
                {signedIn ? "Open your dashboard" : "Enter LINGUA"}
              </Link>
              <a href="#how" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                See how it works
              </a>
            </div>
            <p className="mt-6 text-[13.5px] text-subtle">Private early access. Accounts are created by invitation.</p>
          </div>
          <HeroSheet />
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20 lg:py-28">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[42px]">How it works</h2>
              <p className="mt-4 max-w-[38ch] text-[16px] leading-relaxed text-muted">
                Four habits that repeat every week: find your level, practise daily, get explained feedback, and check what changed.
              </p>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {PRINCIPLES.map((p, i) => (
                <li key={p.title} className="grid gap-5 py-8 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,240px)] sm:items-center sm:gap-6">
                  <span className="tabular text-[15px] font-medium text-subtle">{i + 1}</span>
                  <div>
                    <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-fg">{p.title}</h3>
                    <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-muted">{p.body}</p>
                  </div>
                  <div className="sm:justify-self-end">
                    <PrincipleVisual kind={p.visual} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="scroll-mt-20 bg-surface">
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[42px]">Six skills, one plan</h2>
              <p className="max-w-[40ch] text-[16px] leading-relaxed text-muted">Each day touches several of them, so none falls behind.</p>
            </div>
            <ul className="mt-12 grid border-t border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
              {SKILLS.map((s) => (
                <li key={s.name} className="flex flex-col gap-3 border-b border-line py-7 pr-8">
                  <h3 className="text-[26px] font-semibold tracking-[-0.03em] text-fg">{s.name}</h3>
                  <p className="text-[14.5px] text-muted">{s.note}</p>
                  <p className="lang mt-auto flex items-center gap-2 pt-3 text-[17px] italic text-fg/80">
                    {s.audio && <Play className="size-3.5 shrink-0 fill-current text-accent-soft" aria-hidden />}
                    {s.sample}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Journey */}
        <section id="journey" className="scroll-mt-20">
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="max-w-[640px]">
              <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[42px]">Your learning journey</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">
                Lingua follows the CEFR scale from A1 to C2. You move up at your own pace; your level is measured by assessments, not by
                the calendar.
              </p>
            </div>
            <div className="mt-14">
              <Journey />
            </div>
          </div>
        </section>

        {/* AI tutor */}
        <section id="tutor" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-28">
            <div>
              <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[42px]">
                A tutor that knows what you are working on
              </h2>
              <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-muted">
                It sees your level, your plan and your recent mistakes, and adjusts how it explains. Pick a role for the task at hand.
              </p>
              <dl className="mt-8 grid max-w-[460px] grid-cols-2 gap-x-6 gap-y-4 text-[14.5px]">
                {[
                  ["Teacher", "explains rules"],
                  ["Examiner", "checks your work"],
                  ["Planner", "builds your week"],
                  ["Analyst", "reads your progress"],
                  ["Speaking partner", "keeps you talking"],
                  ["Vocabulary coach", "drills your words"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-medium text-fg">{k}</dt>
                    <dd className="text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <TutorDemo />
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-surface">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-28">
            <h2 className="max-w-[16ch] text-[38px] font-semibold leading-[1.05] tracking-[-0.04em] text-fg sm:text-[54px]">
              Make English part of your everyday life.
            </h2>
            <Link href={enterHref} className={buttonVariants({ size: "lg" })}>
              {signedIn ? "Continue learning" : "Start Learning"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[320px]">
            <Logo />
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
              A personal English learning space. Private early access, built with care for a small group of learners.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-[14px]">
            <a href="#how" className="text-muted hover:text-fg">How it works</a>
            <a href="#skills" className="text-muted hover:text-fg">Skills</a>
            <a href="#journey" className="text-muted hover:text-fg">Journey</a>
            <a href="#tutor" className="text-muted hover:text-fg">AI tutor</a>
            <Link href={enterHref} className="text-muted hover:text-fg">{signedIn ? "Dashboard" : "Log in"}</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-[1200px] px-5 pb-8 text-[12.5px] text-subtle sm:px-8">© {new Date().getFullYear()} Lingua</div>
      </footer>
    </div>
  );
}
