"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Clock, Layers, Pause, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store/store";
import { IntakeWizard } from "@/components/placement/intake";
import { Runner } from "@/components/placement/runner";
import { ResultView } from "@/components/placement/result";
import { ERROR_TEXT, PlacementError, placementApi, type Overview } from "@/components/placement/api";
import type { Answer, Intake, SectionId } from "@/lib/placement/types";

const FULL_ORDER: SectionId[] = ["vocabulary", "grammar", "reading", "listening", "writing", "speaking"];

export function PlacementView() {
  const { state, actions } = useStore();
  const reduce = useReducedMotion();
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [screen, setScreen] = React.useState<"auto" | "welcome" | "intake">("auto");
  const [intakeInitial, setIntakeInitial] = React.useState<Partial<Intake> | undefined>();

  const load = React.useCallback(async () => {
    try {
      setOverview(await placementApi.get());
      setLoadError(null);
    } catch (e) {
      setLoadError(ERROR_TEXT[(e as PlacementError).code] ?? "Не удалось загрузить диагностику.");
    }
  }, []);
  React.useEffect(() => {
    void load();
  }, [load]);

  const current = overview?.current ?? null;
  const inProgress = current?.status === "in_progress";

  const start = async (intake: Intake) => {
    setBusy(true);
    setError(null);
    try {
      const o = await placementApi.start(intake);
      if (intake.name && intake.name !== state.settings.displayName) actions.updateSettings({ displayName: intake.name });
      setOverview(o);
      setScreen("auto");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(ERROR_TEXT[(e as PlacementError).code] ?? "Не удалось начать. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const answer = async (a: Omit<Answer, "seq">) => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const o = await placementApi.answer(current.id, { ...a, seq: current.seq });
      setOverview(o);
      if (o.current?.status === "completed") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    } catch (e) {
      const err = e as PlacementError;
      setError(ERROR_TEXT[err.code] ?? "Не удалось сохранить ответ. Попробуйте ещё раз.");
      if (err.overview) setOverview(err.overview);
    } finally {
      setBusy(false);
    }
  };

  const restart = async (initial?: Partial<Intake>) => {
    if (inProgress && current) {
      if (!window.confirm("Начать диагностику заново? Текущие ответы останутся в истории, но результат не будет посчитан.")) return;
      setBusy(true);
      try {
        setOverview(await placementApi.abandon(current.id));
      } catch {
        /* ignore — start will close it anyway */
      } finally {
        setBusy(false);
      }
    }
    setIntakeInitial(initial ?? current?.intake);
    setScreen("intake");
    window.scrollTo({ top: 0 });
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-[520px] py-20 text-center">
        <p className="text-[16px] text-muted">{loadError}</p>
        <Button className="mt-6" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }
  if (!overview) return <div className="py-24 text-center text-[14px] text-subtle">Загружаем диагностику…</div>;

  if (screen === "intake") {
    return (
      <div className="py-4 sm:py-8">
        <IntakeWizard
          defaultName={state.settings.displayName !== "Ученик" ? state.settings.displayName : undefined}
          initial={intakeInitial}
          onStart={start}
          busy={busy}
          error={error}
        />
      </div>
    );
  }

  if (inProgress && current) {
    return (
      <div className="py-2 sm:py-4">
        <Runner view={current} order={current.mode === "zero" ? ["zero"] : current.mode === "recheck" ? ["grammar", "reading"] : FULL_ORDER} busy={busy} error={error} onAnswer={answer} onRestart={() => void restart()} />
      </div>
    );
  }

  if (current?.status === "completed" && current.result && screen !== "welcome") {
    return (
      <div className="py-4 sm:py-8">
        <ResultView
          result={current.result}
          completedAt={current.completedAt}
          canRestart={overview.canStart}
          pilotEarlyRetake={overview.pilotEarlyRetake}
          retestAfter={overview.retestAfter}
          onRestart={() => void restart()}
          onDispute={async (direction, comment) => {
            try {
              const o = await placementApi.dispute(current.id, direction, comment);
              setOverview(o);
              window.scrollTo({ top: 0 });
              return o.dispute?.message ?? null;
            } catch (e) {
              return ERROR_TEXT[(e as PlacementError).code] ?? "Не удалось отправить. Попробуйте ещё раз.";
            }
          }}
          onEvaluateWriting={async () => {
            try {
              setOverview(await placementApi.evaluateWriting(current.id));
              return null;
            } catch (e) {
              const err = e as PlacementError;
              return err.code === "not_configured" ? "AI-оценка письма сейчас недоступна — текст сохранён и будет проверен специалистом." : err.code === "budget" || err.code === "rate_limited" ? "Лимит AI на сегодня исчерпан — оценка появится позже." : "Не удалось оценить письмо. Обновите страницу позже.";
            }
          }}
          onFullMode={() => void restart({ ...current.intake, experience: "some", selfLevel: "A1" })}
        />
      </div>
    );
  }

  // Welcome
  return (
    <div className="mx-auto max-w-[920px] py-6 sm:py-12">
      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}>
        <p className="text-[12px] font-medium tracking-[0.16em] text-accent-soft uppercase">Входная диагностика</p>
        <h1 className="mt-4 max-w-[14ch] text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-[68px]">С чего начнётся ваш английский</h1>
        <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-muted">
          Несколько разделов, которые подстраиваются под ваши ответы. В конце — ориентировочный уровень, профиль навыков, пробелы и стартовый
          маршрут: что можно пропустить, что повторить и в каком темпе идти.
        </p>
      </motion.div>
      <motion.dl
        className="mt-12 grid grid-cols-2 border-t border-line sm:grid-cols-4"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {[
          { icon: Clock, k: "25–40 мин", v: "полная версия; с нуля — 5 мин" },
          { icon: Layers, k: "6 разделов", v: "словарь, грамматика, чтение, аудирование, письмо, речь" },
          { icon: Sparkles, k: "Адаптивно", v: "сложность меняется после каждого блока" },
          { icon: Pause, k: "Пауза", v: "продолжить можно в течение 48 часов" },
        ].map(({ icon: Icon, k, v }) => (
          <div key={k} className="border-b border-line py-6 pr-4 odd:border-r odd:pr-6 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0">
            <Icon className="size-4 text-accent-soft" aria-hidden />
            <dt className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-fg">{k}</dt>
            <dd className="mt-1 text-[13px] leading-snug text-subtle">{v}</dd>
          </div>
        ))}
      </motion.dl>
      <div className="mt-10 rounded-2xl border border-line bg-surface p-5 text-[14px] leading-relaxed text-muted">
        Это пилотная версия. Результат — ориентировочная внутренняя оценка LINGUA, а не сертификат CEFR. Письмо сохраняется для будущей проверки,
        устная речь пока не проводится — эти навыки будут честно отмечены как неоценённые.
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button size="lg" onClick={() => setScreen("intake")}>
          Начать знакомство <ArrowRight />
        </Button>
        {current?.status === "completed" && (
          <Button variant="ghost" size="lg" onClick={() => setScreen("auto")}>
            Вернуться к результату
          </Button>
        )}
      </div>
    </div>
  );
}
