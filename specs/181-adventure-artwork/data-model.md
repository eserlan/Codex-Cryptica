# Data Model: Adventure Artwork

## Ownership and dependency direction

Shared persisted shapes: `packages/schema/src/adventure-artwork.ts`. `adventure-artwork-engine` and `adventure-engine` consume schema; schema never imports either engine. Browser IO and Svelte state never enter those packages. Stock catalogue schema is private to artwork-engine, separate from user image sources.

| Data                             | Owner                      | Persistence                                                         |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| Public asset/collection metadata | application release        | lazy metadata chunk; immutable R2 URLs for image bytes              |
| Canonical artwork association    | Vault entity               | optional `Entity.adventureArtwork` field                            |
| Provisional/scene association    | adventure                  | optional `AdventureSession.artwork`                                 |
| People and scene identity        | adventure domain           | optional `people`, `scenes`, `currentSceneId` on session            |
| Kept user-image bytes            | Vault                      | unique `images/artwork_<opaque-id>.<ext>`                           |
| Public image bytes               | device                     | `codex-adventure-artwork-v1` cache, disposable                      |
| Cache/collection preferences     | device                     | injected localStorage-like index; no private subject/narration data |
| Visibility                       | device                     | `codex-adventure-artwork-enabled`, default true                     |
| Expanded cloud inclusion         | owner backup configuration | explicit `includeAdventures` acceptance, default false              |

## Public catalogue

### ArtworkAsset

- `id`: immutable public kebab-case ID, max 100 characters, globally unique.
- `version`: positive integer. Visual changes MUST create a new asset ID, not mutate the picture behind an existing ID. Descriptive/provenance corrections may increment the metadata version; every historical variant URL/digest remains immutable, and metadata changes never rerank existing assignments.
- `type`: `location | npc | scene | atmosphere`.
- `genres`: nonempty controlled IDs; explicit `neutral` is permitted. Unknown genres fail catalogue validation.
- `primaryCues`, `settingCues`, `moodCues`, `timeCues`, `excludes`: bounded controlled Labels, no duplicates. At most 24 cues total per asset. Catalogue maintainers map cultural/architectural contexts to curated setting cues; they do not infer sensitive character traits from a portrait.
- `alt`: concise public description, 1–240 characters, never private scene text.
- `variants.preview`, `variants.display`: `{url, mime:'image/webp', width, height, bytes, sha256}` with the plan's size/dimension limits. URLs allow only `https://assets.codexcryptica.com/adventure-artwork/…`; no query/fragment/credentials. The decoded path contains only public catalogue identifiers.
- `crop`: optional focal point, finite x/y from 0 to 1.
- `origin`: literal `team-generated-ai`.
- `provenance`: tool, model, generated date, public-safe generation prompt/reference record, responsible team creator, distribution-basis record, reference-material permissions, required attribution.
- `review`: mandatory approved status, reviewer, date and notes. No unapproved entry reaches the released matching index.
- `withdrawn`: default false; removed/withdrawn assets cannot load or be newly selected, even if previously cached. Associations retain their historical ID for explicit replacement/recovery.

Catalogue ingestion rejects duplicate IDs, unsupported types/genres/cues, licensed-stock origins, missing review/model/distribution records, oversized files and non-allowlisted URLs. No runtime AI request is necessary to validate or use it.

### ArtworkCollection

`id`, `version`, title, coverage description, asset ID list, unique variant list, total bytes, credits and versioned manifest digest. All referenced assets must be approved and known. Maximum 100 MiB per collection and 256 MiB public storage overall; calculation counts shared variants once. A removed collection remains in device suppression state until explicit download/re-enable.

## Subject identity

- Canonical: `{kind:'entity', entityId}` with Vault scope supplied separately; entity IDs never enter public image requests.
- Local place: `{kind:'place', placeId}` referencing existing `Place.id`.
- Local NPC: `{kind:'person', personId}` referencing the new general `AdventurePerson` registry.
- Local scene: `{kind:'scene', sceneId}` referencing an explicit committed scene identity.

Session-local keys are encoded from validated IDs, not arbitrary paths or names. A canonical link redirects to the entity-owned preference. Narration and model output cannot directly write these keys.

### AdventurePerson (slice 2)

`id`, `displayName`, established aliases, optional `sourceRecordId`, associated player-visible `provisionalFactIds` and `stateFactIds`, and introducing turn ID. Names/aliases are descriptive, not unique keys. Bound to 200 people/session, 8 aliases/person, 120 characters/name, 32 linked fact IDs/person. Registry survives removal from `activeCharacters`. Provisional facts must have `kind:'person'` and `visibility:'player-visible'`; canonical records must resolve to a supported person/creature identity explicitly linked by the owner or authoritative ID. A hidden character cannot be registered via artwork selection.

A new person is created from an explicit committed person fact/reference, never a regex match against narration. Canonical IDs or linked provisional IDs resolve an existing person; a bare name/ambiguous alias yields no portrait. The existing GM call may echo registered IDs but unknown IDs do not mutate identity. Visible query/scene cues use the same controlled IDs as the catalogue: at most 24 total, each 1–64 characters; unknown/duplicate cues are discarded. Optional cue/identity data is bounded before matching, never unbounded narration input. Promotion requires exact person/provisional and destination entity IDs; title-only matches require user confirmation before linking.

### AdventureScene (slice 2)

`id`, `placeId`, `introducedOnTurnId`, visible bounded cues, and optional `endedOnTurnId`. Current scene belongs to the current committed place. New scenes require an explicit validated transition; mood/time updates do not allocate IDs. Bound to 200 scenes/session; at capacity use the existing location subject without fabricating another ID. No historical transcript image block is automatically added.

## ArtworkAssociation

Version 1, optional `automatic` and optional `override`:

- `automatic`: `{assetId, catalogueVersion, assignedOnTurnId}`. One stable assignment; never automatically rerank a valid existing value.
- `override`: discriminated union of `dismissed`, `catalogue` and `snapshot`.
- Catalogue override: immutable asset ID/variant digest (Keep pins identity, not cache bytes).
- Snapshot override: private local path, validated MIME (`image/png`, `image/jpeg` or `image/webp` only, checked against file signature and bounded decode), positive integer bytes/dimensions and SHA-256, plus optional private thumbnail path. It never points at the original mutable entity-image path or a remote URL.
- Association mutation includes expected revision/version at the app repository boundary. No full captured entity/session object is accepted as an artwork command.

`AdventureSession.artwork` is optional `{version:1, associations:[{subject, association}], pendingCanonicalLinks?:[…]}`. At most 200 local associations; duplicate subject keys rejected by the artwork parser. Artwork extensions are parsed independently: malformed optional artwork is quarantined for recovery/export and ignored for display, not allowed to invalidate otherwise readable narrative state. Opaque/future artwork extensions must be retained on unrelated saves rather than silently erased; their references block automatic snapshot cleanup until safely understood.

`Entity.adventureArtwork` is the association directly; canonical identity is already supplied by the entity. It is owner-only metadata and stripped from guest/public projections.

### Resolution order

1. Device disabled or subject dismissed → no picture, no automatic fetch.
2. Explicit catalogue/snapshot override → that exact picture, or text-only if unavailable.
3. Current available Vault entity image → current entity image.
4. Valid saved automatic catalogue assignment → that asset.
5. Suitable new catalogue match → persist once, then display.
6. Otherwise → text-only.

Do not rerank when current image loading fails. An unavailable Vault image may fall through to the saved automatic source; an unavailable explicit Keep may not. Missing/damaged snapshot can offer Replace/Restore automatic but cannot silently follow the entity.

### State transitions and durable writes

| Event                                            | Durable effect                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Committed new location, suitable automatic match | add assignment to candidate session using pure policy; expose after successful save                                                    |
| Canonical subject first match                    | entity artwork write-once via shared lock after committed turn; save failure does not undo narration                                   |
| Keep catalogue                                   | save explicit catalogue override                                                                                                       |
| Keep Vault image                                 | read exact validated bytes; write/verify unique snapshot; then persist override; only report success after both steps                  |
| Snapshot saved, preference fails                 | preserve previous preference; remove newly unreferenced copy, or queue reference-aware cleanup after crash                             |
| Replace                                          | persist selected catalogue override, preserving automatic history                                                                      |
| Dismiss                                          | save dismissal over all sources, retaining recoverable automatic selection                                                             |
| Restore automatic                                | clear explicit override, then apply current Vault/default precedence                                                                   |
| Vault image changed/deleted                      | automatic mode follows current image/fallback; kept snapshot unchanged                                                                 |
| Collection eviction/removal                      | remove only disposable bytes/membership, never associations/snapshots                                                                  |
| Promote provisional subject                      | journal exact link and source choice; conditionally save entity association; save canonical identity link; then retire local duplicate |

Promotion is idempotent. Destination explicit choice/dismissal wins over a source automatic assignment. Two different explicit choices require owner selection; retain local state until resolved. Retries must not create another entity or change its ordinary image. Every async stage checks current Vault/session/lease and applies a delta to reloaded state. Snapshot GC checks references across entities and all writable/recovery adventures; unknown formats disable aggressive GC. Deleting one entity/adventure cannot remove a snapshot referenced by another.

## Browser cache/index

Device key `codex-adventure-artwork-cache:v1`: version, known variant digests and actual bytes, LRU access records, installed collection membership, interrupted download progress and suppressed collection IDs. Write index on cache operations, not each render. Treat index as advisory; reconcile missing entries/files after crashes. No Vault ID, subject ID, private text or snapshot path is stored in this shared public index.

Only validated successful WebP blobs enter cache: exact byte count, SHA-256, final allowlisted URL, MIME and bounded decode. Reject opaque, redirected-outside-host, HTML/SVG, partial and oversized bodies. Two concurrent fetches; caller abort and eight-second timeout reach the actual fetch/stream reader. Installed collection bytes are protected from LRU, while a kept catalogue choice alone does not promise permanent offline bytes.

## Compatibility, export and privacy

- Missing optional fields mean original text-only adventures; preserve `schemaVersion:3` for additive compatible fields. Unknown artwork versions use safe read-only artwork recovery without disabling narrative playback.
- Owner ZIP includes ordinary adventure JSON and snapshot files; test actual archive export/import. Cloud bundle gains optional `adventures` collection, gated before upload by explicit inclusion consent covering both adventure documents and adventure-artwork metadata/private snapshots, including canonical entity artwork; adventure changes force a full snapshot through the existing dirty tracker, while entity-only deltas preserve that collection; all current reference/prune sets include its snapshot paths. No unsupported adventures delta section is sent. Restore validates safe relative paths and parses/recoveries adventure documents without inventing leases.
- Disabling cloud adventure inclusion removes its remote collection and media that are no longer referenced by any retained collection; the consent switch also strips `adventureArtwork` from cloud entity projections and excludes its private snapshot paths, including entity-only delta and media refresh paths. Existing ordinary entity images remain in their already-consented scope. Clone projections; never mutate local entity records while omitting remote fields.
- GuestExporter explicitly removes `Entity.adventureArtwork`; public asset enumeration ignores snapshot paths, and no adventure documents are added to guest snapshots. Test both sanitised metadata and actual published/downloadable asset lists.
- Disabling illustrations is device-local; it aborts automatic public fetches and revokes display URLs but does not delete durable choices or private snapshots.
- Delete only proven-unreferenced private snapshots through a conservative explicit maintenance path. Public cache eviction cannot touch `images/`.
