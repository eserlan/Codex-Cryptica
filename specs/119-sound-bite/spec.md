# Feature Specification: Sound Bite

**Feature Branch**: `119-sound-bite`
**Created**: 2026-05-25
**Status**: Implemented
**PR**: #897 → staging
**Input**: User description: "A sound bite generator for each entity. It takes the entity content and generates a short audio clip for it using AI voices — male/female/neutral, different character styles (scholarly, heroic, etc.). Saved per entity in OPFS. Playable from the entity panel."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a Sound Bite for an Entity (Priority: P1)

As a Dungeon Master reviewing an entity, I want to generate a short AI-narrated audio clip for that entity, so I can use it as ambient narration or NPC voice at the table.

**Why this priority**: This is the core value of the feature — turning entity lore into playable audio.

**Independent Test**: Open the sound bite modal for an entity with content, select a voice, press Generate, and verify an audio clip is produced and playable.

**Acceptance Scenarios**:

1. **Given** an entity with lore content, **When** the user opens the sound bite modal and presses Generate, **Then** a short AI-narrated audio clip is produced and available for immediate playback.
2. **Given** a generation is in progress, **When** the user interacts with the modal, **Then** a loading state is clearly shown and the Generate button is disabled.
3. **Given** generation fails (e.g., API error), **When** the failure occurs, **Then** the user sees a clear error message and can retry.

---

### User Story 2 - Choose a Voice Style (Priority: P1)

As a DM, I want to choose between male, female, and neutral voice modes with character style tones (scholarly, heroic, etc.), so I can match the sound bite voice to the entity's feel.

**Why this priority**: Voice selection is inseparable from the generation step — generating with the wrong voice produces unusable output.

**Independent Test**: Open the modal, change voice mode and style tone, generate, and verify the audio reflects the selected voice configuration.

**Acceptance Scenarios**:

1. **Given** the sound bite modal is open, **When** the user selects a voice mode (male/female/neutral) and optionally a tone keyword, **Then** the system maps these to one of 28 Gemini prebuilt voices and passes the selection to the TTS generation.
2. **Given** an entity has a previously saved voice profile, **When** the modal opens, **Then** the saved voice mode and tone are restored as the default selection.

---

### User Story 3 - Save and Replay a Sound Bite (Priority: P1)

As a DM, I want a generated sound bite to be saved with the entity so I can replay it later without regenerating, so sessions feel consistent.

**Why this priority**: Regeneration re-randomizes voice; saved clips preserve the chosen voice for consistent NPC characterisation.

**Independent Test**: Generate a sound bite, close and reopen the modal, and verify the previously generated clip is available for playback without regenerating.

**Acceptance Scenarios**:

1. **Given** a sound bite has been generated, **When** the user presses Save, **Then** the audio is persisted to OPFS under `audio/{id}_soundbite.wav` and associated with the entity.
2. **Given** a saved sound bite exists, **When** the user opens the modal, **Then** the saved clip is loaded and playable immediately without generating a new one.
3. **Given** a saved sound bite exists, **When** the user presses Delete, **Then** the audio file is removed from OPFS and the entity no longer shows a saved clip.

---

### User Story 4 - Open Sound Bite from the Entity Header (Priority: P2)

As a DM, I want a sound bite button always visible in the entity header (both sidebar and Zen Mode), so I can launch the modal with one click regardless of which panel I am using.

**Why this priority**: Discoverability — users should not have to navigate away from the entity they are looking at to find the sound bite feature.

**Independent Test**: Open the sidebar for an entity, click the sound bite button in the header, and verify the modal opens for that entity. Repeat from Zen Mode.

**Acceptance Scenarios**:

1. **Given** an entity is open in the sidebar panel, **When** the user clicks the sound button in the header, **Then** the SoundBiteModal opens for that entity.
2. **Given** an entity is open in Zen Mode, **When** the user clicks the sound button in the Zen header, **Then** the SoundBiteModal opens for that entity.
3. **Given** the sound bite modal is already open for the same entity, **When** the user clicks the header button again, **Then** the modal is re-opened (or brought to focus) without triggering a redundant service reset.
4. **Given** a saved sound bite exists on the entity, **When** the user views the entity header, **Then** the sound button uses a distinct icon (volume-2 vs volume-x) to indicate saved state.

---

### User Story 5 - Use Own Gemini API Key (Priority: P2)

As a DM with a Google AI Studio account, I want to use my own Gemini API key so I am not limited by the system proxy's rate limits or availability.

**Why this priority**: Power users who generate many sound bites quickly saturate a shared proxy; BYOK removes the bottleneck.

**Independent Test**: Configure a personal API key in Intelligence settings, open the sound bite modal, and verify generation calls go directly to Google rather than the oracle proxy.

**Acceptance Scenarios**:

1. **Given** a personal Gemini API key is configured, **When** the user generates a sound bite, **Then** the request is sent directly to the Google Gemini API with the personal key and does not go through the oracle proxy.
2. **Given** no personal key is configured, **When** the user generates a sound bite, **Then** the request is routed through the oracle proxy using the system key.

---

### User Story 6 - Guest Users Cannot Generate Sound Bites (Priority: P3)

As a guest user viewing a shared vault, I should not be able to generate new sound bites, so the vault owner's content is not changed.

**Why this priority**: Consistent with the app's existing guest/read-only data safety boundary.

**Independent Test**: Open a vault as a guest, attempt to reach the sound bite generation UI, and verify generation controls are unavailable.

**Acceptance Scenarios**:

1. **Given** the current session is a guest session, **When** the user views an entity header, **Then** the sound bite header button is only shown if the entity already has a saved sound bite (play-only).
2. **Given** the sound bite modal is open in a guest session for an entity with a saved clip, **When** the user views the modal, **Then** the Generate and Save buttons are not available.

---

### Edge Cases

- If the entity has no content or lore, generation still proceeds using the entity title and type as context.
- If OPFS is unavailable, the generated audio is playable in-session but cannot be saved.
- If the saved audio file is corrupted or missing from OPFS, the modal degrades gracefully to the empty (no saved bite) state.
- Switching entities while the modal is open fully resets the modal state — the `{#key entityId}` Svelte pattern forces a component remount.
- If the entity is deleted while the modal is open, the modal closes automatically.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST generate a short AI-narrated audio clip from entity content using the Gemini 2.5 Flash TTS model.
- **FR-002**: The system MUST offer male, female, and neutral voice modes, each mapped to appropriate prebuilt Gemini voices.
- **FR-003**: The system MUST offer tone/style keywords (e.g., scholarly, heroic, mysterious) that modulate the TTS system instruction and voice selection.
- **FR-004**: The system MUST map voice mode and tone to one of 28 Gemini prebuilt voices using `buildGeminiVoiceName`.
- **FR-005**: The system MUST produce TTS naturalness instructions from voice profile using `buildVoiceStyleInstruction`.
- **FR-006**: The system MUST support saving generated audio to OPFS under `audio/{entityId}_soundbite.wav`.
- **FR-007**: The system MUST support loading a previously saved sound bite on modal open.
- **FR-008**: The system MUST support deleting a saved sound bite from OPFS and clearing the entity association.
- **FR-009**: The entity header (sidebar and Zen Mode) MUST show a sound bite button visible to non-guest users.
- **FR-010**: The sound bite button icon MUST distinguish between "has saved bite" and "no saved bite" states.
- **FR-011**: The SoundBiteModal MUST open as a bottom sheet on mobile and a centred card on desktop.
- **FR-012**: The SoundBiteModal MUST fully reset its internal state when the target entity changes while the modal is open.
- **FR-013**: The modal MUST close automatically if the entity is deleted while it is open.
- **FR-014**: The system MUST route TTS requests through the oracle proxy when no personal Gemini API key is configured.
- **FR-015**: The oracle proxy MUST translate `speechConfig` camelCase fields to the `speech_config` snake_case shape required by the Google Gemini REST API.
- **FR-016**: Guest users MUST NOT be able to generate or save new sound bites; they MAY play existing saved bites.

### Key Entities _(include if feature involves data)_

- **Entity**: A vault lore record with optional `soundBite` metadata (OPFS file reference, timestamp, voice profile).
- **VoiceProfile**: `{ voiceMode: 'male' | 'female' | 'neutral', toneTags: string[] }` — stored with the entity's saved sound bite.
- **SoundBite (entity field)**: `{ fileRef: string; savedAt: number; voiceProfile: VoiceProfile }` — persisted in the entity record.
- **GeminiTTSService**: Oracle-engine service that builds and sends TTS generation requests to Gemini.
- **SoundBiteService**: Web-layer reactive service that orchestrates generation, OPFS persistence, and playback.
- **SoundBiteModal**: Global modal accessed via `modalUIStore.openSoundBite(entityId)`.

## Constraints

- **Privacy / client-side first**: Audio is generated remotely but stored locally in OPFS; no audio is transmitted to any server beyond the one-time generation call.
- **Guest safety**: Generation and save controls are gated on `!vault.isGuest`.
- **OPFS dependency**: Save/load functionality requires OPFS support; the feature degrades gracefully when unavailable.
- **Proxy camelCase→snake_case**: The oracle proxy must translate all relevant `generationConfig` fields; the `speechConfig` → `speech_config` translation is required for Gemini TTS to honour voice selection.
- **28-voice limit**: Gemini's prebuilt voice list is fixed; the mapper must cover all 28 and handle unknown tone tags with sensible defaults.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open the sound bite modal from the entity sidebar header with one click.
- **SC-002**: A user can open the sound bite modal from the Zen Mode header with one click.
- **SC-003**: A user can generate a TTS audio clip, choosing from male/female/neutral voice modes and tone styles, in under 30 seconds.
- **SC-004**: A generated clip can be saved to OPFS and replayed on subsequent modal opens without regenerating.
- **SC-005**: Switching the entity in the modal (or navigating away and back) does not carry over audio state or voice profile from a prior entity.
- **SC-006**: The oracle proxy correctly delivers `speech_config` to Google, and the generated voice matches the requested selection.
- **SC-007**: Guest users cannot access generation or save controls; they can play existing saved bites.
- **SC-008**: The sound bite button in the entity header uses a visually distinct icon when a saved bite exists.
