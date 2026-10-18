# Share Snapshot HTTP Contract

The snapshot is one strict, text-only entity projection. It excludes a vault, relationships, assets, prompts, source context, and all unknown entity fields.

## `POST /api/share-snapshots`

Allowed-origin and IP-rate-limited creation. The body is a strict JSON object with the safe snapshot projection and a lowercase SHA-256 digest of a browser-generated management secret. Its encoded size is at most 64 KB. The Worker writes one new object at `share-snapshots/:shareId.json`; it provides no update operation.

Returns `201 { shareId, url }`. It never returns a management secret or its digest. Invalid text/JSON/unknown fields return `400`, oversize input `413`, failed verification `403`, and rate limiting `429`.

## `GET /api/share-snapshots/:shareId`

Unauthenticated public read of the validated snapshot only. It never exposes the protected credential digest or management state. Malformed, unknown, and revoked ids all return `404`.

## `DELETE /api/share-snapshots/:shareId`

Allowed-origin request with the raw browser-held management secret in an authorisation header. The Worker hashes it before comparing it with protected object metadata. A match returns `204` and permanently removes the object; the client then removes its local credential. Missing or incorrect credentials return the same authorisation failure; unavailable objects return `404`.

## `GET /share/:shareId`

SSR result page with safe content, restrained attribution, an allowlisted generator-specific action (or generic generator fallback), `noindex, nofollow`, and a bounded title/social description. Unavailable snapshots render a clear unavailable page.
