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

## Support runbook: recovering a lost ownership code (Story 4)

For support staff. This path exists because there are no accounts — a lost code
is otherwise unrecoverable. It is deliberately narrow, and it is disclosed to
users on the consent screen.

**What you can see**: a vault's title, size and last-backup time. **Never** its
contents. There is no endpoint that returns more than one backup.

1. **Get an identifying detail from the user.** Currently that means the vault's
   exact title. If they cannot supply one, stop — there is nothing to search on,
   and the backup is unreachable. Say so plainly rather than implying it might
   be recoverable later.
2. **Look it up.**
   ```
   POST /api/cloud-backup/admin/lookup
   Authorization: Bearer $CLOUD_BACKUP_ADMIN_TOKEN
   { "vaultTitle": "The Saltmere Fens" }
   ```
   - `{ "matched": true, ... }` — exactly one backup matched.
   - `{ "matched": false }` — **either** nothing matched **or** several did. The
     response is identical on purpose, so nobody learns how many vaults share a
     title. Ask for a different detail; do not guess between candidates.
3. **Verify identity** through your normal support process, before re-issuing
   anything. A title is not proof of ownership — anyone who has seen the user's
   screen knows it.
4. **Re-issue the code.**
   ```
   POST /api/cloud-backup/admin/{backupId}/reissue-code
   Authorization: Bearer $CLOUD_BACKUP_ADMIN_TOKEN
   ```
   This **invalidates the previous code immediately**. If the user later finds
   their old one, it will not work — tell them so.
5. **Relay the new code** through the same channel you verified them on, and
   remind them it is the only key to that backup.

**What to refuse**: any request to list backups, to browse by partial title, or
to read a vault's contents. None of those exist, and none should be built —
see FR-016.
