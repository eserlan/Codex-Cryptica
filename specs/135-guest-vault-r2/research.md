# Research: Published Guest Vault Snapshots via Cloudflare R2

## Technical Decisions

### Decision 1: Cloudflare Worker API Routing & Integration

- **Choice**: Extend the existing `oracle-proxy` worker rather than creating a brand-new worker.
- **Rationale**:
  - The `oracle-proxy` worker already has a fully configured CORS architecture, deployment scripts (`deploy.sh`), and GitHub Actions workflow (`deploy-worker.yml`).
  - Creating a separate worker would require duplicating wrangler configurations, environment variables, DNS routing/subdomains, and pipeline definitions.
  - Adding R2 publishing endpoints is a surgical change that adds a few API route handlers to the existing `fetch` multiplexer without affecting the existing AI proxy.
- **Alternatives Considered**:
  - _New `publish-proxy` worker_: Rejected because it increases maintenance overhead (multiple deployment YAMLs, wrangler configurations, and domains) and introduces unnecessary complexity.
  - _Cloudflare Pages Functions_: Rejected because the project uses a static SPA adapter (`@sveltejs/adapter-static`), and deployment is configured via raw Page uploads (`wrangler pages deploy apps/web/build`). Pages Functions require a different compilation setup.

### Decision 2: Zero-Database Stateless Metadata via R2 customMetadata

- **Choice**: Store the publisher's write authorization token and snapshot manifest statistics directly within Cloudflare R2 object custom metadata (`customMetadata`).
- **Rationale**:
  - The snapshot publisher needs a way to overwrite (update) or delete (unpublish) their vault files. Since the app is local-first, the publisher generates a secret client-side token (or the server returns one during first publish) and sends it as a bearer token in subsequent write operations.
  - To verify the token, the Worker needs to check it against the original token. Storing the `writeToken` in the R2 object's custom metadata eliminates the need for a separate database (like Cloudflare KV or D1).
  - When the Worker receives an update or delete request, it calls `env.BUCKET.get` or `env.BUCKET.head` on the bundle key, verifies the token stored in `customMetadata`, and decides whether to authorize the operation.
- **Alternatives Considered**:
  - _Cloudflare KV_: Kept as fallback, but rejected as primary because it requires another resource binding and configuration in wrangler, plus KV is eventually consistent which can cause race conditions during quick updates.
  - _D1 Database_: Rejected as over-engineered for simple key-value matching.

### Decision 3: Text-First and Asset-Decoupled Snapshot Upload

- **Choice**: Upload text-based campaign data (entities, relationships, search index) in a single compact JSON bundle (`bundle.json`). Upload binary assets (images, maps) separately under an asset subpath.
- **Rationale**:
  - Large binary assets embedded in a single JSON payload would cause payload size limits to be exceeded and degrade upload performance.
  - Decoupling assets allows the client to only upload new or modified images, and allows the guest browser to load assets on-demand using standard `<img>` tags pointing to asset URLs.
- **Alternatives Considered**:
  - _Monolithic base64 bundle_: Rejected because it causes massive payload size bloat (33% increase from base64 encoding) and makes network transit fragile.

## Implementation Details

### API Routes (Worker)

- `POST /api/publish-vault` (Publish or update a snapshot)
- `GET /api/published/:publishId/bundle` (Fetch snapshot data)
- `GET /api/published/:publishId/manifest` (Fetch snapshot metadata/counts)
- `POST /api/published/:publishId/assets/:assetId` (Upload a public asset)
- `GET /api/published/:publishId/assets/:assetId` (Serve a public asset)
- `DELETE /api/published/:publishId` (Delete/unpublish a snapshot)

### Directory Structure of published files in R2

- `published/${publishId}/bundle.json` -> Contains the guest vault data. Custom metadata stores `{ writeToken, vaultTitle, publishedAt, entityCount }`.
- `published/${publishId}/assets/${assetId}` -> Individual guest-safe image files.
