# API Contract: Community Stat Sheet Templates

Base URL is the existing oracle-proxy URL. JSON responses use the existing
CORS and rate-limit behavior.

## Public reads

`GET /api/template-directory/listings?q=&system=&category=&labels=&cursor=&limit=`

Returns `{ results, nextCursor }`. Results contain listing ID, title,
description, system, category, labels, optional owner display name, package
version, timestamps, and usage metadata. They never contain the package or
owner token. Invalid query parameters return `400`.

`GET /api/template-directory/listings/:listingId`

Returns listing metadata plus a safe ordered-field preview. Missing, delisted,
or malformed records return `404`.

`GET /api/template-directory/listings/:listingId/package`

Returns the complete public package only when active. Missing/delisted records
return `404`; malformed packages return `422`.

## Owner mutations

`POST /api/template-directory/listings`

Accepts a value-free package and public metadata. New publication requires the
explicit acknowledgment and server-side abuse verification. The response
returns `{ listing, ownerToken }`; the token is shown once and the UI provides
copy/export controls. A recovery flow accepts a user-provided saved token after
browser data is cleared; the server does not provide token enumeration.

`PUT /api/template-directory/listings/:listingId`

Accepts replacement package/metadata and `Authorization: Bearer <ownerToken>`.
Wrong or missing tokens return `401`; invalid content returns `400` or `422`.

`DELETE /api/template-directory/listings/:listingId`

Requires the owner token, removes or delists the public listing/package, and
leaves the local template unchanged. Repeated deletion is idempotent.

`POST /api/template-directory/listings/:listingId/report`

Accepts the existing lightweight report fields and creates a moderation record.
Owner takedown uses the owner-token mutation. Admin takedown is an
operator-authenticated deployment/admin action that writes the existing
suspension marker; no unauthenticated public admin endpoint is exposed.

## Error envelope

Errors use `{ error: { message, code?, details? } }` with plain-language
messages safe for the UI. Network errors are retriable; validation errors never
trigger a local save.
