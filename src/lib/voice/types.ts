/**
 * Voice architecture (docs/curriculum/16 §6, 08 §6). Interfaces only + on-device TTS.
 * Speech recognition, pronunciation assessment and voice conversation need external services;
 * none is enabled until its data-processing terms and the legal requirements are reviewed (PRV-8).
 */

export interface VoiceProviderInfo {
  id: string;
  label: string;
  /** Where audio or text is processed. */
  processing: "on-device" | "external";
  /** True only after the provider's data-processing terms and retention were reviewed and approved by the owner. */
  dataProcessingReviewed: boolean;
  /** Does the provider store audio on its side? (must be "no" or contractually limited) */
  retainsAudio: "no" | "limited" | "unknown";
}

export interface TextToSpeech {
  info: VoiceProviderInfo;
  available(): boolean;
  speak(text: string, opts?: { rate?: number; voiceHint?: "a" | "b"; onEnd?: () => void }): void;
  stop(): void;
}

export interface Transcript {
  text: string;
  /** 0..1 as reported by the engine; null when the engine gives none. */
  confidence: number | null;
  durationSec: number;
  words?: { word: string; startSec: number; endSec: number; confidence?: number }[];
}

export interface SpeechToText {
  info: VoiceProviderInfo;
  available(): boolean;
  /**
   * Transcribe one recording. Implementations must not persist the raw audio (policy.retainRawAudio = false):
   * audio is processed and discarded; only the transcript is returned.
   */
  transcribe(audio: Blob, opts: { language: "en"; hint?: string }): Promise<Transcript>;
}

export interface PronunciationResult {
  /** Intelligibility on the CV Phonological control idea: understood / partly / not understood. */
  intelligibility: "understood" | "partly" | "not_understood";
  /** Sounds that hindered understanding, e.g. "/θ/", "/w–v/". */
  focusSounds: string[];
  confidence: "low" | "medium" | "high";
}

export interface PronunciationAssessor {
  info: VoiceProviderInfo;
  available(): boolean;
  assess(audio: Blob, target: { text: string; focus?: string[] }): Promise<PronunciationResult>;
}

/** Speaking practice session: turn-based, audio in → transcript → tutor reply (text, optionally TTS). */
export interface ConversationSession {
  start(opts: { lessonId: string; blockId: string }): Promise<void>;
  sendTurn(audio: Blob): Promise<{ transcript: Transcript; reply: string }>;
  end(): Promise<{ turns: number; speechSec: number }>;
}
