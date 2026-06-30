# Data Model: Public World Directory

This feature extends the published guest snapshot model from `specs/135-guest-vault-r2`. A public listing is a separate, saved, owner-approved record that points to an active guest snapshot but does not replace or modify the guest bundle.

## Entity: `PublicListing`

Discoverable public record stored in R2 under `directory/listings/{publishId}.json`.

```typescript
interface PublicListing {
  schemaVersion: 1;
  publishId: string;
  guestUrl: string;
  title: string;
  description: string;
  labels: string[];
  coverImageAssetId?: string;
  coverImageAlt?: string;
  ownerDisplayName?: string;
  visibleEntityCount: number;
  snapshotPublishedAt: string;
  listingCreatedAt: string;
  listingUpdatedAt: string;
}
```

### Validation Rules

- `publishId` is required and must refer to an active published guest snapshot.
- `guestUrl` must point to the read-only guest route for `publishId`; it must never point to an editable world route.
- `title` is required, trimmed, 1-120 characters.
- `description` is required, trimmed, 1-280 characters.
- `labels` is required and must contain 1-8 non-empty labels; labels are the only classification term.
- `coverImageAssetId` is optional and must reference an asset from the published guest snapshot asset manifest if provided.
- `ownerDisplayName` is optional and must be explicitly approved; omit the field when no public owner display name is approved.
- The record must not contain write tokens, local vault IDs, internal entity IDs, editable URLs, private notes, hidden relationships, generation prompts, or editor-only metadata.
- `listingUpdatedAt` changes only when the owner explicitly updates listing metadata or listing status.

## Entity: `ListingDraft`

Owner-side draft used for preview and validation before enabling or updating a public listing. It is not discoverable until committed.

```typescript
interface ListingDraft {
  publishId: string;
  title: string;
  description: string;
  labels: string[];
  coverImageAssetId?: string;
  coverImageAlt?: string;
  ownerDisplayName?: string;
}
```

### Validation Rules

- Must satisfy the same public metadata validation rules as `PublicListing`.
- Must be previewed before an enable/update request is confirmed.
- Must not be hydrated from live world/profile fields after confirmation unless the owner explicitly edits the draft.

## Entity: `DirectoryQuery`

Public browse/search/filter request.

```typescript
interface DirectoryQuery {
  q?: string;
  labels?: string[];
  cursor?: string;
  limit?: number;
}
```

### Validation Rules

- `q` is optional, trimmed, and limited to 120 characters.
- `labels` is optional and contains only public labels.
- `limit` defaults to 24 and is capped at 48.
- Search matches only `PublicListing.title` and `PublicListing.description`.
- Label filters match only `PublicListing.labels`.

## Entity: `DirectoryResult`

Public item returned by browse/search.

```typescript
interface DirectoryResult {
  publishId: string;
  guestUrl: string;
  title: string;
  description: string;
  labels: string[];
  coverImageUrl?: string;
  coverImageAlt?: string;
  ownerDisplayName?: string;
  visibleEntityCount: number;
  listingUpdatedAt: string;
}
```

### Validation Rules

- Derived only from `PublicListing`.
- Must not include `snapshotPublishedAt` unless needed for display copy.
- Must not include storage keys, write tokens, local IDs, or editable URLs.

## Entity: `DirectoryPage`

Paginated public directory response.

```typescript
interface DirectoryPage {
  results: DirectoryResult[];
  nextCursor?: string;
}
```

### Validation Rules

- Default ordering is deterministic: newest `listingUpdatedAt` first, with `publishId` as a stable tie-breaker.
- Delisted or unavailable snapshots are excluded.
- Cache headers must not keep stale results visible beyond 30 seconds after delist.

## State Transitions

```text
No Guest Snapshot
  └─ publish snapshot via 135-guest-vault-r2 → Unlisted Snapshot

Unlisted Snapshot
  ├─ owner previews valid listing draft → Previewed Draft
  └─ unpublish snapshot → No Guest Snapshot

Previewed Draft
  ├─ owner confirms public listing → Listed
  └─ owner cancels → Unlisted Snapshot

Listed
  ├─ owner updates and confirms saved metadata → Listed
  ├─ owner disables public listing → Unlisted Snapshot
  └─ underlying snapshot unpublished/unavailable → Listing Removed
```

## Storage Layout

### R2 Listing Object

- **Key**: `directory/listings/${publishId}.json`
- **Body**: `PublicListing`
- **Cache**: Directory browse/search responses use a max-age of 15 seconds or lower.

### Relationship To Existing Snapshot Objects

- Existing snapshot bundle: `published/${publishId}/bundle.json`
- Existing snapshot assets: `published/${publishId}/assets/${assetId}`
- A listing may reference a cover image only by `coverImageAssetId` from the snapshot asset manifest.
- Deleting `published/${publishId}/bundle.json` must also delete `directory/listings/${publishId}.json`.
