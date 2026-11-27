/**
 * Voice data policy. Defaults are the strict ones; changing them is an owner decision (16 §11).
 */
export const VOICE_POLICY = {
  /** Raw recordings are discarded right after processing (only transcripts/evaluations may be kept). */
  retainRawAudio: false,
  /** Days a raw recording may be kept if retention is ever enabled (owner decision, PRV-3). */
  rawAudioRetentionDays: 0,
  /** Recording requires an explicit consent of kind "voice_recording" (learner_consents). */
  requiresConsent: true,
  /** Recordings are never used to train models without a separate consent (PRV-4). */
  allowModelTraining: false,
  /** Pronunciation scores are shown only from a real assessor — never simulated. */
  simulatePronunciation: false,
} as const;

/** A provider may be used only when it runs on-device, or its processing terms were reviewed. */
export function providerAllowed(info: { processing: "on-device" | "external"; dataProcessingReviewed: boolean }) {
  return info.processing === "on-device" || info.dataProcessingReviewed;
}
