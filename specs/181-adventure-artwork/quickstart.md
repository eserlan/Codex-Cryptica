# Quickstart Validation: Adventure Artwork

This is a validation guide for the planned implementation. The new package, commands, asset catalogue and tests below must be added during implementation; they are not claimed to exist yet. See [contracts/artwork.md](contracts/artwork.md) for exact boundaries and [data-model.md](data-model.md) for persisted fields.

## Prerequisites

- Bun 1.3.14 and repository dependencies (`bun install --frozen-lockfile` for a fresh checkout).
- Owner demo/test Vault with two locations, attached local images, two same-name NPC fixtures and an existing adventure. Use synthetic content, not real private campaigns, for test traces.
- Released seed catalogue and image variants uploaded to `assets.codexcryptica.com/adventure-artwork/`; local generation files deleted after upload and never staged.
- Playwright Chromium installed (`bunx playwright install chromium`) and network access to the first-party asset host for the no-argument release gate. The gate fetches every non-withdrawn variant and decodes it in Chromium; missing browsers, unreachable files or invalid bytes fail the gate.
- For cloud scenarios, a disposable owner backup with adventure inclusion initially off. Remote test resources must be explicitly created and cleaned up; ordinary unit tests use injected adapters, not a real account.

## Focused automated checks

Run repository scripts through Bun. Never run repository-wide test/lint/typecheck commands locally.

```bash
# Root: catalogue ingestion and budget/provenance gate. It must validate the
# assembled release catalogue against the last released manifest, then fetch and
# decode each uploaded variant; explicit JSON paths perform metadata-only checks.
bun scripts/validate-adventure-artwork.mjs

# Root: changed-file gates after changes are visible to the scripts.
bun scripts/lint-changed.mjs --base origin/staging
bun scripts/test-changed.mjs --base origin/staging
bun scripts/affected-workspaces.mjs --base origin/staging

# Scoped web typecheck, from apps/web.
bunx svelte-check --tsconfig ./tsconfig.json --threshold error

# New engine's unit suite, from packages/adventure-artwork-engine.
bun test

# Run the repository-supported coverage runner scoped to this new package;
# record its command and report, and verify at least 70% before first merge.

# Root: before commit/push; inspect verdict, not just process exit.
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Changed-file scripts compare committed refs in their base/head mode. Before committing, use scoped explicit tests/lint or their supported staged/file interfaces rather than interpreting “no changed files” as validation. Scope pure package TypeScript checks to affected workspace tsconfigs; do not invoke a root-wide checker.

Required impacted test paths include the new engine tests; app artwork-service/component tests; `adventure-session-repository.test.ts`; `adventure-provisional-fact-creator.test.ts`; `adventure-engine/tests/schemas.test.ts`; `GuestExporter.test.ts`; `asset-storage.test.ts`; `cloud-backup-payload.test.ts`; `cloud-backup-roundtrip.test.ts`; cloud dirty/media-prune tests; and `vault-archive.test.ts`. Run only those touched by each slice.

For targeted browser validation, from `apps/web`:

```bash
bunx vite dev --port 5173 --strictPort
# Separate shell, once the test has been implemented:
bunx playwright test tests/adventure-artwork.spec.ts
```

## 1. Stable location image and precedence (slice 1)

1. Enter a linked location with a Vault picture. Confirm that picture and a small credits/illustration control appear without delaying narration.
2. Continue for five turns, changing mood/time without changing place. Confirm no automatic asset reassignment.
3. Enter an unillustrated place with an eligible primary cue; confirm one saved catalogue assignment. Visit another place, reload and return; confirm the same asset.
4. Test fantasy, contemporary, science-fiction and horror fixtures. Unknown/Workspace permits neutral-only; unrelated/mood-only cues show no image.
5. Cancel a streamed move and fail a narrative save. Confirm the previous picture/assignment remains authoritative.
6. Delay an image load, then switch location, adventure and Vault. The old result never paints, changes focus, scrolls or modifies the action draft.

## 2. Keep, replace, dismiss and disable (slice 1)

1. Keep a catalogue picture, then release a metadata-only version correction and a visually different replacement with a new asset ID. Verify the kept digest does not change.
2. Keep a Vault picture. Capture its digest, then replace/delete the entity's ordinary image. Reload; the kept picture still has the captured digest.
3. Restore automatic. Confirm the new current Vault image or documented fallback takes effect.
4. Choose another, cancel the selector, dismiss, revisit and reload. Each operation follows the precedence table; dismissal suppresses every fallback until restored.
5. Simulate snapshot write failure, preference `{ok:false}`, loss of lease and cancellation. No false success, partial override or overwrite of committed narrative progress.
6. Disable illustrations while loading. Confirm no automatic artwork requests continue/start, no images display, and choices remain saved for re-enable.
7. At 390 × 844 and 1440 × 900, exercise controls by keyboard in Ancient Parchment, Sci-Fi Terminal and Workspace, including light/dark where available. No horizontal overflow, composer obstruction or focus loss; screen readers receive useful alt and action names.

## 3. Durable owner restore and guest safety (slice 1 release gate)

1. Keep a local picture, replace/delete its original image, then owner ZIP export/import into a disposable Vault. Verify association, exact preserved bytes and continued play.
2. With Cloud Backup enabled but adventure inclusion off, confirm no adventure documents, canonical `adventureArtwork` fields or artwork snapshot references enter outgoing full/entity-delta/media payloads; verify source entity objects are unchanged by projection. Existing consented entity backups continue normally.
3. Accept the expanded inclusion disclosure, back up active and archived adventures and private snapshots, then restore into a clean disposable Vault. Verify full and subsequent delta backup round trips, including changed/deleted original pictures.
4. Disable adventure inclusion. Verify its remote documents and newly unreferenced media are removed, other entity/shared references remain, and all local adventures/pictures remain. Verify full backup deletion controls still work.
5. Guest-export/publish the same Vault. Inspect both serialised entity metadata and actual uploaded/exported media manifests: no `adventureArtwork`, adventure documents or private snapshot path/bytes. UI invisibility alone does not pass this check.

## 4. NPC and scene continuity (slice 2)

1. Establish one NPC with an exact visible fact/record ID, assign a portrait, leave the scene, reload and return via an established alias. Confirm same identity and portrait.
2. Meet a different same-name NPC; confirm no identity merge. An unresolved prose name or hidden GM-only person shows no portrait.
3. Promote the original NPC to a Vault entity. Retry interrupted links. Confirm one exact person link, no duplicate entity, preserved kept picture and unchanged ordinary entity image.
4. Link to an existing canonical record with a different explicit preference. Confirm an explicit conflict choice, retained recoverable local association, and no silent overwrite.
5. Commit a scene transition within a place; confirm stable scene identity and no mood-only scene allocation. Unknown model IDs/invalid optional cues do not fail otherwise valid turns.

## 5. Offline, storage and packs (core cache in slice 1; collections in slice 3)

1. Cache a public variant and go offline; verify available images and text-only fallback for uncached ones. Do not claim permanent offline availability from Keep alone.
2. Test wrong MIME/hash/bytes, HTML, unsafe redirects, partial response, timeout, quota failure and unavailable CacheStorage. Narration/action entry remains usable, corrupt data is not cached.
3. Exceed the 32 MiB automatic budget; confirm LRU eviction affects only disposable public bytes, not associations, installed packs or snapshots.
4. Install a collection after size/credit review. Cancel halfway, retain validated subset, retry missing files and go offline after completion. Progress counts only validated files/bytes.
5. Install overlapping collections and remove one. Shared files required by the other remain. Removed-only assets are not automatically fetched on revisiting subjects.
6. Exceed protected storage capacity. Installation refuses before bulk transfer and offers removal rather than evicting installed collections.
7. Simulate index/cache divergence and a service-worker shell update. Reconcile actual availability and preserve `codex-adventure-artwork-v1`; old `cache-*` shell eviction does not remove artwork packs.

## Acceptance evidence

Record commit, seed manifest digest, catalogue byte size, relevant test commands/results, matching benchmark fixture/runner and browser/theme/viewport evidence. Network traces must use synthetic data and demonstrate no private cues in asset requests and no extra image-selection AI/search call. Do not mark the entire issue complete when only slice 1 has shipped.
