# API Contract: Entity Template Listings

Base URL is the existing oracle-proxy URL. Entity listings share the `/api/template-directory/*` routes with stat sheet listings. Existing CORS, origin checks and rate limiting apply. Requests without `kind=entity` (reads) or without an entity package (writes) behave exactly as in spec 150.

Errors use `{ error: { message, code?, details? } }` with plain-language `message`. Codes used here: `validation`, `unauthorized`, `removed_by_operator`, `not_found`, `already_reported`, `rate_limited`, `reporting_unavailable`.

## Public reads

`GET /api/template-directory/listings?kind=entity&q=&entityType=&labels=&cursor=&limit=`

Returns `{ results, nextCursor?, facets: { entityTypes: [{ value, count }] } }`. Served from the summary index (`templates/index/entity.json`) in at most 5 R2 operations per request, regardless of listing count. Active, non-suspended entity listings only, newest `listingUpdatedAt` first. A missing or corrupted index returns an empty page until an operator rebuilds it. `labels` is a comma list with AND semantics. `entityType` is matched case-insensitively. Results never contain the package body, owner token or hash. Invalid query parameters return `400`. Malformed records are skipped.

`GET /api/template-directory/listings/:listingId`

Returns the entity listing plus `previewMarkdown` when it is active. Any other kind falls through to the existing stat sheet handler. Missing, `unpublished` or suspended records return `404`.

`GET /api/template-directory/listings/:listingId/package`

Returns the public package for an active entity listing. Missing, `unpublished` or suspended returns `404`. A stored package that fails validation returns `422`.

## Owner mutations (`Authorization: Bearer <ownerToken>`)

`POST /api/template-directory/listings`

Body: `{ package, metadata: { description, labels, ownerDisplayName?, rightsAcknowledged: true } }` where `package` is a `TemplatePackage` with `kind: "entity-template"`. The worker projects it through the public package function, validates all limits, generates the `listingId` and owner token, and writes `listing.json` (with the token hash as custom metadata) and `package.json`. Returns `201 { listing, ownerToken }`; the token is shown once. Missing acknowledgment or any limit violation returns `400`. Uses the existing create rate limiter.

`PUT /api/template-directory/listings/:listingId`

Replaces package and metadata and sets `status: "active"` (this is also republish). Wrong or missing token: `401`. Operator-suspended: `403 removed_by_operator`. Invalid content: `400`. Returns the listing.

`POST /api/template-directory/listings/:listingId/unpublish`

Sets `status: "unpublished"`; the record and package are kept. Idempotent. Same authorization outcomes as `PUT`. Returns `{ success: true }`.

`GET /api/template-directory/listings/:listingId/owner`

Verifies the token and returns `{ listing, package }` for an active or unpublished listing, so the owner can recover controls and relink a local template. `401` for a wrong token, `403 removed_by_operator` when suspended, `404` when the listing does not exist. Never enumerates listings.

`DELETE /api/template-directory/listings/:listingId`

Permanently deletes an entity listing: removes `listing.json`, `package.json` and its index entry. Allowed from `active` or `unpublished`. Wrong or missing token: `401`. Operator-suspended: `403 removed_by_operator` (the operator keeps the record). Deleting an already deleted listing is idempotent and returns `{ success: true }` (with a valid token format), and owner reads of it return `404`. Report records are kept for moderation. Returns `{ success: true }`.

Every owner mutation (`POST`, `PUT`, `unpublish`, `DELETE`) updates the summary index with a conditional write and a bounded retry.

## Reporting

`POST /api/template-directory/listings/:listingId/report`

Body: `{ reason, details? }`. `reason` is one of `inappropriate`, `copied-without-permission`, `spam`, `other`. Returns `201 { success: true }`. Outcomes:

- `409 already_reported` when this device (keyed hash of the network address, per listing) has reported the listing before; nothing new is stored.
- `429 rate_limited` when the device exceeds the report caps; nothing is stored.
- `429 rate_limited` also applies when the device has sent 5 reports in the last minute or 20 today (the daily quota counter applies even if the platform limiter is absent).
- `503 reporting_unavailable` when the worker has no `TEMPLATE_REPORT_HASH_KEY` configured; nothing is stored.
- `404` for a missing, unpublished or suspended listing; `400` for an invalid reason or over-long details.

## Operator endpoints (`Authorization: Bearer <TEMPLATE_ADMIN_TOKEN>`)

`POST /api/template-directory/admin/suspensions` (existing)

Body: `{ publishId: <listingId>, mode, reason }`. Writes the suspension marker and, for an entity listing, removes its entry from the summary index. This is the final operator takedown.

`POST /api/template-directory/admin/rebuild-index?cursor=&limit=`

Rebuilds `templates/index/entity.json` from a scan of entity listings in bounded batches (default 200 per call) and returns `{ processed, nextCursor? }`. Skips unpublished and suspended listings. Requires the operator token.

`GET /api/template-directory/admin/reports?listingId=`

Returns `{ listingId, count, reports: [{ reportId, reason, details?, receivedAt }] }`. Reporter hashes are never returned. `401` without the operator token. This endpoint is not exposed in any UI.

## Public visibility rules

| State                 | List | Detail | Package | Owner `GET/PUT/unpublish/DELETE` | Report |
| --------------------- | ---- | ------ | ------- | -------------------------------- | ------ |
| `active`              | yes  | yes    | yes     | yes                              | yes    |
| `unpublished`         | no   | 404    | 404     | yes (PUT republishes)            | 404    |
| suspended by operator | no   | 404    | 404     | 403 `removed_by_operator`        | 404    |
| deleted by owner      | no   | 404    | 404     | 404 (DELETE repeats safely)      | 404    |

## Contract tests required

- Public responses contain no `ownerToken`, `ownerTokenHash`, reporter hash or unknown package fields (privacy invariant).
- Stat sheet requests and fixtures return identical responses before and after the change (SC-010).
- Unpublish then `PUT` restores the listing to browse; suspension then `PUT` returns 403 and the listing stays hidden.
- Duplicate report returns 409 and does not increase the operator count; a report over the cap returns 429.
- Browse over a 1,000-listing fixture costs at most 5 R2 operations per request (counted on the test bucket), and the summary index equals the set of active, non-suspended entity listings after every transition (publish, update, unpublish, republish, delete, takedown, rebuild).
- Concurrent writes to the index retry and never lose an entry; a corrupted index returns an empty page and `rebuild-index` restores it.
- Owner `DELETE` removes both objects and the index entry, is rejected for an operator-removed listing, and leaves report records.
- Reports are keyed by an HMAC of the address; without `TEMPLATE_REPORT_HASH_KEY` the endpoint returns 503 and stores nothing; the minute and daily caps return 429.
