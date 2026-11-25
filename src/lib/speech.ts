"use client";

/**
 * Browser speech helpers.
 * - speak(): Web Speech API text-to-speech (preview only — quality depends on the OS voices).
 * Future: replace with a TTS provider and real audio files (see docs/ARCHITECTURE.md → Audio).
 */
export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (!ttsSupported()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = opts.rate ?? 0.95;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en-GB")) ?? window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
