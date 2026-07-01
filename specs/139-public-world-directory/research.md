# Research: Public World Directory

## Decision: Store public listings as separate R2 records keyed by `publishId`

**Rationale**: The directory is a consent layer on top of published guest snapshots, not part of snapshot publishing itself. A separate R2 object at `directory/listings/{publishId}.json` keeps listing state independent, reversible, and easy to delete without mutating the guest bundle. It also allows the directory to expose only saved owner-approved metadata.

**Alternatives considered**:

- Embed listing metadata in `published/{publishId}/bundle.json`: rejected because it couples public discovery to guest bundle updates and increases the risk of auto-mirroring editable world fields.
- Add a new database: rejected for v1 because the existing architecture is Worker + R2 and the feature scope is lightweight.
- Store one global index object only: rejected as the primary source because concurrent listing updates would require additional locking/versioning behavior. A generated cache/index may be added later, but the listing record is the source of truth.

## Decision: Authenticate owner listing mutations with the existing snapshot write token

**Rationale**: A public listing can exist only for an active guest snapshot, and `135-guest-vault-r2` already defines the write token as the authority to update/delete that snapshot. Reusing the same token avoids adding a separate secret while preserving owner-only mutation controls.

**Alternatives considered**:

- Anonymous listing updates from the browser: rejected because anyone with a `publishId` could alter directory visibility.
- Separate listing token: rejected for v1 because it complicates local registry storage and recovery without improving the core permission model.
- Account login requirement: rejected because the existing publish flow is local-first and token-based.

## Decision: Directory search runs server-side over saved listing metadata only

**Rationale**: The spec requires search to avoid guest bundles, editable worlds, and non-listed snapshots. The Worker can filter listing records by normalized title, description, and labels, returning only public metadata. This keeps private content out of the search surface and avoids shipping hidden records to visitors.

**Alternatives considered**:

- Client-side search after downloading all listings: rejected for scale and because it exposes more public listing metadata than needed per query.
- Index guest bundles for richer search: rejected because it violates the boundary that directory search indexes listing metadata only.
- External search service: rejected for v1 due to complexity and extra privacy review.

## Decision: Use R2 prefix listing plus small JSON listing records for v1 browse/search

**Rationale**: The directory target is lightweight. Listing records are small, public, and bounded by v1 validation. Worker-side pagination with a `cursor` and `limit` is enough for the first version and can be optimized later with a generated index if directory volume demands it.

**Alternatives considered**:

- Durable Object index: rejected for v1 because it adds another stateful platform dependency.
- KV index: rejected for v1 because R2 is already required for published snapshots and listing consistency is easier to reason about with one storage surface.
- Full text search engine: rejected as out of scope.

## Decision: Delisting deletes the listing record and public directory responses use short cache windows

**Rationale**: The success criteria require delisting to remove a world from browse/search within 30 seconds. Deleting the R2 listing record is simple and direct; public directory API responses should use `Cache-Control: public, max-age=15` or lower so stale browse/search responses expire within the required window.

**Alternatives considered**:

- Mark inactive but keep returning tombstones: rejected because directory visitors should stop seeing delisted worlds.
- Long CDN cache: rejected because it would violate the 30-second delist criterion.

## Decision: Saved listing metadata never auto-mirrors world/profile changes

**Rationale**: The clarification established that listing metadata is a saved owner-approved public record. Later world title, label, guest snapshot metadata, cover image, or owner profile changes must not alter the directory until the owner updates and approves the listing.

**Alternatives considered**:

- Auto-sync on world/profile changes: rejected for privacy and consent reasons.
- Auto-sync only on guest snapshot updates: rejected because updating a read-only snapshot is not the same consent event as changing public directory metadata.

## Decision: Keep SEO indexing, moderation, reporting, featured listings, comments, ratings, and social behavior out of v1

**Rationale**: The spec explicitly limits v1 to opt-in listing, browse/search/filter, and read-only guest-view navigation. These extra surfaces change risk, policy, and UX scope enough to deserve separate specs.

**Alternatives considered**:

- Add noindex controls now: rejected because search-engine indexing itself is out of scope.
- Add reporting/moderation now: rejected because it would expand product and operational scope beyond the current issue.
