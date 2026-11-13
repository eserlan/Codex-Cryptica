# Feature Specification: Adventure Artwork

**Feature Branch**: `181-adventure-artwork`  
**Created**: 2026-11-12  
**Status**: Draft — ready for planning  
**Input**: [Issue #4757](https://github.com/eserlan/Codex-Cryptica/issues/4757): curated scene artwork and persistent NPC portraits for AI GM / Adventure Mode.  
**Related**: [#4528](https://github.com/eserlan/Codex-Cryptica/issues/4528), emergent solo adventure.

## Clarifications

### Session 2026-11-12

- Q: Should the shared library include AI-generated artwork created and reviewed by us ahead of time? → A: C — exclusively team-generated AI illustrations created and reviewed ahead of play. User-provided Vault images remain supported.
- Q: When you choose Keep on a Vault image, should it stay fixed even if you later change that entity’s image? → A: A — preserve the exact kept picture until explicitly replaced or automatic selection is restored; only automatic mode follows later Vault image changes.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Recognise the place without interrupting play (Priority: P1)

As a player, I want a modest establishing picture when I enter a place, so that I can picture the setting while keeping the narration and actions easy to read.

**Why this priority**: Location identity already exists in adventures. Stable establishing artwork delivers value without requiring a new portrait identity system.

**Independent Test**: Enter a place with a Vault picture, enter another with a suitable library illustration, continue talking, and revisit the first place. Verify selection, stability and fallback without implementing NPC portraits or downloadable packs.

**Acceptance Scenarios**:

1. **Given** a place linked to a Vault location with an available picture, **When** the committed adventure enters it, **Then** that picture appears rather than a generic library image.
2. **Given** a place without its own picture and a meaningfully matching library asset, **When** entry commits, **Then** one establishing image appears with its credits and an indication that it is illustrative.
3. **Given** an assigned image, **When** five ordinary narration turns occur or mood and time of day change, **Then** the assignment remains unchanged.
4. **Given** two visited places, **When** the player returns to either after reloading, **Then** its saved library selection is reused unless a higher-precedence source or an explicit player choice applies.
5. **Given** no meaningful match or a failed image load, **When** play continues, **Then** narration and actions remain usable without a broken image or a generation error.
6. **Given** a streamed or cancelled turn proposes a move, **When** that move has not committed, **Then** the current artwork and saved assignments remain unchanged.

### User Story 2 - Control which artwork appears (Priority: P1)

As a player, I want to keep, replace, dismiss or disable artwork without leaving my adventure or changing my campaign records.

**Why this priority**: Player control and Vault precedence are required for the first visible release, rather than deferred polish.

**Independent Test**: Using a location-only catalogue, change a selection, dismiss it, reload, restore automatic selection and disable illustrations. Verify that these actions preserve narration and do not edit the Vault entity image.

**Acceptance Scenarios**:

1. **Given** a displayed library or Vault picture, **When** the player chooses Keep, **Then** the exact picture becomes an explicit subject-specific choice and survives reload. Later replacement or deletion of the entity’s Vault image does not change the kept picture.
2. **Given** artwork from any source, **When** the player chooses another eligible catalogue image, **Then** that explicit choice takes precedence for this subject without replacing the Vault entity's attached image.
3. **Given** artwork is dismissed, **When** the player revisits the subject or another source becomes available, **Then** no fallback image appears until the player restores illustrations for that subject.
4. **Given** an explicit choice, **When** the player restores automatic selection, **Then** the available Vault image takes precedence, followed by the previous automatic assignment and a new match.
5. **Given** illustrations are disabled in Adventure settings, **When** the player resumes or advances an adventure, **Then** no artwork is shown or downloaded for this feature; narrative play and saved assignments remain available.
6. **Given** a failed save or preservation of a kept picture, replacement or dismissal, **When** the action finishes, **Then** the last saved choice remains authoritative and the player receives a retryable message.

### User Story 3 - Recognise returning characters (Priority: P2)

As a player, I want a returning NPC to have the same portrait, even after leaving the scene or saving that character to my Vault.

**Why this priority**: Portrait consistency depends on persistent character identity across appearances, aliases and promotion into campaign canon.

**Independent Test**: Meet an NPC, assign a portrait, leave, reload, return using an established alias, and save the NPC to the Vault. Also meet a second person with the same name. Verify identity and image continuity.

**Acceptance Scenarios**:

1. **Given** a player-known NPC with a stable identity and no portrait, **When** that character becomes relevant in a committed scene, **Then** an eligible portrait may be assigned once and shown beside the introduction or character card.
2. **Given** a returning NPC, **When** its established identity or recorded alias is referenced again, **Then** its previous assignment is reused, even if the matcher would now prefer another asset.
3. **Given** two people with the same display name, **When** both appear, **Then** their identities and assignments remain independent; ambiguous name matching never merges them automatically.
4. **Given** an NPC saved from an adventure into the Vault, **When** play resumes with its canonical record, **Then** the existing subject association and override remain linked to the same person. Without an override, an available Vault portrait takes precedence.
5. **Given** identity cannot be resolved, **When** a name occurs in narration, **Then** the system shows no portrait for that occurrence rather than inventing a persistent person from the name alone.
6. **Given** a character exists only in hidden GM preparation, **When** artwork is selected or alternatives are offered, **Then** neither its existence nor secret traits are revealed through pictures, labels or alternative text.

### User Story 4 - Download a collection for offline use (Priority: P3)

As a player, I want to download a suitable art collection, understand its size and credits, and remove downloaded files when I need space.

**Why this priority**: Optional downloads expand coverage without increasing the initial application download or making internet access a requirement for reading saved play.

**Independent Test**: Download a collection, disconnect, revisit assigned subjects, exhaust the download budget, remove the collection and resume play. Verify offline reuse and graceful text-only fallback.

**Acceptance Scenarios**:

1. **Given** an optional collection, **When** the player reviews it, **Then** its genres, subjects, image count, download size and credits are available before downloading.
2. **Given** a completed download, **When** the player goes offline, **Then** its assigned images remain viewable without another network request.
3. **Given** interrupted downloads or insufficient device space, **When** retrieval fails, **Then** completed files remain usable, incomplete assets are not marked available and play continues.
4. **Given** a collection is removed or cached images are evicted, **When** its subjects reappear, **Then** their assignments and overrides remain saved, text-only fallback is available, and the player can download the same images again.

### Edge Cases

- A Vault image is added, changed, deleted or temporarily unreadable after a stock assignment; explicit overrides remain intact and automatic selection follows the documented precedence.
- An NPC leaves the active scene, is renamed, shares a name with another person, or is promoted into a Vault entity. Appearance and spelling alone are insufficient identity evidence.
- A location changes while artwork is loading. A late response must not replace the new location's art or steal scroll/focus.
- A new catalogue version changes rankings or withdraws an asset. Existing valid assignments do not rerank; withdrawn assets show a placeholder-free text fallback and offer replacement.
- A replacement is cancelled, an adventure is switched, or another tab holds write control. No partial or cross-adventure preference writes occur.
- A stored assignment refers to a missing subject, unknown asset, removed collection or incompatible catalogue version. It cannot prevent opening, restoring or playing the adventure.
- A genre has little coverage, or its narrative contradicts available pictures. No illustration is preferable to a misleading match.
- A downloaded file fails validation, carries unsupported content, or requests an unapproved external host. It must not be displayed or treated as a successful download.
- Text-only mode is enabled while a download is in flight. New automatic artwork downloads stop; explicit collection downloads require their own confirmation.
- Backup/restore and deletion preserve or remove associations with their owning adventure or world; shared artwork files are never treated as private campaign canon.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Adventure artwork MUST support locations, NPCs, scenes and atmosphere across the application's supported genres. The initial visible release MAY be limited to location establishing images; uncovered genres and subjects MUST fall back to text.
- **FR-002**: Every distributed image MUST have a stable asset identity, subject type, controlled descriptive Labels, genre eligibility, preview and display variants, crop/aspect guidance, alternative text, and recorded origin, responsible creator, generation tool/model, creation date, review status, basis for distribution and any required attribution. Shared catalogue assets MUST be team-generated AI illustrations created ahead of play and approved by a human for visual quality, descriptive accuracy and genre fit. Missing provenance, review approval or a verified basis for distribution MUST block inclusion; any generation reference material must also have recorded permitted use. The catalogue and credits MUST identify these assets as AI illustrations.
- **FR-003**: Asset matching MUST occur locally from already established player-visible scene and subject information. It MUST NOT require a separate AI request, image-generation call, or third-party image search.
- **FR-004**: Matching MUST enforce subject-type and genre eligibility before ranking, use a documented minimum suitability threshold, and resolve equal scores deterministically. Unspecified genre MUST NOT be treated as permission to use contradictory genre-specific art.
- **FR-005**: Automatic assignments MUST be made only for committed subjects and transitions. Narration streaming, failed turns, cancelled actions, ordinary conversation, and catalogue score changes MUST NOT reassign artwork.
- **FR-006**: A place change MAY introduce a new establishing image. A separate scene within a place MUST have an explicit stable scene identity before it can own a different saved image; inferred mood changes alone MUST NOT create scenes.
- **FR-007**: Display selection MUST apply this order: feature disabled or subject dismissed → no image; explicit player choice → selected image; available Vault entity image → that image; valid saved library assignment → that asset; eligible catalogue match → new assignment; otherwise → no image. Unavailable explicit choices MUST remain recorded and show a text-only fallback with a replace/restore action, rather than silently substituting another portrait.
- **FR-008**: Keep MUST preserve the exact displayed picture as the subject’s explicit choice, rather than follow a mutable Vault image reference. Later edits, replacement or removal of that entity’s image MUST NOT change the kept picture; catalogue visual changes MUST receive a new asset identity rather than alter an existing selected picture; only explicit replacement or Restore automatic releases the choice. Choose another MUST offer eligible alternatives without exposing hidden subjects or requiring navigation away from play. Cancel MUST preserve the saved choice. Dismiss MUST suppress all sources for that subject. Restore automatic MUST clear the override/dismissal and reapply FR-007.
- **FR-009**: Player artwork actions MUST NOT change a Vault entity's image, its narrative content, or campaign canon. Editing an entity's own image remains an explicit existing Vault action.
- **FR-010**: NPC identity MUST persist independently of the current active-character list and display name. A known canonical identity or explicitly established adventure identity MUST own the assignment. Recorded aliases and promotion into a Vault record MUST preserve that relationship; unresolved identity MUST produce no portrait.
- **FR-011**: Canonical entity choices MUST be scoped to the current Vault and reusable across its adventures. Provisional character, place and scene choices MUST belong to their originating adventure until explicitly linked to a canonical entity. Identical names in different Vaults or adventures MUST NOT share identity implicitly.
- **FR-012**: Assignments, player overrides, dismissals and canonical links MUST survive reload/resume and the existing backup/restore flow. Old adventures without artwork data MUST remain readable and playable. If existing optional cloud backup is extended to include adventures and their private GM material, inclusion of adventure documents AND adventure-artwork metadata/private snapshots (including artwork attached to canonical entities in ordinary entity backups) MUST remain off until the owner accepts an explicit disclosure of the additional data, provider/access and removal controls; opting out MUST leave local data intact. Cached catalogue image bytes MUST be disposable independently of these associations. Preserved user-provided pictures MUST remain available independently of the original entity image and MUST accompany existing Vault backup/restore; they are private Vault content, not shared catalogue assets. If the picture cannot be preserved, Keep MUST fail without claiming the choice was saved.
- **FR-013**: Assignment and override saves MUST respect existing adventure write ownership, avoid overwriting concurrent narrative progress, and keep the last saved state on failure. Artwork failures MUST never reject an otherwise valid narrative turn.
- **FR-014**: Artwork MUST remain supplementary. It MUST NOT introduce canonical facts, influence GM grounding as factual evidence, or disclose hidden GM state through images, alternatives, credits-derived subject descriptions or alternative text. Optional visual cues returned with an existing GM response MUST be bounded and validated; invalid cues MUST be ignored without failing the turn.
- **FR-015**: The first visible release MUST include Vault-image precedence, saved location assignments, Keep/Choose another/Dismiss/Restore automatic, a device-local Adventure illustrations setting, credits and accessible text-only fallback. Existing adventure text remains readable while pictures load.
- **FR-016**: Establishing artwork MUST be landscape-oriented and modestly sized near the current scene header or transition. NPC portraits MUST be modestly sized near the relevant introduction/card. Artwork MUST NOT repeat as a large block on every turn, move keyboard focus, or obscure the action composer at phone sizes.
- **FR-017**: All artwork controls MUST work by keyboard, have plain accessible names and preserve focus after closing selection. At 390 × 844 and 1440 × 900, art and controls MUST avoid horizontal overflow and leave narration and action entry usable. Space MUST be reserved to avoid image-induced layout jumps.
- **FR-018**: The base application MUST contain only the catalogue information needed for selection; preview/display image files MUST load on demand. Shared distributed images MUST use the project's first-party asset host. No private adventure text, Vault identifiers or visual cues may appear in asset URLs, request parameters, referrers or artwork telemetry.
- **FR-019**: Optional collections MUST disclose size, coverage and credits before download. Downloads MUST have progress, cancellation and retry; only complete validated assets count as available offline. Automatic caching MUST have a finite budget and visible removal controls; eviction MUST NOT silently change subject assignments. The plan MUST set explicit size and storage budgets before implementation.
- **FR-020**: Disabled illustrations MUST prevent this feature's automatic artwork requests and display without deleting saved assignments. Re-enabling MUST restore valid selections. Removing a collection MUST stop its automatic reacquisition until the player explicitly requests it again; an uncached withdrawn asset uses text-only fallback.
- **FR-021**: Catalogue matching and repeat selection MUST work without AI. Reading saved adventures MUST remain possible without images, a network connection or downloaded collections. Disabling AI MUST prevent any new AI request for visual cues.
- **FR-022**: Help MUST explain how illustrations are chosen, illustrative versus canonical content, precedence and controls, download/storage behaviour, credits, and text-only/offline limitations before the feature ships.
- **FR-023**: Verification MUST cover deterministic ties, genre/subject exclusions, low-confidence fallback, all precedence states, dismissal, identity ambiguity/aliases/promotion, reload/restore, invalid assets, delayed loads, cancelled/failed turns, concurrent saves, hidden-state exclusion, collection cancellation/removal, offline reuse and no visual churn.

### Key Entities _(include if feature involves data)_

- **Artwork asset**: A reusable image with immutable identity, variants, visual Labels, genre/subject eligibility, AI origin, generation tool/model, creation date, human review, distribution basis, attribution and provenance. It represents illustrative material, not campaign truth.
- **Artwork subject**: A canonical Vault entity or an adventure-local place, NPC or committed scene with a stable identity and player-visible descriptive cues. Identity may link to canon without changing the represented subject.
- **Artwork association**: A subject's automatic asset assignment, explicit player choice or dismissal, including enough source identity to restore precedence and preserve a choice across appearances. A kept Vault picture represents the exact preserved picture, not a link that follows subsequent entity-image edits.
- **Artwork collection**: A versioned group of eligible assets with declared download size, coverage, credits and availability/withdrawal information.
- **Device artwork preferences**: Illustration visibility and download/cache choices for this device. These do not alter narrative content or another device's storage use.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a scripted visit–conversation–leave–reload–return journey, every previously illustrated subject retains its valid assignment; five ordinary turns produce zero automatic assignment changes.
- **SC-002**: Every precedence and control scenario in Stories 1–3 produces the specified picture or no-picture result, including disabled mode, dismissal, missing explicit choices and Vault image changes. Kept Vault pictures remain visually identical after entity-image replacement/deletion, reload and backup/restore; automatic mode follows the current available Vault image.
- **SC-003**: Every shared catalogue asset is a team-generated AI illustration with complete generation provenance, human approval and a reviewed basis for distribution. A seed catalogue release contains zero third-party stock illustrations, unreviewed assets or assets with missing provenance, and every asset is identified as an AI illustration.
- **SC-004**: A reviewed release fixture set covers fantasy, contemporary, science-fiction and horror settings with both suitable matches and intentional no-match cases. Every contradictory-genre case returns no image; each supported case yields the same selection on repeated runs.
- **SC-005**: The portrait journey preserves identity through alias use, leaving the scene, reload and Vault promotion, while two distinct same-name NPCs remain independent in every test.
- **SC-006**: Committed narration remains readable and the next action can be entered with zero waiting for image completion, including offline, missing-asset and failed-download scenarios.
- **SC-007**: At both target viewport sizes, keyboard-only checks can replace, dismiss, restore and disable artwork without losing the action draft; narration, controls and composer have no horizontal overflow.
- **SC-008**: Network inspection finds zero artwork-selection AI/search requests and zero private narrative or hidden-state fields in artwork requests. Disabled illustrations cause zero automatic artwork downloads.
- **SC-009**: A fully downloaded collection supports all of its assigned images offline; cancellation, cache eviction and collection removal preserve every saved association and allow continued text-only play.

## Scope, Assumptions & Delivery Boundaries

- This is the full feature contract for #4757. Delivery proceeds as independently testable slices: (1) location artwork and essential controls; (2) persistent NPC identity and portraits plus explicitly identified within-place scenes; (3) optional collections and download/storage management. Each slice must meet its applicable requirements before release. Single-asset on-demand caching and graceful offline fallback belong in slice 1; collection management belongs in slice 3.
- Approximately 100–200 images is a later curation target, not the first release minimum. A small human-reviewed, team-generated seed set is sufficient to validate matching; unsupported subjects/genres remain unillustrated. Coverage must be described honestly.
- Default presentation is automatic illustration when an eligible image is available, with no unsolicited bulk collection download. The device-local setting is available before further automatic loads. Guest/shared play is outside this owner-only Adventure feature; no new guest export surface or private-artwork access is introduced.
- Explicit player replacements override attached Vault art within Adventure Mode. This resolves the issue's conflicting replacement and precedence wording. Keep preserves the exact picture, including a Vault picture, independently of later entity-image edits. Restoring automatic selection restores Vault precedence; entity artwork itself is never edited by this feature.
- Canonical associations are shared within a Vault; provisional associations remain adventure-local. A record rename does not change identity. NPC identity resolution must be specified before slice 2; uncertain matches are left unillustrated.
- Illustrated NPCs need not have unique assets globally; consistency means a subject retains its chosen portrait, not that a finite catalogue guarantees every NPC a different face.
- The shared stock library exclusively uses team-generated AI illustrations created and human-reviewed ahead of play; third-party licensed/public-domain stock is excluded from this catalogue. This restriction does not apply to user-provided Vault images. Existing team-generated Biome artwork may be reused only after checking its provenance, review and suitability for this collection. Bespoke generation per turn, arbitrary web-image ingestion, new remote private-data storage, and changing the narrative based on artwork are out of scope.
- Existing place identities, canonical links, attached Vault images and adventure ownership are dependencies. This feature extends their behaviour without creating a competing source of campaign truth.
- Constitution alignment: matching and authoritative records stay local. Any expansion of optional cloud backup must meet all six privacy-exception conditions, including explicit consent before new adventure data leaves the device; the plan documents these gates. Implementation requires positive and negative tests, scoped validation and Help updates. No public discovery URL is added or repositioned.
