# Voice & AI providers — research (checked 2026-11-27)

Only facts read on the providers' official pages on that date are stated as facts. Anything not found is marked **not confirmed**.

## 1. Groq (current AI provider)

| Item | Fact | Source |
|---|---|---|
| openai/gpt-oss-120b | $0.15 in / $0.60 out per 1M tokens; context 131,072; max completion 65,536; production | console.groq.com/docs/models |
| openai/gpt-oss-20b | $0.075 in / $0.30 out per 1M tokens; same limits; production | same |
| Speech-to-text | whisper-large-v3 $0.111 / audio hour; whisper-large-v3-turbo $0.04 / audio hour; files up to 100 MB; production | same |
| Text-to-speech | canopylabs/orpheus-v1-english $22 per 1M characters — **preview** ("may be discontinued at short notice") | same |
| Rate limits (Developer plan page) | gpt-oss: 30 RPM / 1K RPD / 8K TPM / 200K TPD; whisper: 20 RPM / 2K RPD; Orpheus: 10 RPM / 100 RPD. The models table shows higher numbers — the two pages disagree; the org's Limits page is authoritative | console.groq.com/docs/rate-limits |
| Data | Inference inputs/outputs not retained by default; may be logged up to 30 days for reliability/abuse unless Zero Data Retention is enabled in Data Controls (available to all customers); stored in GCP, United States | console.groq.com/docs/your-data |
| Training | Services Agreement §4.2: Groq may not use Inputs/Outputs to train models without permission | console.groq.com/docs/legal/services-agreement |
| Age / minors | Account holder must be 18+; the services "are not for consumer use"; §6.3: the customer is solely responsible for compliance with laws on users under the age of majority and their personal data | same |
| Transfers | DPA: processing in the US and sub-processor countries; EU/UK SCCs; 72 h breach notice | console.groq.com/docs/legal/customer-data-processing-addendum |

**Actions for the owner:** enable **Zero Data Retention** in Groq Console → Data Controls; keep the pilot to **adult learners (18+)** until a legal review covers minors (152-FZ / GDPR-K / COPPA depending on the country of launch).

## 2. Options per voice capability

| Capability | Option | Quality / latency | Cost (confirmed) | Privacy | Verdict |
|---|---|---|---|---|---|
| **STT** | Groq whisper-large-v3-turbo | Strong on non-native English; fast | $0.04 / hour | Same Groq terms; ZDR available; US | **Best first choice** (same vendor, cheapest confirmed) |
| | Browser Web Speech recognition | Varies; Chrome sends audio to Google | free | Not on-device; vendor terms not ours | Not used |
| | Azure Speech STT | Strong | prices **not confirmed** (page rendered none); free tier 5 h/month | Real-time audio not stored at rest | Alternative |
| **TTS** | Browser speech synthesis (now) | Robotic, device-dependent | free | On-device | Keep as fallback |
| | Groq Orpheus (English) | Natural voices | $22 / 1M characters (preview) | Groq terms | Good for pre-generated listening audio; preview status is a risk |
| | Azure Neural TTS | Natural, many voices/accents | free tier 0.5M chars/month; paid **not confirmed** | Azure terms | Alternative for accents (US/UK) |
| **Voice dialogue** | STT (Whisper) → tutor (gpt-oss) → TTS | ~1–3 s per turn (estimate, not measured) | sum of the parts | Audio discarded after transcription | Feasible turn-based; no realtime streaming needed for A1–B1 |
| **Pronunciation** | Azure Pronunciation Assessment | Real phoneme/word accuracy, fluency, completeness; prosody en-US only; scripted (reference text) and unscripted | billed like standard STT — price **not confirmed** | Data not retained (Microsoft page) | **Only option found that truly assesses pronunciation** |
| | Whisper transcript comparison | — | — | — | **Not pronunciation assessment** — must not be presented as such |
| **Natural listening audio** | Pre-generate scripts once (Orpheus or Azure Neural) and store the MP3 files as content | Natural; zero latency at runtime | one-off: e.g. 8 placement scripts ≈ 15K characters ≈ $0.33 on Orpheus | No learner data involved | **Recommended** — content audio, not per-learner |

## 3. Recommendation (needs the owner's approval before connecting anything paid)

1. **Now (free):** keep browser TTS; voice input off.
2. **Pilot step 1:** pre-generate listening audio with Groq Orpheus (one-off, cents) — improves placement listening validity.
3. **Pilot step 2:** STT with Groq whisper-large-v3-turbo for spoken answers (consent, audio deleted after transcription — `VOICE_POLICY.retainRawAudio = false`), budget limit in `content/ai/limits.json`.
4. **Pronunciation:** Azure Pronunciation Assessment after checking current prices in the Azure portal and a legal review; until then pronunciation stays "не оценено".
5. Before any of this for under-18 learners: legal review (not done).
