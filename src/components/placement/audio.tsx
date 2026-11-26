"use client";

import * as React from "react";
import { Headphones, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Plays a listening script with the browser's own speech synthesis (on-device; nothing is sent anywhere).
 * Two speakers get different voices or pitch. The number of plays is limited per testlet (14 §4.4).
 * The play count is remembered per testlet in sessionStorage so a reload doesn't reset it.
 */
export function ScriptPlayer({
  testletId,
  lines,
  rate,
  maxPlays,
  onUnavailable,
}: {
  testletId: string;
  lines: { speaker: string; text: string }[];
  rate: number;
  maxPlays: number;
  onUnavailable?: () => void;
}) {
  const key = `lingua:placement:plays:${testletId}`;
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [plays, setPlays] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [line, setLine] = React.useState(-1);

  React.useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
    setSupported(ok);
    if (!ok) onUnavailable?.();
    try {
      setPlays(Number(sessionStorage.getItem(key) ?? 0) || 0);
    } catch {
      /* storage unavailable */
    }
    return () => {
      if (ok) window.speechSynthesis.cancel();
    };
  }, [key, onUnavailable]);

  const play = () => {
    if (!supported || playing || plays >= maxPlays) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
    const pick = (i: number) => voices.filter((v) => /gb|uk/i.test(v.lang))[i] ?? voices[i] ?? voices[0];
    const speakers = Array.from(new Set(lines.map((l) => l.speaker)));
    const n = plays + 1;
    setPlays(n);
    try {
      sessionStorage.setItem(key, String(n));
    } catch {
      /* ignore */
    }
    setPlaying(true);
    lines.forEach((l, i) => {
      const u = new SpeechSynthesisUtterance(l.text);
      const si = speakers.indexOf(l.speaker);
      const v = pick(si);
      if (v) u.voice = v;
      u.lang = v?.lang ?? "en-GB";
      u.rate = rate;
      u.pitch = si === 1 ? 0.85 : si === 2 ? 1.15 : 1;
      u.onstart = () => setLine(i);
      if (i === lines.length - 1) {
        u.onend = () => {
          setPlaying(false);
          setLine(-1);
        };
        u.onerror = () => {
          setPlaying(false);
          setLine(-1);
        };
      }
      synth.speak(u);
    });
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setLine(-1);
  };

  if (supported === false) {
    return (
      <div className="rounded-xl border border-line bg-card p-5 text-[14px] leading-relaxed text-muted">
        Этот браузер не умеет озвучивать текст. Раздел можно пропустить — аудирование останется неоценённым.
      </div>
    );
  }

  const left = maxPlays - plays;
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={playing ? stop : play}
          disabled={!playing && left <= 0}
          aria-label={playing ? "Остановить" : "Прослушать"}
          className={cn(
            "relative flex size-14 shrink-0 items-center justify-center rounded-full transition-colors",
            playing ? "bg-accent text-on-accent" : left > 0 ? "bg-primary text-on-primary hover:bg-primary-hover" : "bg-elevated text-subtle",
          )}
        >
          {playing && <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" aria-hidden />}
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </button>
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-fg">{playing ? "Звучит запись…" : left > 0 ? "Прослушайте запись" : "Прослушивания закончились"}</p>
          <p className="text-[13px] text-subtle">
            {left > 0 ? `Осталось прослушиваний: ${left} из ${maxPlays}` : "Отвечайте по тому, что запомнили"}
            {playing && line >= 0 && lines.length > 1 ? ` · реплика ${line + 1} из ${lines.length}` : ""}
          </p>
        </div>
        <Headphones className="ml-auto hidden size-5 text-subtle sm:block" aria-hidden />
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-subtle">
        Пилот: озвучивает синтезированный голос вашего устройства, поэтому результат аудирования отмечается как предварительный.
      </p>
    </div>
  );
}
