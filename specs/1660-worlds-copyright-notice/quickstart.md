# Quickstart: Copyright and Fan-Content Notice for Public Worlds

**Feature**: 1660-worlds-copyright-notice

## Develop

```bash
bun install
bun run --filter web dev                 # SvelteKit app
bunx wrangler dev apps/workers/oracle-proxy/src/index.ts   # worker on :8787 (VITE_ORACLE_PROXY_URL)
```

## Verify the user-facing flows

1. **Listing notice**: open `http://localhost:5173/worlds` — compact provenance notice renders near the footer; "Report copyright concern" opens the report form.
2. **Acknowledgement**: Settings → Publishing → public listing. Save is blocked until the rights acknowledgement checkbox is ticked; the fan-content toggle is off by default.
3. **Disclaimer**: enable the fan-content toggle, save, open the vault's `/guest/{publishId}` page — default disclaimer shows; set custom wording and confirm it replaces the default (rendered as plain text).
4. **Report intake**: submit a report from the guest page — vault URL pre-filled, required-field validation, success receipt shown. Confirm the object exists:
   `wrangler r2 object list codex-cryptica-statics --prefix moderation/reports/`
5. **Suspension**: create a `disable` marker (below), reload the guest page → neutral "temporarily unavailable" message; `/worlds` no longer lists it; owner's listing settings show "suspended pending review". Delete the marker → everything restores.

## Operator runbook: suspend / restore a reported vault

```bash
# 1. Review reports
wrangler r2 object list codex-cryptica-statics --prefix moderation/reports/
wrangler r2 object get codex-cryptica-statics/moderation/reports/<reportId>.json

# 2. Suspend during review
cat > /tmp/suspension.json <<'EOF'
{ "schemaVersion": 1, "publishId": "<publishId>", "mode": "disable",
  "reason": "copyright report <reportId>", "createdAt": "<ISO now>" }
EOF
wrangler r2 object put codex-cryptica-statics/moderation/suspensions/<publishId>.json --file /tmp/suspension.json
# mode "delist" hides it from the directory only; "disable" also blocks the guest view.

# 3. Restore after review (owner listing + access return automatically)
wrangler r2 object delete codex-cryptica-statics/moderation/suspensions/<publishId>.json
```

## Test & gates (Constitution VI/X)

```bash
bun run lint
bun run test
```

Key test files: `packages/schema/src/publishing.test.ts` (new schemas, ack literal), `apps/workers/oracle-proxy/src/{notice,reports,directory}.test.ts` (auth, suspension filtering, 451 neutrality, Turnstile/rate-limit paths), `PublicListingSettings.test.ts` (ack gating, toggle persistence), `worlds.route.test.ts` (notice presence).
