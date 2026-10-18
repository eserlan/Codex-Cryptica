# Research: Entity Template Marketplace

## D1 — One directory, told apart by a `templateKind` field

**Decision:** Entity listings live in the same R2 namespace (`templates/listings/{id}/`) and the same `/api/template-directory/*` routes as stat sheet listings. `listing.json` gains `templateKind: "entity"`. A missing value means `stat-sheet`, so no existing record is migrated. List and get accept `kind`; without it they behave exactly as today.

**Rationale:** The clarification chose one directory with a kind filter. Sharing the namespace reuses the owner-token, CORS, rate-limit and suspension code. The existing stat sheet listing schema is `.strict()` and requires `system` or `category`, so an entity listing record already fails to parse as a stat sheet listing and is skipped; an explicit `templateKind` check is added anyway so this does not depend on a side effect.

**Alternatives considered:** A separate `entity-templates/` namespace and route set would duplicate the worker code and give two directories, against the clarification. Adding entity fields to the stat sheet listing schema would loosen a strict schema that guards privacy.

## D2 — Public package is a strict projection of the spec 167 package

**Decision:** Add `toPublicEntityPackage()` in `schema` (`entity-template-public.ts`). It lives in `schema` rather than `entity-template-engine` because workers may only import `schema`; a parity test in `apps/web` asserts the kind, version and limits match the engine's. It accepts a `TemplatePackage`, keeps only `kind`, `formatVersion` and `template.{name, entityType, markdown}`, and enforces publishability: non-empty body, 50,000-character body, 80-character name, non-empty entity type. The worker uses the same function.

**Rationale:** The spec 167 `TemplatePackageSchema` uses `.passthrough()` so future typed fields survive a local round trip. That is right locally and wrong publicly: an unknown field could carry private data. A strict projection at the boundary keeps the format identical (no second format, FR-006) while guaranteeing FR-007. Browser and worker share one implementation.

**Alternatives considered:** Publishing the passthrough package as is (leaks unknown fields); a separate public schema with different field names (a second format, forbidden).

## D3 — Version handling

**Decision:** `formatVersion` 1 is the only version. A newer version is rejected at publish, install and worker validation with the existing "made with a newer version of Codex Cryptica" message. Older-version migrations are a no-op today; the projection function is the single place a migration would be added.

**Rationale:** Matches spec 150's approach and the spec's edge case, without inventing migrations that do not exist.

## D4 — Listing lifecycle: `active` and `unpublished`, plus an operator marker

**Decision:** Entity listings carry `status: "active" | "unpublished"`.

- Owner unpublish (`POST .../unpublish`, owner token): sets `unpublished`. The record and package are kept, hidden from browse, search, detail and package download. Idempotent.
- Owner update or republish (`PUT`, owner token): sets `active` and writes the new package and metadata. This is how "unpublish, then republish to the same listing" works.
- Owner permanent delete (`DELETE`, owner token): removes `listing.json`, `package.json` and the index entry. Allowed from `active` or `unpublished`. Rejected with 403 for an operator-removed listing, so the operator keeps the record. Report records stay for moderation.
- Operator takedown: the existing suspension marker (`POST /admin/suspensions`, `TEMPLATE_ADMIN_TOKEN`). Reads return 404; owner `PUT` and unpublish return 403 `removed_by_operator`. The owner can publish the template again as a new listing (the spec allows this).

**Rationale:** Spec 150's `DELETE` removes the objects, which cannot be undone. The clarification requires reversible owner unpublish, so entity listings use a status field instead. Stat sheet `DELETE` is left alone (SC-010). Reusing the suspension marker keeps operator takedown final with no new mechanism.

**Repeat abuse (flagged in the spec checklist):** an operator-removed owner can publish again as a new listing. This plan accepts that for the first release: publishing already has the create rate limiter and the operator can suspend each new listing and see its reports. If it becomes a problem, the follow-up is an operator-managed block on the publisher's hashed identifier; that is out of scope now.

**Erasure (Constitution V):** unpublish alone leaves the text in R2, so permanent delete exists so an owner can always erase a published template without contacting support.

**Publish abuse verification:** spec 150's contract mentions server-side abuse verification, but the template directory does not use Turnstile today (the secret is declared and unused). Entity publish keeps parity: acknowledgment plus the existing create rate limiter. Revisit adding Turnstile if abuse appears; recorded as an accepted risk.

**Alternatives considered:** Soft-delete via the suspension marker for owner unpublish (then the owner could not undo it, and an operator action would be indistinguishable from the owner's); a separate `unpublished/` prefix (moves objects, more failure modes).

## D5 — Reporting: one per device per listing, plus a cap

**Decision:**

- A "device" is a network address. `reporterHash` is an HMAC-SHA-256 of the connecting IP address, keyed by the worker secret `TEMPLATE_REPORT_HASH_KEY` (a plain hash of an IPv4 address would be reversible). Without the secret the report endpoint returns 503 "reporting is unavailable" rather than storing weak hashes.
- De-duplication: a marker `moderation/template-report-index/{listingId}/{reporterHash}`. A second report returns 409 `already_reported`.
- Caps: at most 5 per minute, using a Cloudflare rate-limit binding (`TEMPLATE_REPORT_RATE_LIMITER`, keyed by the address hash), and at most 20 per day, using a small counter object `moderation/template-report-quota/{reporterHash}/{yyyy-mm-dd}`. Cloudflare bindings only support 10 or 60 second periods, hence the counter. If the binding is missing, the daily counter still applies. Over either cap returns 429.
- Reports are stored at `moderation/template-reports/{listingId}/{reportId}.json`, so a per-listing count and list is one prefix listing.
- An operator-only endpoint (`GET /admin/reports?listingId=`, `TEMPLATE_ADMIN_TOKEN`) returns the count and each report's reason and details.
- The client also remembers reported listing ids on the device and shows "You've already reported this" without a round trip.

**Rationale:** There are no accounts, so "device" can only be approximated. A hashed IP plus listing is the same kind of key the create rate limiter already uses, and the client-side memory covers the common friendly-message case. The hash is one-way and used only for de-duplication.

**Limits accepted:** Shared IPs (households, offices) share one report per listing and one quota; a determined person can change IP. The operator reads the count and reasons, so a few false duplicates do not hide a genuine problem.

**Alternatives considered:** A client-generated device id (trivially reset, gives no real limit); requiring a CAPTCHA on every report (heavier, and Turnstile is currently used for publish only).

## D6 — Publish link kept on the device

**Decision:** A new device-local registry (`entity-template-publish-registry.ts`) stores `{ vaultId, templateId } → { listingId, status, publishedAt }` in the existing IndexedDB `settings` store. The owner token is saved with the existing `saveTemplateOwnerToken(listingId, token)`. Nothing is written into the template file, the exported package or the vault.

**Recovery:** the user enters the listing link (or id) and the saved token. `GET /listings/:id/owner` verifies the token and returns the listing and package. The app then relinks to a local template: automatic when exactly one local template has the same name and entity type, otherwise the user picks one or installs a copy first.

**Rationale:** Direct implementation of clarification Q1. Keeping the token out of the vault means exporting or syncing a vault never leaks publish credentials.

**Alternatives considered:** Storing the link in the template JSON (travels with the vault but could leak the listing id into exports and backups); no link at all (breaks "update, don't duplicate").

## D7 — Install is validate, resolve collision, create; never set default

**Decision:** `installEntityTemplate()` downloads the package, runs the existing `importTemplatePackage`, checks for a same-name, same-type collision in the store and asks for an explicit rename or cancel, then calls `store.create()` once. It never calls `setDefault`. The store's `importPackage` (which silently appends "(imported)") is not used because FR-012 requires an explicit choice.

**Rationale:** `create()` is a single atomic write per the spec 167 store contract, so a failure leaves the vault unchanged (FR-011). Excluding `setDefault` from the module makes FR-010 structurally true, and the existing `no-entity-mutation.test.ts` pattern is extended to prove it.

## D8 — Scale: a compact summary index

**Decision:** Entity browse reads a single `templates/index/entity.json` object holding one summary per active listing (all card fields; no template text). It is upserted on publish, update, republish, unpublish, permanent delete and operator takedown, using conditional writes on the object's etag with a bounded retry. Takedown removes the entry, so browse needs no suspension lookup. A browse request costs at most 5 R2 operations regardless of listing count. Detail and package downloads read the individual objects. An operator endpoint (`POST /admin/rebuild-index`, `TEMPLATE_ADMIN_TOKEN`) rebuilds the index from a scan in bounded batches and repairs a missing or corrupted index; until repaired, browse returns an empty list rather than an error.

**Rationale:** The earlier idea of "measure first" cannot work: the in-memory test bucket has no latency or subrequest limit, and one R2 `get` per listing means about 1,000 operations per browse, above the Worker subrequest limits. A 1,000-listing index is roughly 400 KB, one read. The benchmark therefore counts R2 operations (a budget of 5 per request) instead of wall time.

**Alternatives considered:** One `get` per listing (exceeds subrequest limits); a database such as D1 (a new dependency and store for one directory); building the index only if a benchmark fails (the benchmark cannot detect the problem).

## D9 — Facets and filters

**Decision:** The entity list response includes `facets.entityTypes: [{ value, count }]` computed over all active entity listings that match the search text, ignoring the type filter. The client shows the built-in types first, then the rest alphabetically. Entity type is matched and stored case-insensitively (trimmed, lower-cased) so `Faction` and `faction` are one filter. Labels filter with AND semantics, as in stat sheet listings.

**Rationale:** Implements FR-003 and FR-003a without a second endpoint or a hard-coded type list, so custom categories appear automatically.

## D10 — No usage tracking, no install counts

**Decision:** Entity listings have no `importCount`. Installing sends no request other than the package download.

**Rationale:** Stat sheet listings carry an optional `importCount`; nothing about the entity feature needs one, and counting installs from inside the vault app would breach the standing rule against instrumenting the authenticated vault app. The spec also defers ratings and popularity.

## D11 — Not indexable

**Decision:** The directory and detail views stay in the client-rendered `(app)` route group, outside `governed-routes.ts`. The entity listing detail view sets `<meta name="robots" content="noindex">`. No new discovery registry entry is needed because no indexable discovery page is added.

**Rationale:** Satisfies FR-023 and the clarification while keeping stat sheet page behaviour unchanged.

## D12 — Local template deleted after publishing

**Decision:** Deleting the local template does not unpublish it. The device link is kept, and the owner can still unpublish or update through owner recovery (which relinks to an installed copy). The delete confirmation for a published template says the public listing stays until unpublished.

**Rationale:** Unpublishing must remain an explicit action (FR-019 says publish actions never alter the local template, and the converse should hold), and a silent network call on delete would surprise users offline.
