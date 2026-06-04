# SoundBiteGenerator God-File Analysis

**File:** `packages/oracle-engine/src/sound-bite-generator.ts`  
**Original Size:** 852 lines  
**Status:** Pending decomposition  
**Issue:** [#968](https://github.com/eserlan/Codex-Cryptica/issues/968)  
**Parent Issue:** [#943](https://github.com/eserlan/Codex-Cryptica/issues/943)

## 1. Executive Summary

`sound-bite-generator.ts` owns the full sound bite pipeline end-to-end — from prompt construction through LLM generation, JSON parsing, TTS synthesis, and audio encoding — inside a single file. The file was a natural first-pass extraction, but the accumulation of two TTS backends, a cascading orchestrator, a 140-line voice mapping table, two prompt builders with large constant blocks, a JSON parser, a PCM→WAV encoder, and the main generator class makes it difficult to test or extend any one piece independently.

The refactor should split along the existing internal section headers. The public API of `packages/oracle-engine` (its `index.ts`) must not change.

## 2. Responsibility Inventory

| Lines   | Section                      | Responsibility                                                       |
| ------- | ---------------------------- | -------------------------------------------------------------------- |
| 26–40   | Error classes                | `SoundBiteGenerationError`, `SoundBiteContentPolicyError`            |
| 55–63   | Interfaces                   | `TTSService`, `GenerationOutput` internal types                      |
| 70–144  | `GeminiTTSService`           | Gemini 2.5 Flash TTS HTTP call, base64 decode, PCM unpack            |
| 150–186 | `WebSpeechTTSService`        | Browser SpeechSynthesis fallback, `play()` convenience               |
| 188–330 | `buildGeminiVoiceName`       | Maps `VoiceProfile` → one of 28 Gemini prebuilt voice names          |
| 332–362 | `buildVoiceStyleInstruction` | Builds natural-language style hint for TTS systemInstruction         |
| 364–395 | `applyWebSpeechVoice`        | Applies gender/age rate+pitch to a `SpeechSynthesisUtterance`        |
| 399–433 | Prompt constants             | `MAX_LORE_CHARS`, `AUDIO_TAG_INSTRUCTIONS`, `CONTENT_POLICY_SIGNALS` |
| 444–527 | Prompt builders              | `buildEntityVoicePrompt`, `buildScholarVoicePrompt`                  |
| 531–592 | `parseGenerationOutput`      | JSON cleaning, shape validation, `VoiceProfile` coercion             |
| 596–609 | Logger                       | `SoundBiteLogger` interface + `consoleLogger` default                |
| 613–772 | `SoundBiteGenerator`         | Orchestrates prompt → LLM → parse → TTS → result; retry logic        |
| 776–795 | `CascadingTTSService`        | Tries Gemini, falls back to WebSpeech                                |
| 803–833 | `pcmBytesToWav`              | Pure RIFF/WAV encoder for Gemini PCM output                          |
| 837–852 | Factory + re-exports         | `getSoundBiteGenerator`, convenience re-exports                      |

## 3. Proposed Module Structure

```text
packages/oracle-engine/src/
├── sound-bite-generator.ts           ← SoundBiteGenerator class, errors, logger, factory, re-exports (~120 lines)
├── sound-bite-lm-adapter.ts          ← callWithRetry: stream collection, retry, content-policy detection (~70 lines)
├── tts/
│   ├── gemini-tts-service.ts         ← GeminiTTSService HTTP call + base64 decode (~60 lines)
│   ├── web-speech-tts-service.ts     ← WebSpeechTTSService + applyWebSpeechVoice (~75 lines)
│   ├── cascading-tts-service.ts      ← CascadingTTSService + TTSService interface (~35 lines)
│   └── pcm-to-wav.ts                 ← pcmBytesToWav pure WAV encoder (~35 lines)
├── voice-mapping.ts                  ← buildGeminiVoiceName + buildVoiceStyleInstruction (~145 lines)
├── prompt-builders.ts                ← both prompt fns + AUDIO_TAG_INSTRUCTIONS + MAX_LORE_CHARS (~95 lines)
└── response-parser.ts               ← parseGenerationOutput + GenerationOutput interface (~65 lines)
```

**Target size for `sound-bite-generator.ts` after decomposition:** ~120 lines.  
**Total modules:** 9 (vs 1 today).

## 4. Extraction Notes

### `sound-bite-lm-adapter.ts`

`_callTextGeneration` (currently private on `SoundBiteGenerator`) does three distinct things: collects a streaming response, detects content-policy refusals, and retries with a stricter prompt. Extract it as a standalone `callWithRetry(textGeneration, apiKey, prompt, modelName, options, logger): Promise<string>`. `CONTENT_POLICY_SIGNALS` moves here — it's a detection concern, not a prompt-building one. The orchestrator calls it as a black box, making the retry behaviour independently testable.

### `sound-bite-generator.ts` (residual)

After `callWithRetry` is extracted, `SoundBiteGenerator.generateSoundBite` becomes: build prompt → `callWithRetry` → `parseGenerationOutput` → synthesize → return. Errors, logger, and the factory stay here — they're small and tightly coupled to the orchestrator, and a separate 20-line file for each adds import hops with no testability gain.

### `tts/pcm-to-wav.ts`

`pcmBytesToWav` is a pure function with a testable byte-layout contract (RIFF header fields at known offsets). Separating it from `GeminiTTSService` means WAV encoding is testable without mocking `fetch`.

### `tts/gemini-tts-service.ts`

After `pcmBytesToWav` moves out, this is just the Gemini HTTP call + base64 decode + one call to `pcmBytesToWav`. ~60 lines, testable with a mocked `fetch`.

### `tts/web-speech-tts-service.ts`

`WebSpeechTTSService` and `applyWebSpeechVoice` stay together — `applyWebSpeechVoice` is only called here.

### `tts/cascading-tts-service.ts`

`CascadingTTSService` (25 lines) is small enough to host the `TTSService` interface alongside it, keeping the interface co-located with its primary consumer rather than in a 10-line file of its own.

### `voice-mapping.ts`

`buildGeminiVoiceName` and `buildVoiceStyleInstruction` share the same `VoiceProfile` input type and domain. At 145 lines combined they're manageable together, and splitting at 35 lines would be fragmentation without clarity. The decision table is already the right unit of decomposition.

### `prompt-builders.ts`

`AUDIO_TAG_INSTRUCTIONS` and `MAX_LORE_CHARS` are only used by the two prompt builder functions, so they stay here rather than in a separate constants file. Extracting constants to their own file is warranted when they cross module boundaries; these don't.

### `response-parser.ts`

`parseGenerationOutput` is a pure function: `(raw: string, voiceMode) → GenerationOutput | throws`. `GenerationOutput` lives here as the only type the parser produces.

## 5. Acceptance Criteria

- [ ] All public exports remain importable from `packages/oracle-engine` (no changes to `index.ts` public surface)
- [ ] `sound-bite-generator.ts` is ≤ 130 lines post-decomposition
- [ ] Each new module has a corresponding test file
- [ ] Existing tests pass unchanged
- [ ] `pcmBytesToWav` has a unit test covering the RIFF header byte layout at known offsets
- [ ] `buildGeminiVoiceName` has tests covering male/female/neutral × all ageRange defaults and representative tone patterns
- [ ] `callWithRetry` in `sound-bite-lm-adapter.ts` has tests for: empty response, content-policy signal, retry success, retry failure
