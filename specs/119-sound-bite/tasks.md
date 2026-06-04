# Tasks: Sound Bite

**Input**: Design documents from `/specs/119-sound-bite/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)
**Status**: All tasks completed — PR #897 open → staging

**Tests**: Unit tests for voice mapping and TTS service; service integration tests for OPFS persistence.

**Organization**: Tasks are grouped by layer so each layer can be reviewed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on another incomplete task.
- **[Story]**: User story label for story-scoped tasks only.
- Every task includes an exact file path.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema extension, oracle-engine foundation, and oracle proxy fix — required by all stories.

- [x] T001 [P] Extend `Entity` schema with optional `soundBite?: SoundBiteMetadata` field in `packages/schema/src/entity.ts`
- [x] T002 [P] Define `VoiceProfile`, `SoundBiteMetadata`, and `TTSService` types in `packages/oracle-engine/src/sound-bite-generator.ts`
- [x] T003 [P] Fix oracle proxy `speechConfig` → `speech_config` translation to only emit when `voice_name` is non-empty in `apps/workers/oracle-proxy/src/index.ts`
- [x] T004 Deploy oracle proxy fix to Cloudflare Workers (Version `663b265b-bb71-4e78-ad95-5cea730ef330`)

**Checkpoint**: Schema, types, and proxy are ready for TTS implementation.

---

## Phase 2: Oracle Engine — TTS Service (Priority: P1, P1)

**Purpose**: Implement voice mapping and TTS generation in the shared oracle-engine package.

### Tests for Oracle Engine

- [x] T005 [P] Add failing unit tests for `buildGeminiVoiceName` — all 28 voice slots, known tone tags, unknown-tag fallback in `packages/oracle-engine/src/sound-bite-generator.test.ts`
- [x] T006 [P] Add failing unit tests for `buildVoiceStyleInstruction` — male/female/neutral × tone combinations in `packages/oracle-engine/src/sound-bite-generator.test.ts`
- [x] T007 [P] Add failing unit tests for `GeminiTTSService.generate` — valid entity, empty content fallback, API error propagation in `packages/oracle-engine/src/sound-bite-generator.test.ts`

### Implementation for Oracle Engine

- [x] T008 [US2] Implement `buildGeminiVoiceName(mode, toneTag)` with 28-voice tone-keyword mapper in `packages/oracle-engine/src/sound-bite-generator.ts`
- [x] T009 [US2] Implement `buildVoiceStyleInstruction(profile)` to produce natural-language TTS system instruction in `packages/oracle-engine/src/sound-bite-generator.ts`
- [x] T010 [US1] Implement `GeminiTTSService` — builds `speechConfig`, sends to Gemini via proxy or direct API, returns `ArrayBuffer` in `packages/oracle-engine/src/sound-bite-generator.ts`
- [x] T011 [P] Implement `WebSpeechTTSService` (fallback using Web Speech API) as an alternative `TTSService` in `packages/oracle-engine/src/sound-bite-generator.ts`
- [x] T012 Run oracle-engine tests with `bun test packages/oracle-engine`

**Checkpoint**: Voice mapping and TTS generation are independently testable in oracle-engine.

---

## Phase 3: Web Service — SoundBiteService (Priority: P1, P1, P3)

**Purpose**: Reactive web-layer service orchestrating generation, OPFS persistence, and playback.

### Tests for SoundBiteService

- [x] T013 [P] Add failing service tests for OPFS save/load round-trip and `entity.soundBite` metadata update in `apps/web/src/lib/services/SoundBiteService.test.ts`
- [x] T014 [P] Add failing service tests for delete — OPFS file removed, entity field cleared in `apps/web/src/lib/services/SoundBiteService.test.ts`
- [x] T015 [P] Add failing service tests for guest guard — generate and save throw or no-op when `vault.isGuest` in `apps/web/src/lib/services/SoundBiteService.test.ts`

### Implementation for SoundBiteService

- [x] T016 [US1] Implement `generate(entity, voiceProfile)` — calls `GeminiTTSService`, stores result in reactive state in `apps/web/src/lib/services/SoundBiteService.svelte.ts`
- [x] T017 [US3] Implement `saveToEntity(entity)` — writes audio to OPFS, calls `vault.updateEntity` with soundBite metadata in `apps/web/src/lib/services/SoundBiteService.svelte.ts`
- [x] T018 [US3] Implement `loadFromEntity(entity)` — reads OPFS file reference, populates reactive `audioObjectUrl` in `apps/web/src/lib/services/SoundBiteService.svelte.ts`
- [x] T019 [US3] Implement `deleteFromEntity(entity)` — removes OPFS file, calls `vault.updateEntity` to clear soundBite in `apps/web/src/lib/services/SoundBiteService.svelte.ts`
- [x] T020 [US6] Add guest guard to `generate` and `saveToEntity` in `apps/web/src/lib/services/SoundBiteService.svelte.ts`
- [x] T021 Run SoundBiteService tests with `bun test apps/web`

**Checkpoint**: SoundBiteService is independently verifiable; OPFS persistence confirmed.

---

## Phase 4: Global Modal — SoundBiteModal (Priority: P2)

**Purpose**: Modal shell and ModalUIStore integration so SoundBiteModal can be opened from any surface.

- [x] T022 [US4] Add `soundBite` reactive state to `ModalUIStore` with `openSoundBite(entityId)` and `closeSoundBite()` in `apps/web/src/lib/stores/ui/modal-ui.svelte.ts`
- [x] T023 Bump `ModalUIStore` globalThis key to `v2` to prevent HMR from serving stale instance in `apps/web/src/lib/stores/ui/modal-ui.svelte.ts`
- [x] T024 [P] [US4] Create `SoundBiteModal.svelte` — backdrop, fly animation, `{#key entityId}` wrapper around `DetailSoundBite` in `apps/web/src/lib/components/modals/SoundBiteModal.svelte`
- [x] T025 Register `SoundBiteModal` as a lazy-loaded global modal in `apps/web/src/lib/components/modals/GlobalModalProvider.svelte`
- [x] T026 Add auto-close effect — modal closes when the entity is deleted while it is open in `apps/web/src/lib/components/modals/SoundBiteModal.svelte`

**Checkpoint**: Modal opens/closes via `modalUIStore.openSoundBite(entityId)` from any surface.

---

## Phase 5: Entity Header Buttons (Priority: P2)

**Purpose**: Sound bite launcher button in the sidebar entity header and Zen Mode header.

- [x] T027 [P] [US4] Add sound bite button to entity sidebar header with `alreadyOpen` guard and `volume-2`/`volume-x` icon state in `apps/web/src/lib/components/entity-detail/DetailHeader.svelte`
- [x] T028 [P] [US4] Add same sound bite button to Zen Mode header with `alreadyOpen` guard and icon state in `apps/web/src/lib/components/zen/ZenHeader.svelte`
- [x] T029 [US6] Gate header button visibility on `!vault.isGuest || entity.soundBite` in both header components

---

## Phase 6: Entity Detail Panel Cleanup

**Purpose**: Remove `DetailSoundBite` from the inline sidebar panel now that it lives in the modal.

- [x] T030 Remove `DetailSoundBite` import and inline render block from `apps/web/src/lib/components/EntityDetailPanel.svelte`
- [x] T031 Fix `$effect` stale animation origin — use `void entity?.id` to track entity id changes and clear `lastSelectedNodePosition` before every intro transition in `apps/web/src/lib/components/EntityDetailPanel.svelte`

---

## Phase 7: Code Review Findings (Post-PR)

**Purpose**: Address all 7 findings from the high-effort 3-angle code review before merge.

- [x] T032 **Stale entity write** — all action handlers in `EntityDetailPanel.svelte` guard on live `entity` (not `entity || activeEntity`) to prevent writes during exit animation
- [x] T033 **Missing `{#key entityId}`** — `SoundBiteModal.svelte` wraps `DetailSoundBite` in `{#key entityId}` to remount on entity change
- [x] T034 **Stale animation origin** — `$effect` in `EntityDetailPanel.svelte` tracks `entity?.id` and clears `lastSelectedNodePosition` on every entity change, not just unmount
- [x] T035 **Empty `speech_config`** — oracle proxy only emits `speech_config` when `voice_name` is a non-empty string (T003/T004 above)
- [x] T036 **`loadFromEntity` idempotency** — sidebar and Zen header buttons skip `soundBiteService.loadFromEntity(entity)` when `modalUIStore.soundBite.show && entityId === entity.id`
- [x] T037 **Empty `voice_name` fallback** — removed `?? ""` fallback; entire `speech_config` block is skipped when voice name is absent
- [x] T038 **HMR singleton reuse** — `ModalUIStore` globalThis key bumped to `v2` (T023 above)

---

## Phase 8: Polish & Validation

- [x] T039 [P] Validate mobile bottom sheet and desktop centred card layouts match spec in `apps/web/src/lib/components/modals/SoundBiteModal.svelte`
- [x] T040 [P] Verify volume-2/volume-x icon distinction on entities with and without saved bites
- [x] T041 [P] Verify guest session shows sound button only when `entity.soundBite` exists
- [x] T042 Run full workspace validation: `bun run lint` and `bun run test`
- [x] T043 Open PR #897 targeting `staging` branch

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Blocking all phases.
- **Oracle Engine (Phase 2)**: Depends on Setup (T001–T004). Blocking SoundBiteService.
- **SoundBiteService (Phase 3)**: Depends on Oracle Engine.
- **Modal (Phase 4)**: Depends on Schema (T001) and SoundBiteService (T016–T020).
- **Header Buttons (Phase 5)**: Depends on Modal (T022–T026).
- **Panel Cleanup (Phase 6)**: Depends on Modal (T022–T026).
- **Code Review (Phase 7)**: Addressed concurrently with polish before PR merge.
- **Polish (Phase 8)**: Depends on all prior phases being complete.

### Parallel Opportunities

- T001, T002, T003 can run in parallel (separate files).
- T005, T006, T007 (oracle-engine tests) can run in parallel.
- T008, T009, T011 can run in parallel.
- T013, T014, T015 (service tests) can run in parallel.
- T027, T028 (header buttons) can run in parallel.
- T039, T040, T041 (polish validation) can run in parallel.
