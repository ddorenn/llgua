"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PronounceButton } from "@/components/vocab/word-card";
import { useStore } from "@/lib/store/store";
import { checkInput } from "@/lib/placement/scoring";
import { dailyQueue, newItem, SRS, stats, wordId } from "@/lib/srs";
import type { SrsItem } from "@/lib/store/types";
import { cn, plural } from "@/lib/utils";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Today's review: typed recall (Russian → English for words; fix-the-mistake for errors). */
export function SrsSession({ items, onExit }: { items: SrsItem[]; onExit: () => void }) {
  const { actions } = useStore();
  const reduce = useReducedMotion();
  const [list] = React.useState(items);
  const [i, setI] = React.useState(0);
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState<null | boolean>(null);
  const [score, setScore] = React.useState({ ok: 0, miss: 0 });
  const it = list[i];
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => ref.current?.focus(), [i]);

  if (!it) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <p className="text-[14px] text-muted">Повторение на сегодня завершено</p>
        <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.03em] text-fg">
          Верно {score.ok} из {list.length}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {score.miss
            ? `${score.miss} ${plural(score.miss, "элемент вернётся", "элемента вернутся", "элементов вернутся")} завтра. Остальные — позже, по интервалам 1–3–7–14–30–60 дней.`
            : "Всё вспомнилось. Следующие повторения — по интервалам 1–3–7–14–30–60 дней."}
        </p>
        <Button className="mt-8" onClick={onExit}>
          К словарю
        </Button>
      </div>
    );
  }

  const correctAnswer = it.kind === "word" ? it.front : it.back;
  const answer = (ok: boolean) => {
    actions.srsReview(it.id, ok);
    setResult(ok);
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), miss: s.miss + (ok ? 0 : 1) }));
  };
  const next = () => {
    setResult(null);
    setText("");
    setI((x) => x + 1);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <div className="flex items-center justify-between text-[13px] text-subtle">
        <span>
          {i + 1} из {list.length} · {it.kind === "word" ? "слово" : "ваша ошибка"}
        </span>
        <button type="button" onClick={onExit} className="hover:text-fg">
          Завершить
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <motion.div className="h-full bg-accent" initial={false} animate={{ width: `${(i / list.length) * 100}%` }} transition={{ duration: 0.4, ease: EASE }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={it.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <p className="text-[12px] font-medium tracking-[0.14em] text-subtle uppercase">{it.kind === "word" ? "Как по-английски?" : "Исправьте ошибку"}</p>
          <p className={cn("mt-3 text-[26px] leading-snug text-fg", it.kind === "error" && "lang")}>{it.kind === "word" ? it.back : it.front}</p>
          {it.source.label && <p className="mt-2 text-[12.5px] text-subtle">{it.source.type === "lesson" ? `из занятия «${it.source.label}»` : it.source.label}</p>}
          {result === null ? (
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) answer(checkInput(text, [correctAnswer]));
              }}
            >
              <input
                ref={ref}
                value={text}
                onChange={(e) => setText(e.target.value)}
                lang="en"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Ответ"
                placeholder="Ответ по-английски"
                className="lang h-12 flex-1 rounded-xl border border-line bg-surface px-4 text-[18px] text-fg outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-subtle focus:border-accent"
              />
              <div className="flex gap-2">
                <Button type="submit" size="lg" disabled={!text.trim()}>
                  Проверить
                </Button>
                <Button variant="ghost" size="lg" onClick={() => answer(false)}>
                  Не помню
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6">
              <p className={cn("flex items-center gap-2 text-[15px] font-medium", result ? "text-success" : "text-danger")}>
                {result ? <Check className="size-4" /> : <X className="size-4" />} {result ? "Верно" : "Правильно так:"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="lang text-[22px] text-fg">{correctAnswer}</p>
                <PronounceButton text={correctAnswer} />
              </div>
              {(it.example || it.note) && <p className={cn("mt-2 text-[14.5px] text-muted", it.example && "lang italic")}>{it.example ?? it.note}</p>}
              <Button className="mt-5" onClick={next} autoFocus>
                Дальше <ArrowRight />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Overview: today's queue, personal words, mistakes history, adding a word manually. */
export function SrsOverview({ onStart }: { onStart: (items: SrsItem[]) => void }) {
  const { state, actions } = useStore();
  const items = state.srs ?? {};
  const queue = dailyQueue(items);
  const s = stats(items);
  const words = Object.values(items).filter((i) => i.kind === "word").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const errors = Object.values(items).filter((i) => i.kind === "error").sort((a, b) => b.lapses - a.lapses || b.updatedAt.localeCompare(a.updatedAt));
  const [tab, setTab] = React.useState<"words" | "errors">("words");
  const [w, setW] = React.useState("");
  const [t, setT] = React.useState("");
  const [ex, setEx] = React.useState("");

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-end">
        <div className="rounded-xl border border-line bg-card p-6 shadow-lift">
          <p className="text-[13.5px] text-muted">{queue.length ? "Повторение на сегодня" : s.total ? "На сегодня всё повторено" : "Банк повторения пока пуст"}</p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-fg">
            {queue.length} {plural(queue.length, "элемент", "элемента", "элементов")}
          </p>
          <p className="mt-1 text-[13px] text-subtle">
            Слова из занятий и ваши ошибки. До {SRS.newPerDay} новых и {SRS.reviewsPerDay} повторений в день.
          </p>
          <Button className="mt-5" onClick={() => onStart(queue)} disabled={!queue.length}>
            Начать повторение
          </Button>
        </div>
        <dl className="grid grid-cols-4 gap-4">
          {[
            ["Всего", s.total],
            ["К повтору", s.dueToday],
            ["Закреплено", s.learned],
            ["Ошибок", s.errors],
          ].map(([k, v]) => (
            <div key={k as string} className="border-t-2 border-line pt-3">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="tabular mt-1 text-[26px] font-semibold tracking-[-0.03em] text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {s.retention7d != null && <p className="-mt-4 text-[13px] text-subtle">Верных ответов в повторении за 7 дней: {Math.round(s.retention7d * 100)}%.</p>}

      <div className="rounded-2xl border border-line bg-card">
        <div className="flex gap-1 border-b border-line px-3 pt-3">
          {(
            [
              ["words", `Мои слова · ${words.length}`],
              ["errors", `Мои ошибки · ${errors.length}`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("rounded-t-lg border-b-2 px-3 pb-2.5 text-[14px] transition-colors", tab === k ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")}>
              {label}
            </button>
          ))}
        </div>
        {tab === "words" ? (
          <div className="p-4 sm:p-5">
            <form
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!w.trim() || !t.trim()) return;
                actions.srsAdd([newItem({ id: wordId(w), kind: "word", front: w.trim(), back: t.trim(), example: ex.trim() || undefined, source: { type: "manual", label: "добавлено вручную" } })]);
                setW("");
                setT("");
                setEx("");
              }}
            >
              <Input value={w} onChange={(e) => setW(e.target.value)} placeholder="Слово (англ.)" aria-label="Слово" lang="en" />
              <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Перевод" aria-label="Перевод" />
              <Input value={ex} onChange={(e) => setEx(e.target.value)} placeholder="Пример (необязательно)" aria-label="Пример" lang="en" />
              <Button type="submit" variant="secondary" disabled={!w.trim() || !t.trim()}>
                <Plus /> Добавить
              </Button>
            </form>
            {words.length === 0 ? (
              <p className="mt-4 text-[14px] text-subtle">Слова появятся здесь, когда вы добавите их из занятия кнопкой «В мой словарь» или вручную.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {words.map((it) => (
                  <ItemRow key={it.id} it={it} onRemove={() => actions.srsRemove(it.id)} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            {errors.length === 0 ? (
              <p className="text-[14px] text-subtle">Ошибки из занятий будут попадать сюда автоматически и возвращаться в повторение.</p>
            ) : (
              <ul className="divide-y divide-line">
                {errors.map((it) => (
                  <ItemRow key={it.id} it={it} onRemove={() => actions.srsRemove(it.id)} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ItemRow({ it, onRemove }: { it: SrsItem; onRemove: () => void }) {
  const last = it.history.slice(-8);
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-fg">
          <span className="lang">{it.front}</span> <span className="text-subtle">→</span> <span className={cn(it.kind === "error" && "lang")}>{it.back}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-subtle">
          {it.step < 0 ? "новое" : `следующее повторение ${new Date(it.due + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`}
          {it.lapses > 0 && ` · ошибок: ${it.lapses}`}
          {it.source.label && ` · ${it.source.label}`}
        </p>
      </div>
      <span className="hidden items-center gap-0.5 sm:flex" aria-label="История ответов">
        {last.map((h, i) => (
          <span key={i} className={cn("size-1.5 rounded-full", h.ok ? "bg-success" : "bg-danger")} />
        ))}
      </span>
      <button type="button" onClick={onRemove} aria-label="Удалить из повторения" className="rounded-md p-1.5 text-subtle hover:bg-elevated hover:text-fg">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
