# Research: Adventure Artwork

Date: 2026-11-12. Inputs: [spec.md](spec.md), the two recorded clarifications, repository inspection, and focused persistence/cache research. All decisions below are planning decisions; no runtime code or assets have been added.

## 1. Separate reusable policy from browser coordination

**Decision:** Add `packages/adventure-artwork-engine`, a framework-free library for catalogue validation, controlled cues, eligibility, deterministic matching, precedence, association transitions and cache-budget calculations. Shared persisted association schemas live in `packages/schema/src/adventure-artwork.ts`; both artwork and adventure engines consume them without circular dependencies. App services own fetch, CacheStorage, Vault operations and reactive display.

**Rationale:** Existing `packages/adventure-engine` owns narrative state and `AdventureManager` composes focused workflows. Image matching/storage is a separate responsibility. Existing Zod, runtime helpers and browser APIs suffice; no third-party dependency is needed.

**Alternatives:** Putting everything in OracleStore violates bounded responsibility. A generic asset-platform rewrite is unnecessary. Importing Svelte state into framework-free engines or AI workers is excluded.

## 2. Reuse place identity; establish durable people identity before portraits

**Decision:** Reuse `Place.id`, `Place.sourceRecordId` and `currentPlaceId` from `packages/adventure-engine/src/types.ts` and `places.ts`. For slice 2, add a separate optional `people` registry and player-visible subject references; do not use an active-character entry's text as identity. Existing canonical record IDs and committed person provisional-fact IDs can establish identity. Recorded explicit aliases refer to an already resolved identity; same-name lookup cannot establish or merge one.

**Rationale:** `activeCharacters` is transient and `StateFact.id` identifies a fact, not a person. Existing `promoteProvisionalFacts` has `findExistingId(title)` and a `linkRecord` callback; artwork must not inherit title-only identity matching.

**Alternatives:** Name hashes merge different people; interpreting every prose name invents subjects. A second private world database would compete with Vault canon.

## 3. Persist choices with existing owners

**Decision:** Add optional `Entity.adventureArtwork` for canonical choices shared within a Vault; add optional `AdventureSession.artwork` for provisional place/person/scene associations. Use an explicit canonical link to redirect subject lookup rather than making duplicate canonical preference documents. Artwork entity updates use partial updates through the existing Vault editing path; session commands use existing lease and expected-revision saves.

**Rationale:** `AdventureSessionRepository.save` checks revision and returns `{ok:false}` on failure; callers must not assume rejection. `AdventureRuntime.saveTurn` is the committed narrative boundary. Entity metadata already follows entity export and restore.

**Alternatives:** One global localStorage assignment map would lose backup and Vault scope; a new world JSON registry duplicates canonical ownership.

## 4. Keep preserves a private picture, not a mutable path

**Decision:** Keeping a Vault picture copies its validated bytes to a new unique local Vault image path (`images/artwork_<id>.<validated-extension>`). A durable source reference stores this immutable snapshot. Read through existing image resolution, but write a byte-preserving asset operation: `saveImageToVault` re-encodes and cannot promise exact bytes. Reject Keep if preservation fails; do not publish an override first. Snapshot files are not public stock assets or disposable caches.

**Rationale:** Entity-image replacement/deletion can remove the original path. Clarification A requires the kept image to survive this, reload and owner backup/restore.

**Alternatives:** Pinning `Entity.image` follows future edits. Using `.cache/external_images` loses originals during pruning. Copying to R2 would introduce remote private-data storage.

## 5. Backup/restore requires explicit work

**Decision:** Extend owner backup/export reference enumeration to include snapshot references and adventure documents. Cloud Backup's bundle gains an optional `adventures` collection and its restore/dirty lifecycle gains matching support. Missing collections remain backwards-compatible. The Worker full snapshot stores arbitrary non-entity sections, but `cloud-backup-delta.ts::prepareBundleSections` currently accepts only maps/canvases/assetManifest. Initially mark adventure writes, deletions and inclusion changes with the existing `requireFullPush` path; entity-only deltas preserve the previous adventures section and must enumerate its current media references. Do not send an unsupported adventures delta and mistake an HTTP success for persistence. Per-adventure incremental protocol/sharding is deferred; existing backup request/storage limits must fail visibly without deleting the last good snapshot. Keep the existing explicit Cloud Backup opt-in; no upload occurs when it is off. The new inclusion gate covers all adventure-artwork metadata and private snapshot references, even inside canonical entity projections and entity-only deltas; ordinary entity images retain their existing scope. Disable clears those remote fields/references while retaining local data. Update help/consent descriptions to identify that enabled backups include adventures and their private GM material, and retain existing disable/delete controls.

**Evidence:** `apps/web/src/lib/services/cloud-backup-payload.ts` currently bundles entities/maps/canvases/session journals; `collectAssetPaths` does not inspect artwork. `apps/web/src/lib/stores/cloud-backup-restore.ts` only restores those collections. Merely putting JSON under `.codex/adventures` does not prove cloud coverage.

**Rationale:** FR-012 is a release gate. Owner export, cloud payload, remote media eligibility, restore and sanitised guest export each need round-trip tests.

**Alternatives:** Pretending current backups already cover adventure JSON leaves a data-loss bug. Serialising images inside session JSON bloats every turn. A separate cloud artwork feature would undermine existing controls.

## 6. Public catalogue cache is separate from private Vault assets

**Decision:** Use injected CacheStorage/fetch/index adapters in app services, namespace `codex-adventure-artwork-v1`. Read validated public bytes and return bounded-lifetime object URLs. Keep private snapshots under normal Vault storage. Device-local index stores LRU, completed collection membership and removal suppression; reconcile it against cache contents after interruption.

**Evidence:** `packages/vault-engine/src/external-image-cache.ts` uses per-Vault `.cache/external_images`, prunes full originals, and has no total budget or pack cancellation. External network code has an eight-second timeout but no caller signal or catalogue checksum validation. `apps/web/src/service-worker.ts` bypasses cross-origin R2. `service-worker/lifecycle.ts` removes `cache-*` namespaces and preserves other image caches.

**Alternatives:** Extending shell SW fetch ownership would cache unrelated external media. Reusing the existing external-image cache would lose packs/snapshots or require an unrelated rewrite.

## 7. Concrete catalogue and storage budgets

**Decision:** Start with 24 human-reviewed establishing landscapes spread across fantasy, contemporary, science-fiction and horror, including explicitly neutral landscapes where appropriate. Grow towards 100–200 assets after validating selection quality. All shared assets are team-generated AI illustrations with mandatory model/tool/date/prompt provenance, human approval, distribution basis and reference-material permission records. Catalogue is lazy-loaded and at most 256 KiB uncompressed for up to 200 released assets; split optional collection indices if needed to retain this limit.

- Landscape display: up to 1280 × 720, at most 384 KiB.
- Portrait display (slice 2): up to 768 × 1024, at most 256 KiB.
- Preview: up to 320 pixels on the longest side, at most 32 KiB.
- WebP variants only initially; declared byte count and SHA-256 required.
- Automatic public cache: 32 MiB. Explicit collections: at most 100 MiB each, 256 MiB total public artwork storage including automatic cache.
- Installed collections are not evicted silently; refuse a download that cannot fit and offer removal. Shared files count once. Automatic LRU evicts only unprotected public bytes and never assignments.
- At most two fetches concurrently; eight-second timeout per fetch plus caller cancellation. No automatic retry loop; explicit retry resumes missing files.
- Private snapshots: at most 16 MiB/file, PNG/JPEG/WebP only (declared MIME, file signature and bounded decode must agree), at most 32 megapixels. If the original exceeds this, Keep fails plainly without changing the image or choice. Durable snapshots are excluded from public eviction budgets; show their storage separately.

**Rationale:** These are conservative, testable engineering budgets rather than promises inferred from current measurements. Build-time validation rejects over-budget catalogue/assets; device quota errors remain supported failures.

## 8. Eligibility and matching

**Decision:** Reuse `services/adventure/world-style.ts::genreForTheme` at the app boundary; map unknown/Workspace to neutral-only. Require exact subject type, human approval, non-withdrawn status and compatible genre before scoring. Controlled primary cues: environment for location/scene/atmosphere and visible archetype for NPC. Primary match = 8 points, setting/context = 4, mood/time = 1 each; threshold 8 AND at least one primary cue. Contradictions exclude, ties use ascending stable asset ID. Atmosphere assets cannot silently replace portraits or location images. A generic human portrait never asserts hidden ancestry/profession.

**Rationale:** Mood alone must not match an unrelated place. Existing assignments do not rerank after catalogue changes. Cues come from committed visible structured state; a small deterministic dictionary may map visible place terms, but uncertain cues produce no illustration. No extra LLM call or schema requirement is added to slice 1.

**Alternatives:** Sending narrative to image search breaches privacy; asking the model to select URLs adds nondeterminism and asset-injection risk.

## 9. UI and browser behaviour

**Decision:** One current-scene artwork component, small portrait slots in slice 2, and a shared compact selector. Use Svelte 5 runes, semantic Tailwind tokens, Iconify utilities, existing modal/focus patterns and constructor-injected services. Reserve aspect ratio/dimensions. Lazy-load offscreen images; current visible art loads only when enabled and eligible. Narration/action entry never awaits image bytes. Revoke object URLs on source change/unmount; request identity guards suppress late results after session/place switches.

**Evidence:** Existing `AdventureFocusPlay.svelte` is 353 lines. Modern-web-guidance `optimize-image-priority` was consulted: explicit dimensions, offscreen lazy loading and no high-priority lazy image combination. Fetch priority is progressive enhancement.

**Alternatives:** Adding pictures to every transcript turn creates churn and mobile obstruction. Adopting a new UI or image library is unnecessary.

## 10. Conflicts and promotion

**Decision:** Re-read ownership/revision after async snapshot/fetch work. Serialize artwork-only canonical edits by Vault/entity using an injected lock adapter; use the existing partial entity update/save queue rather than rewriting captured entities. If a control lease changes, abort mutation. Canonical explicit choice/dismissal already present wins over an automatic provisional assignment. Conflicting explicit provisional and canonical preferences require an inline choice; preserve the local association until resolved and never silently overwrite either. Do not infer identity through the existing title-only promotion shortcut; require an exact record link or explicit user confirmation.

**Rationale:** Several adventures may share a canonical entity while having separate session leases. Cache work must not hold a narrative lock or apply captured session state after an await.

**Alternatives:** Last-writer-wins on whole session/entity snapshots can discard turns or user preferences. Automatic name-based merging defeats portrait identity guarantees.

## Analysis hardening

Visual content changes allocate a new asset identity; metadata version changes cannot replace a kept picture. Optional query/scene cues are limited to 24 controlled IDs of 1–64 characters. Artwork-bearing entity cloud projections obey the same new inclusion gate as adventures, rather than inheriting ordinary entity upload consent. These refinements close cross-artifact gaps identified during task analysis.

## Implementation boundary check (T001)

`bunx fallow guard` confirms that adventure-engine modules may import the schema zone, while web modules remain in their existing application/Vault zones. The checked branch has `schemas.ts` at 694 lines (session/proposal parsing), `types.ts` at 539 lines (adventure domain contracts), and `AdventureSurface.svelte` at 639 lines (adventure surface composition). Artwork validation belongs in focused schema modules, people/scene contracts in dedicated adventure-engine modules, and promotion/artwork orchestration in a sibling service; the surface should only compose those services. Existing tests must follow any extracted behaviour. Checked integration seams below the review trigger are `cloud-backup-payload.ts` (419), `schema/src/entity.ts` (282), and `vault/entity-editing.ts` (69). Recheck sizes before subsequent edits because this is a long-running feature branch.
