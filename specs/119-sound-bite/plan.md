# Implementation Plan: Sound Bite

**Branch**: `119-sound-bite` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/119-sound-bite/spec.md`
**Status**: Implemented — PR #897 → staging

## Summary

Add AI-narrated sound bite generation to every entity using Gemini 2.5 Flash TTS. Audio is persisted locally in OPFS. Users launch the feature from a new button in both the sidebar entity header and Zen Mode header, which opens a global `SoundBiteModal` (bottom sheet on mobile, centred card on desktop). Voice selection covers 28 Gemini prebuilt voices mapped via tone-keyword logic. The Cloudflare Worker oracle proxy translates camelCase `speechConfig` fields to the snake_case format required by the Google REST API.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace
**Primary Dependencies**: Svelte 5, `@google/generative-ai`, `oracle-engine`, Cloudflare Workers (oracle-proxy), OPFS
**Storage**: OPFS for audio files (`audio/{entityId}_soundbite.wav`); entity `soundBite` metadata in IndexedDB via existing vault stores
**Testing**: Vitest unit tests for oracle-engine voice mapping and TTS service; Svelte controller tests for SoundBiteService OPFS integration
**Target Platform**: Browser PWA on desktop, tablet, and phone-sized mobile viewports
**Project Type**: Bun workspace — `packages/oracle-engine` (TTS logic) + `apps/web` (UI/service) + `apps/workers/oracle-proxy` (Cloudflare Worker)
**Performance Goals**: TTS generation completes within 30 seconds under normal network conditions; OPFS read/write is non-blocking
**Constraints**: Privacy-first (no audio server storage), guest safety boundary, 28-voice limit, proxy must translate all Gemini config fields
**Scale/Scope**: One new oracle-engine service, one new web service, one new modal, two header button additions, one proxy fix

## Constitution Check

_Verified against project constitution at implementation time._

- **Library-First**: PASS. TTS logic and voice mapping live in `packages/oracle-engine`; UI and OPFS orchestration live in `apps/web`.
- **TDD**: PASS. Voice mapper and TTS service have dedicated unit tests; SoundBiteService has integration tests.
- **Simplicity & YAGNI**: PASS. No new external dependencies beyond the existing `@google/generative-ai`; modal reuses existing theme tokens and layout patterns.
- **AI-First Extraction**: PASS. Sound bite generation complements entity extraction without altering it.
- **Privacy & Client-Side Processing**: PASS. Audio is generated remotely in a single TTS call; stored locally in OPFS; never uploaded to any server.
- **Clean Implementation**: PASS. `{#key entityId}` forces clean modal remount; action handlers guard on live entity only; proxy fix prevents empty `speech_config` objects.
- **User Documentation**: PASS. Quickstart documents voice modes, tone tags, save/delete, and guest limitations.
- **Dependency Injection**: PASS. `SoundBiteService` accepts injected vault and OPFS handles; `GeminiTTSService` accepts injected API key and model config.
- **Natural Language**: PASS. UI uses "Generate", "Save", "Delete", "Play"; error messages are plain.
- **Quality & Coverage**: PASS. PR code-reviewed at high effort (3 angles × 6 candidates); all 7 findings addressed before merge.
- **Agent Operational Protocol**: PASS. Scope is bounded to sound bite generation; no structural changes to vault schema beyond `soundBite` entity field.
- **Terminology Unification**: PASS. "Sound Bite" used consistently throughout UI, code, and docs.

## Project Structure

### Documentation (this feature)

```text
specs/119-sound-bite/
|-- spec.md
|-- plan.md
|-- tasks.md
|-- research.md         (voice mapping exploration, Gemini TTS API research)
`-- quickstart.md       (user-facing: how to generate, voices, save/delete)
```

### Source Code (repository root)

```text
packages/oracle-engine/src/
|-- sound-bite-generator.ts    ← GeminiTTSService, WebSpeechTTSService, voice mapper
`-- sound-bite-generator.test.ts

apps/web/src/lib/
|-- services/
|   `-- SoundBiteService.svelte.ts      ← reactive service: generation, OPFS, playback
|-- components/
|   |-- entity-detail/
|   |   |-- DetailHeader.svelte          ← sound bite button added
|   |   `-- DetailSoundBite.svelte       ← modal content component
|   |-- zen/
|   |   `-- ZenHeader.svelte             ← sound bite button added
|   `-- modals/
|       |-- SoundBiteModal.svelte        ← global modal wrapper
|       `-- GlobalModalProvider.svelte   ← lazy-loads SoundBiteModal
|-- stores/ui/
|   `-- modal-ui.svelte.ts              ← soundBite state + open/closeSoundBite()

apps/workers/oracle-proxy/src/
`-- index.ts    ← speechConfig → speech_config translation added
```

## Architecture

### Layer Overview

```
User Action (header button click)
  ↓
modalUIStore.openSoundBite(entityId)
  ↓
SoundBiteModal (GlobalModalProvider lazy-loads on first show)
  ↓  {#key entityId} forces remount on entity change
DetailSoundBite (modal content — voice picker + player + controls)
  ↓
SoundBiteService (reactive service — orchestration)
  ├── GeminiTTSService (oracle-engine — builds & sends TTS request)
  │     ↓
  │   oracle proxy (Cloudflare Worker — translates & forwards)
  │     ↓
  │   Google Gemini generateContent API (TTS)
  │     ↓
  │   audio bytes (base64 WAV)
  └── OPFS (persists audio/{entityId}_soundbite.wav)
       ↓
  Entity record update (vault.updateEntity — soundBite metadata)
```

### Key Design Decisions

**1. Modal-first UX**
`DetailSoundBite` is no longer inlined in the entity detail panel. It lives exclusively inside `SoundBiteModal`, launched via `modalUIStore`. This removes layout pressure from the sidebar and allows the same UI to be opened from any surface (sidebar, Zen Mode, future contexts).

**2. `{#key entityId}` for clean state**
Svelte's `{#key}` block destroys and remounts `DetailSoundBite` whenever `entityId` changes while the modal is open. This prevents audio bleed, stale voice profile, and in-flight generation from the previous entity.

**3. Oracle proxy snake_case translation**
The Google Gemini REST API requires `speech_config` with nested `voice_config.prebuilt_voice_config.voice_name`. The Cloudflare Worker proxy explicitly maps camelCase SDK field names to the required snake_case REST shape. An empty or absent `voice_name` skips the entire `speech_config` assignment to avoid a Google 400 error.

**4. Voice mapper — tone-keyword approach**
`buildGeminiVoiceName(mode, toneTag)` uses a regex-based keyword matcher to assign Gemini voice names from a curated 28-voice table, grouped by gender/timbre bucket. `buildVoiceStyleInstruction(profile)` converts the same profile into a natural-language system instruction that further shapes prosody.

**5. Voice mode-matched profile reuse**
When reopening the modal for an entity with a saved sound bite, the saved `voiceProfile` is restored only if its `voiceMode` matches the current mode selection. This prevents a saved female scholar profile from bleeding into a newly selected male mode.

**6. Guest safety**
`!vault.isGuest` gates the sound bite header button (show only if a saved bite exists) and the Generate/Save controls inside the modal. Existing saved bites remain playable by guests.

**7. HMR singleton versioning**
`modalUIStore` uses a `__codex_modal_ui_store__v2__` globalThis key to prevent Vite HMR from serving a stale store instance that predates the new `soundBite` field.

## Data Model

### Entity `soundBite` field (schema addition)

```typescript
interface SoundBiteMetadata {
  fileRef: string;        // OPFS path: "audio/{entityId}_soundbite.wav"
  savedAt: number;        // Unix timestamp ms
  voiceProfile: {
    voiceMode: "male" | "female" | "neutral";
    toneTags: string[];   // e.g. ["scholarly", "calm"]
  };
}

// Added to Entity:
soundBite?: SoundBiteMetadata;
```

### OPFS File Layout

```
/opfs-root/audio/{entityId}_soundbite.wav
```

One file per entity, overwritten on re-save. Deleted via `OPFSFileHandle.remove()` on the Delete action.

## Risk Register

| Risk                                                    | Likelihood | Mitigation                                                             |
| ------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Gemini TTS voice not matching selection                 | Medium     | Fixed by oracle proxy `speechConfig` translation (resolved in this PR) |
| OPFS unavailable in some browsers                       | Low        | Graceful degradation — generate is still possible, save is disabled    |
| Entity deleted while modal open                         | Low        | `$effect` closes modal when entity disappears from vault store         |
| Stale audio from previous entity bleeds into new entity | Medium     | `{#key entityId}` forces full component remount                        |
| HMR serves stale ModalUIStore missing `soundBite` field | Medium     | Resolved by `v2` globalThis key                                        |
| Generation fails mid-stream                             | Medium     | Loading state + error message with retry; no partial audio is saved    |

## Phase 0 Research

Voice mapping exploration, Gemini 2.5 Flash TTS API shape, and OPFS audio persistence patterns — see [research.md](./research.md).

## Phase 1 Design

Data model, VoiceProfile contract, OPFS file convention — see data-model.md section above.
