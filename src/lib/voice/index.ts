"use client";

import type { PronunciationAssessor, SpeechToText, TextToSpeech, VoiceProviderInfo } from "./types";

export * from "./types";
export { VOICE_POLICY, providerAllowed } from "./policy";

/** On-device TTS through the browser's speech synthesis. Text never leaves the device by our doing. */
export const browserTTS: TextToSpeech = {
  info: { id: "browser-tts", label: "Синтез речи браузера", processing: "on-device", dataProcessingReviewed: true, retainsAudio: "no" },
  available: () => typeof window !== "undefined" && "speechSynthesis" in window,
  speak(text, opts = {}) {
    if (!this.available()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
    const v = voices[opts.voiceHint === "b" ? 1 : 0] ?? voices[0];
    if (v) u.voice = v;
    u.lang = v?.lang ?? "en-GB";
    u.rate = opts.rate ?? 0.95;
    u.onend = () => opts.onEnd?.();
    synth.speak(u);
  },
  stop() {
    if (this.available()) window.speechSynthesis.cancel();
  },
};

/**
 * The browser's Web Speech *recognition* is NOT on-device in most browsers (Chrome sends audio to Google).
 * It is therefore treated as an external service and stays disabled until reviewed.
 */
export const CANDIDATE_STT: VoiceProviderInfo[] = [];
const browserSTTInfo: VoiceProviderInfo = { id: "web-speech-recognition", label: "Распознавание речи браузера", processing: "external", dataProcessingReviewed: false, retainsAudio: "unknown" };

/** No STT / pronunciation provider is connected yet. These report "unavailable" — nothing is simulated. */
CANDIDATE_STT.push(browserSTTInfo);
export const speechToText: SpeechToText | null = null;
export const pronunciation: PronunciationAssessor | null = null;

export function voiceCapabilities() {
  return {
    tts: browserTTS.available(),
    stt: speechToText?.available() ?? false,
    pronunciation: pronunciation?.available() ?? false,
    note: "Распознавание речи и оценка произношения подключатся после проверки условий обработки данных у провайдера.",
  };
}
