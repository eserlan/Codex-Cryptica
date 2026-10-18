# Research: Shareable Generated Entities

## Decision: Share one entity-shaped result, not a draft or a vault

**Rationale**: `Entity` is the durable vault representation and `SessionEntity` is the equivalent generator-session representation. Both contain the shareable title, type, labels, content, optional lore, and optional kind. A small projection keeps the local vault, relationships, assets, prompts, and session history private.

**Alternatives considered**:

- Share only a generator draft: rejected because it makes a saved, fully generated vault entity less shareable than an in-progress result.
- Reuse `GuestBundleSchema`: rejected because it exposes a whole-vault contract, assets, relationships, update behaviour, and materially larger limits.
- Export arbitrary entity fields: rejected because images, connections, provenance, private notes, and future fields must never be uploaded by default.

## Decision: Use a separate immutable R2 namespace and Worker contract

**Rationale**: Existing `published/` objects support mutable, whole-world guest snapshots managed with a write token. Shared entity results are text-only, immutable, 64 KB maximum, and never become a public listing. `share-snapshots/:shareId.json` and dedicated routes make those differences enforceable.

**Alternatives considered**:

- Add an entity record to a published vault bundle: rejected because a share must not require or expose a vault publish.
- Extend `/api/publish-vault`: rejected because its 10 MB bundle contract, asset behaviour, and update path weaken this feature’s boundary.

## Decision: Browser-generated revocation secret, server-stored digest

**Rationale**: The browser creates a random secret before `POST`, retains it only in browser storage, and submits its SHA-256 digest. R2 custom metadata contains only the digest; `DELETE` hashes the supplied secret before comparison. The public URL and creation response never carry a revocation credential.

**Alternatives considered**:

- Worker-generated token returned to the client: rejected because the creation response would contain the secret.
- R2 write token reuse: rejected because it authorises mutation and belongs to the whole-vault publisher.
- Put a secret in the URL fragment: rejected because it is too easy to lose or accidentally share and does not meet the no-credential-in-URL requirement.

## Decision: Existing modal patterns plus progressive native sharing

**Rationale**: The app already uses Svelte-managed accessible modal patterns. The user confirms before network work. After success, native sharing is used only when `navigator.share` is available; an ordinary Copy link remains available and works everywhere. No new dialog/polyfill dependency is warranted.

**Alternatives considered**:

- Make share automatic after generation/save: rejected by the privacy consent requirement.
- Add an Invoker Commands/polyfill stack: rejected because the existing modal infrastructure supports the required browsers and no new dependency is needed.

## Decision: Server-load the public reader route and mark it noindex

**Rationale**: A `+page.ts` load fetches and validates the snapshot so title, description, and readable content exist for direct visitors and crawlers. The route sets `robots: noindex` and has no directory or internal browse surface. Rendering remains through the existing sanitised Markdown path.

**Alternatives considered**:

- Client-only snapshot loading: rejected because metadata and content would be unavailable to crawlers.
- A discovery listing/index: rejected because the product request is share-by-link, not a content directory.
