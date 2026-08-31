# Quickstart: CC Cloud Backup

## Local dev loop (worker side)

1. From `apps/workers/oracle-proxy/`, run the worker locally the same way the existing template-directory/publish routes are exercised (`wrangler dev`, using the same local `wrangler.toml` R2 binding — Miniflare emulates R2 locally, no real bucket needed for manual testing).
2. Exercise the new routes with `curl`/`http` against `http://localhost:8787/api/cloud-backup/...` the same way you'd hit `/api/template-directory/listings` today.
3. Unit tests: add `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts` following `template-directory.performance.test.ts`'s hand-rolled in-memory `Bucket` mock — no real network or `wrangler dev` needed for the test suite itself.

## Local dev loop (client side)

1. New package `packages/cloud-backup-sync` — develop and unit-test it in isolation first (pure functions taking a `baseUrl`/`fetch` dependency, same DI shape as `@codex/gdrive-sync`), before wiring into `apps/web`.
2. Wire into `apps/web/src/lib/stores/cloud-backup.svelte.ts` (status store) and `CloudBackupSettings.svelte` (consent modal + status display + disable/delete actions), added into `VaultSettings.svelte` next to `DriveSettings.svelte`.
3. Manually verify in-browser: enable → confirm a bundle lands in the local Miniflare R2 emulation → edit an entity and save → confirm the push-on-save fires → disable → confirm no further pushes → delete → confirm a subsequent restore attempt 404s.

## Verifying the privacy gates

- With cloud backup off, watch the Network tab while using the app normally: zero requests to `/api/cloud-backup/*` should ever fire (SC-002).
- With cloud backup on, confirm the consent screen text was actually shown once, not on every enable-toggle flip (the local record's `enabled`/`consentedAt` fields distinguish "never consented" from "consented once, currently toggled off").

## Verifying Story 4 (support lookup) stays narrow

- Call `/api/cloud-backup/admin/lookup` with a title that matches zero backups → expect `{ matched: false }`.
- Seed two manifests with the same `vaultTitle` → call lookup with that title → expect `{ matched: false }` (ambiguous, not "pick one").
- Confirm there is no endpoint, flag, or parameter anywhere under `/api/cloud-backup/admin/*` that returns more than one backup's metadata at once.

## Support runbook: recovering a lost recovery key (Story 4)

The runbook lives with the other operational docs, where support will actually
look for it: [`docs/deployment/cloud-backup-support-access.md`](../../docs/deployment/cloud-backup-support-access.md).
It covers what `CLOUD_BACKUP_ADMIN_TOKEN` is, how to set and rotate it, the
lookup and re-issue calls, and what to refuse.

Two points that constrain the design rather than the process, so they belong
here too:

- A lookup answers `{ "matched": false }` for "nothing matched" **and** for
  "several matched". Distinguishing them would let an admin count other
  people's backups (FR-016).
- Re-issuing a code invalidates the previous one immediately, so identity has
  to be verified first — a vault title is not proof of ownership.
