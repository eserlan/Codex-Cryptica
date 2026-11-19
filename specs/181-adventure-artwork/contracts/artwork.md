# Contracts: Adventure Artwork

These are proposed implementation interfaces and observable behaviour, not new HTTP endpoints. All services use constructor injection, production defaults/singletons at app assembly, and small mockable ports.

## Pure library

| Operation             | Inputs                                                                                | Result / invariant                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `parseCatalogue`      | bounded released metadata                                                             | approved generated assets only; errors identify public asset/field, never private scene data                               |
| `matchArtwork`        | validated catalogue, subject type, controlled visible cues, genre                     | asset ID or null; eligibility first, primary score 8, context 4, mood/time 1, threshold 8 plus primary match, ID tie-break |
| `resolveArtwork`      | enabled flag, persisted association, available Vault image descriptor, eligible match | source descriptor or none with internal reason; precedence exactly FR-007                                                  |
| `applyArtworkCommand` | current association, Keep/Replace/Dismiss/Restore automatic command                   | next validated association or unchanged failure; no IO                                                                     |
| `planCacheMutation`   | actual public bytes/membership, budget, requested variants                            | allowed download/eviction plan or explicit capacity error; installed packs protected                                       |

Unknown/Workspace genre permits only explicitly neutral assets. No operation accepts hidden-state objects, raw untrusted URLs, model-selected asset IDs or arbitrary prose as direct catalogue keys. Existing valid assignments bypass ranking. Visual content changes allocate a new asset ID; metadata revisions cannot repoint an old ID to a different picture. Kept catalogue variants retain their immutable digest; withdrawal still gives the specified unavailable-picture fallback. Withdrawn assets are not returned even when cached. Malformed optional cues mean no new selection, not a rejected narrative turn.

## App ports and commands

### Artwork repository

- `read(subject, vaultContext)` resolves the current owner record and association.
- `mutate(subject, command, expectedVersion, controlContext)` re-reads after awaits, verifies current ownership, serialises the narrow write and returns `{ok:true, association}` or `{ok:false, reason}`.
- Commands accept validated subject IDs and chosen public asset IDs or an internally verified snapshot descriptor. UI cannot submit a remote source URL to create a snapshot.
- Session mutation uses current lease and session revision; canonical mutation uses a shared Vault/entity artwork lock plus existing entity partial-update save queue. Same entity in two adventures shares a preference; unrelated entity fields and transcript changes are preserved.
- If cross-tab lock support is unavailable, canonical mutation must fail as a retryable control/storage limitation unless an existing equivalent atomic Vault adapter provides exclusion. Do not silently downgrade to whole-record last-writer-wins.
- Generation and image network calls do not hold canonical artwork locks. UI mutations during incompatible narrative writes are deferred/disabled rather than racing a stale session save.

### Snapshot storage

- `preserveResolvedImage` reads the already resolved source with existing image IO, validates `image/png`, `image/jpeg` or `image/webp` against declared MIME, file signature and bounded decode/size/dimensions, writes exact bytes to a unique private path and verifies the result before returning a snapshot descriptor.
- Existing external arbitrary URLs are not sent to a new third-party service. Remote source retrieval follows the current user-image resolver; catalogue fetch restrictions do not broaden user-image network permissions.
- Limit 16 MiB/32 megapixels. Over-limit/unsupported/unreadable input yields a plain Keep failure without conversion or a false success.
- Thumbnail is a derivative; the preserved source remains byte-exact. Failed preference saves clean only newly unreferenced snapshots; interrupted operations are recoverable by conservative maintenance.

### Subject and scene adapter

`describeCommittedSubject(session, visibleRecords)` returns subject ID, public-eligible cue IDs and genre only; at most 24 controlled cue IDs of 1–64 characters, dropping unknown/duplicate entries before matching. It never receives `hiddenState`, secrets or unrevealed scenario truth. Caller passes selected visible projections, not a full session to the matcher. Existing `genreForTheme` maps to controlled genre IDs; no unknown default to fantasy.

SourceRecord IDs/canonical links are local identity only. NPC references use existing linked canonical/provisional IDs or an explicit stable person ID echoed in the normal response. Ambiguous names or unsupported IDs return no subject. Explicit scenes refer to current place and commit atomically with narrative state; rejected/streamed proposals have no artwork effects.

### Public asset service

- `loadVariant(publicAssetId, variant, {signal, purpose})` reads validated cache or fetches an immutable allowlisted first-party URL with `credentials:'omit'` and `referrerPolicy:'no-referrer'`.
- Enforce status, final URL, declared bytes, WebP MIME, SHA-256 and dimension bounds before insertion. Count actual stored bytes. Stream size guard aborts before downloading beyond limit.
- Deduplicate in-flight variants, with subscriber cancellation: one abandoned view cannot cancel another live consumer; abort shared fetch when no consumers remain. Two active network fetches maximum, eight-second deadline each.
- Return a managed Blob/object-URL handle with explicit release. A failed load never asks for another match automatically or changes the saved assignment.
- `enabled=false` prevents automatic loads, aborts existing automatic consumers and clears their display URLs. Explicitly confirmed collection downloads use a separate purpose and cancellation control.
- Removed pack suppression prevents ordinary render from refetching any asset available only through suppressed packs; assets shared with a still-installed pack remain available.

### Collections

`install(collectionId)`, `cancel(collectionId)`, `retry(collectionId)`, `remove(collectionId)` operate against versioned manifests and the device index. Preflight exact missing-byte total and protected cache footprint; refuse capacity overflow before bulk fetch. Progress reports validated bytes/files only. Cancel retains complete validated subset, never marks installation complete. Remove respects other installed memberships, preserves subject choices and records suppression. An index claiming complete installation is insufficient if browser eviction removed files; reconcile and report incomplete/offline-unavailable accurately.

## UI contracts

- One scene card near current header; reserved aspect ratio; concise public-safe alt and visible AI illustration/credit access. NPC portrait slots use stable identity and modest sizing.
- Keep, Choose another, Dismiss, Restore automatic and Adventure illustrations controls are present in slice 1. Selector cancellation preserves draft, selection and focus. Read-only/guest states expose no mutating owner controls.
- No automatic focus, scroll or narration rewrite after image completion; old promise results cannot paint after subject/session/Vault changes.
- Keep success is shown only after durable snapshot and preference persistence; a slow Keep shows progress and may be cancelled before mutation. Cancelled work cannot later publish an override.
- Error messages use plain names for action/retry, without paths, storage jargon, narrative data or raw exception dumps.

## Backup / export contracts

- `CloudBackupPayloadResult.bundle.adventures?: AdventureDocument[]` is additive; default omission when inclusion consent is absent. Include active and archived owner documents; recovery documents are preserved for owner recovery without trusting malformed artwork references.
- Adventure changes and inclusion removal use the existing full-push dirty marker. Entity-only delta uploads retain the existing adventures section and include all its live media references. The current Worker delta allowlist does not support an adventures section; never send such a delta and claim success. Enforce current request/storage limits; failure must retain local dirty changes and the last good remote snapshot.
- The expanded data inclusion gate is visible before auto-sync reads/transmits adventure documents. Existing entity/media backup semantics remain intact. Turning inclusion off updates remote bundle/reference sets, prunes only truly unreferenced files and retains all local data.
- Snapshot reference enumerator handles entity and local associations, pending links and known recovery forms; validate safe relative paths. Unsafe/unknown references must never cause external fetch, path traversal, or private file publication.
- Owner ZIP and accepted cloud round trips restore associations AND immutable source bytes after replacing/deleting the original Vault image.
- Guest/public contracts exclude private artwork fields, adventure JSON and private snapshot paths/media in both metadata and file manifests.

## Required test families

Catalogue invalid-input table; deterministic tie/genre/no-primary/no-match; complete precedence table; all control transitions; failed/cancelled Keep; exact snapshot bytes; no-churn/commit-only; NPC identity/alias/same-name/promotion conflict; owner ZIP/cloud full+delta+disable restore; guest actual payload/asset enumeration; cache/network corruption/quota/redirect; namespace survival across shell update; collection shared ownership/removal/cancel/crash; 390 × 844 and 1440 × 900 keyboard/focus/layout and image-disabled network checks.
