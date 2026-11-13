# Implementation Plan: Adventure Artwork

**Branch**: `181-adventure-artwork` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/181-adventure-artwork/spec.md`

## Summary

Deliver a curated library of team-generated, human-reviewed AI illustrations for Adventure Mode. Start with location artwork, persistent selections, Vault precedence and essential player controls; then add persistent NPC identities/portraits and explicitly identified scenes; finally add downloadable collections. Narrative play never waits for pictures.

Use a small framework-free `adventure-artwork-engine` for schemas/policy and deterministic matching. Reuse existing place identity, Vault entity metadata, adventure lease/revision saves and image resolution. Keep exact user pictures as durable private Vault assets. Store disposable public catalogue bytes in an explicitly bounded browser cache. Extend owner backup/restore and guest sanitisation explicitly; existing Cloud Backup does not include adventures.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 3 (current repository), Bun 1.3.14.  
**Primary Dependencies**: Existing `zod`, `schema`, `@codex/adventure-engine`, `@codex/vault-engine`, `@codex/runtime`, browser CacheStorage/fetch/Web Crypto, existing modal/DI patterns, Tailwind 4 semantic tokens and Iconify utilities. New internal package `packages/adventure-artwork-engine`; no new third-party dependency.  
**Storage**: Optional `adventureArtwork` on existing entity records; optional artwork/people/scene fields in existing `.codex/adventures/<id>.json`; private immutable snapshots under existing Vault `images/`; disposable `codex-adventure-artwork-v1` CacheStorage and device-local preference/cache index via injected storage. Cloud backup gains optional `adventures` collection behind explicit inclusion consent. No new database/object-store migration.  
**Testing**: Existing Bun package tests, Vitest web/service tests, Playwright targeted owner/guest/mobile scenarios, scoped workspace typechecks, changed-file lint/test scripts and Fallow audit.  
**Target Platform**: Owner-mode browser application on desktop/mobile; offline text and downloaded stock images; guest/public exports receive no adventure artwork metadata or private snapshot assets.  
**Project Type**: Internal reusable policy library plus web orchestration/UI and owner backup integration.  
**Performance Goals**: No awaited image fetch on turn commit/action entry; pure matching under 10 ms p95 for a 200-asset fixture on the CI runner (record runner details); at most two asset fetches; eight-second fetch deadline; fixed display aspect ratio and no image-induced layout shift.  
**Constraints**: Catalogue ≤256 KiB uncompressed at 200 assets, automatic public cache ≤32 MiB, collection ≤100 MiB, total public art ≤256 MiB; immutable private snapshot ≤16 MiB and ≤32 megapixels. No image bytes committed to Git. First-party public asset URLs contain only public immutable asset IDs.  
**Scale/Scope**: 24 landscape seed assets, expansion target 100–200 illustrations, all four catalogue types; initial image variants and coverage budgets are fixed in [research.md](research.md). Maximum 200 artwork associations, 200 people and 200 scenes per adventure initially. At capacity, keep existing identities/choices and decline new automatic illustrations; never truncate narrative/session history or overwrite a subject. Existing place limits continue to apply. Canonical choices live on their entities and are not counted as duplicate session associations.

## Constitution Check

_GATE: Checked before research and rechecked after the design below. No unresolved gate failures after analysis remediation._

| Principle                                 | Design evidence / release gate                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I, III — library-first, reuse, simplicity | Pure matching/precedence in one bounded library; reuse place IDs, Vault assets, existing save paths; no generic media-platform rewrite or new external dependency.                         |
| II, X — TDD and coverage                  | Red tests before each slice, success and meaningful negative paths; engine ≥70% new-code coverage; web services target utilities 80%, stores 50%. Test matrix in quickstart and contracts. |
| IV — AI extraction                        | Existing narrative engine stays authoritative; no new AI selection call; optional future cues are validated and non-blocking.                                                              |
| V — privacy/local authority               | Local matching, immutable first-party stock URLs, no private cues in network/telemetry, durable snapshots stay private. Cloud backup expansion is the explicit exception addressed below.  |
| VI — validation/style                     | Impacted lint/tests, scoped typechecks, guest/export round trips, Fallow and specialist review before a PR. UI follows style guide and existing transitions/focus patterns.                |
| VII, IX, XII — help/plain language/Labels | New artwork Help article plus Adventure and Cloud Backup help updates; plain controls, AI illustration labelling, controlled descriptive Labels.                                           |
| VIII — DI                                 | Repository, locks, cache, network, clock, digest and snapshot storage injected by constructor; production singleton assembly at app boundary.                                              |
| XI, XIV — bounded surgical changes        | New focused services/components; no image logic in OracleStore or narrative facade; existing large-file seams listed below.                                                                |
| XIII — discovery                          | No public discovery URL is added or repositioned.                                                                                                                                          |

### Cloud Backup privacy exception: six conditions

Adding adventure documents to enabled remote backup expands the private data transmitted, including hidden GM preparation. Do not treat existing consent as automatically authorising this extension.

1. **Off by default:** new adventure-and-artwork backup inclusion is off for existing and new backups until the owner explicitly accepts it; Cloud Backup itself remains opt-in. Local artwork never requires it.
2. **Consent before upload:** before the first expanded payload, explain that adventure transcripts, GM notes, assignments and kept private images will be stored by Cloudflare and accessible to the owner and infrastructure provider; disclose actual staff/support access consistent with existing policy. Keep this gate outside silent auto-sync. Existing backups continue their already-consented ordinary collections until accepted, but cloud entity projections omit `adventureArtwork` and private snapshot references until this inclusion is accepted; entity-only deltas and media refreshes enforce the same gate.
3. **Reversible:** allow disabling adventure inclusion, remove those documents, canonical entities’ remote artwork fields and newly unreferenced media from the remote mirror through the existing manifest/pruning path, and retain existing full-backup deletion controls. Disabling must not delete local adventures/snapshots.
4. **Local authority:** OPFS Vault/session files remain authoritative; backup failure or removal cannot prevent local play, Keep or owner ZIP export.
5. **No onward use:** reuse the existing private backup service with no publishing, AI-training or third-party image matching path. Verify no raw private values enter telemetry or shared catalogue requests.
6. **Access disclosure:** show the current backup access/retention/support policy at consent; do not claim encryption or staff inaccessibility beyond what the service implements.

These are implementation acceptance gates, not requests for permission during this planning task. If the existing service cannot meet them, the cloud portion must be redesigned before release; owner ZIP round trips alone cannot stand in for promised cloud support.

### Discovery Intent Check

Not applicable: owner-only Adventure settings/components and Help articles; no indexable discovery page.

### Bounded Responsibility Check

- `packages/adventure-engine/src/schemas.ts` (694 lines): session/proposal parsing. Add imported optional schemas and a short integration only; new artwork validators go into `schema/adventure-artwork.ts`, people/scene validators into focused adventure-engine modules. Move relevant identity checks to those modules with their tests if required; do not append matching/downloading logic.
- `packages/adventure-engine/src/types.ts` (539 lines): domain contracts. Add references to focused `people-types.ts` / `scene-types.ts` and schema-derived artwork types; preserve compatibility exports. No UI/cache policy here.
- Before implementation, run `bunx fallow guard` and measure actual branch versions of cloud-backup, schema barrel, Vault entity and AdventureSurface files. If touched files exceed 500 lines, extract artwork reference enumeration, promotion-link orchestration or backup collection handling into sibling modules and retain existing tests. Their only allowed edits are composition and existing responsibility integration.
- `AdventureManager` is 223 lines and `AdventureFocusPlay` is 353 lines at planning time. Keep artwork logic in a dedicated manager and component; component grows only by mounting and passing props.
- All extracted behaviour carries positive/negative tests; avoid speculative unrelated cleanup.

### User Help Check

- [x] Plan `apps/web/src/lib/content/help/adventure-artwork.md`, linked from Adventure Mode and registered with help-engine.
- [x] Explain controls, precedence, AI provenance, Keep snapshots, private/public distinction, offline/cache limits and cloud consent.
- [x] Consider a dismissible first-use hint beside artwork; it must not obscure narration or become a prerequisite for play. Existing Help access is sufficient if that hint adds clutter.

## Project Structure

### Documentation (this feature)

```text
specs/181-adventure-artwork/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/artwork.md
```

`tasks.md` is produced by the next workflow step, not by this plan.

### Source Code (repository root)

```text
packages/schema/src/adventure-artwork.ts             # shared persisted shapes
packages/adventure-artwork-engine/
  src/{catalogue,cues,matching,selection,associations,cache-policy}.ts
  src/catalogue/{index,seed}.ts                       # metadata only
  tests/                                             # pure contracts and fixtures
packages/adventure-engine/src/
  {artwork-state,people,people-types,scene-identities,scene-types}.ts
  {types,schemas,state-machine}.ts                    # bounded composition seams
apps/web/src/lib/services/adventure/artwork/
  {catalogue-service,artwork-resolver,artwork-cache,collection-downloads}.ts
  {snapshot-service,artwork-repository,artwork-promotion}.ts
apps/web/src/lib/stores/oracle/adventure-artwork.svelte.ts
apps/web/src/lib/components/oracle/adventure/artwork/
  {AdventureSceneArtwork,AdventureNpcPortrait,ArtworkChooser,ArtworkSettings}.svelte
apps/web/src/lib/services/cloud-backup-artwork.ts      # focused enumeration/collection adapter
apps/web/src/lib/content/help/adventure-artwork.md
apps/web/tests/adventure-artwork.spec.ts
scripts/validate-adventure-artwork.mjs
```

**Structure Decision:** Shared persisted types belong to schema; pure artwork policy belongs to the new engine; general people identity belongs to adventure-engine. Browser/network/storage and UI stay in web. Private snapshots use existing Vault asset IO; shared images live exclusively in R2, referenced by immutable metadata.

## Phase 0 — Research Decisions

See [research.md](research.md) for evidence, alternatives and budgets. Reuse genre normalisation from `world-style.ts`, but do not import the Svelte theme store into the pure engine. Workspace/unknown means neutral-only. The existing external-image cache is not the public collection cache. Neither local file placement nor entity-image APIs prove backup coverage or immutable Keep behaviour.

## Phase 1 — Design and Delivery

### Slice 1: location artwork and essential controls

1. Shared persisted schemas, catalogue ingestion gate and pure matching/precedence tests. Release 24 reviewed landscapes and their variants through R2; no local bitmap is committed. Mandatory generated provenance and human approval are independent of AI being enabled at runtime.
2. Add optional session/canonical associations; build exact Keep snapshot operation. Update owner ZIP/cloud backup/restore, dirty signalling, media reference enumeration/pruning and guest sanitisation. Adventure writes/deletions and inclusion changes request an existing full push; subsequent entity-only deltas preserve the adventure collection and its live snapshot references. Do not extend the Worker delta protocol in this feature: its current section allowlist would silently omit an adventures delta. Existing backup size/quota errors must remain recoverable and preserve the last successful remote state. Ship expanded cloud payload only after the opt-in inclusion gate.
3. Compute eligible provisional association changes on the candidate session with pure code before its existing revision save; no fetch or new failure path is added to commit. Quarantine malformed optional artwork for display and mutation while preserving its original opaque value on unrelated saves and in owner recovery; it must never fail a valid narrative turn. Display automatic results only after commit. Canonical automatic choices are saved best-effort after the turn via the focused artwork manager; a failed artwork save leaves the narrative committed and presents text-only/retry for that selection. First canonical assignment is write-once under the shared entity lock.
4. Run image loading after persisted selection, checking current Vault/session/subject identity after every await. Image/display state is independent of the narration generation phase. UI mutations require current control and are disabled while an incompatible turn/save is in flight; re-read latest records before patching.
5. Mount a single current-location component and compact chooser; add setting and removal controls for automatic cache, R2 loading, offline fallback and credits. Validate mobile/desktop/focus/disabled network behaviour and backup round trips before release.

### Slice 2: stable people and explicit scene identities

1. Implement a general persistent people registry, safe canonical/provisional links and optional bounded player-visible subject references. Include people in current scene context so the existing GM response may refer to known IDs; never ask a second model to resolve identities. Unknown IDs/aliases are ignored for artwork and cannot fail a turn. Do not create people from prose names alone.
2. Add explicit scene-transition references only to the current turn contract, with stable scene IDs bounded by the session; no mood-driven scene creation. Locations remain the fallback subject when a scene has no eligible asset.
3. Extend `FactPromotionDeps.linkRecord` / `AdventureSurface` composition from place-only to general exact identity links. Title-only existing-record matches are not evidence for person identity; require explicit selection when ambiguous. Transfer associations with a retryable two-step journal; existing canonical explicit choices win over automatic sources, explicit-vs-explicit conflict is shown for user resolution. Keep local recovery data until both saves succeed.
4. Add NPC slots without large repeated transcript images. Cover leaving active state, alias use, same names, hidden subjects, canonical collisions, promotion retries and restore. An atmosphere illustration may serve as the fallback for an explicitly identified, committed scene when no suitable scene image exists; it belongs to that scene, never creates a subject from mood alone, and remains stable across ordinary turns.

### Slice 3: optional collections

1. Add collection metadata, download management, preflight size/credits, installed membership and removal suppression. Download only validated full files; cancellation preserves completed subset and retry fetches only missing files.
2. Installed collections protect bytes from automatic eviction. Shared variants are counted once; removal deletes only bytes with no remaining collection membership, retaining associations and user snapshots. A removed collection is not re-fetched by rendering until explicitly re-enabled.
3. Reconcile the persisted index and cache after crashes/browser eviction. Unavailable storage gives text-only or explicitly uncached rendering without claiming offline installation. Validate quota and interruption behaviours before claiming collection support.

### Release and validation gates

See [quickstart.md](quickstart.md) and [contracts/artwork.md](contracts/artwork.md). Run affected tests, changed-file lint, scoped typechecks, Fallow and codex-review. R2/catalogue validation, owner restore and guest asset-manifest tests are required for slice 1. Do not run repository-wide validation locally. This document and its generated companions are design-only; implementation/tests/assets are subsequent work.

## Complexity Tracking

No constitution deviation. The opt-in remote backup extension is designed to meet all six existing exception conditions rather than waive them. No new database, third-party dependency, AI request or canonical world store is proposed.
