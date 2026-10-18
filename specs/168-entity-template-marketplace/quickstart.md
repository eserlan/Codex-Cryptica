# Quickstart: Entity Template Marketplace

## Prerequisites

- Spec 167 (entity template management) is merged; Settings → Templates shows Entity templates.
- Worker running locally on `http://localhost:8787` with an R2 bucket binding, and `TEMPLATE_ADMIN_TOKEN` and `TEMPLATE_REPORT_HASH_KEY` set for the operator and report steps.
- Web app running against it (`VITE_ORACLE_PROXY_URL` unset in dev uses `localhost:8787`).

## Manual walkthrough

1. **Publish.** In Settings → Templates → Entity templates, duplicate a built-in template (built-ins and legacy files cannot be published directly), open its actions and choose Publish. Enter a description and at least one label, optionally a display name, review the preview (full body shown), tick the acknowledgment and publish. Copy the owner token.
2. **Browse.** Open `/templates`, switch to Entity templates. Confirm the card shows name, description, entity type, labels, display name and last updated. Filter by entity type and label, search by a word from the description, and switch back to Stat sheet templates to confirm they are unchanged.
3. **Preview and install.** Open the listing (it opens at `/templates/entity/…`), read the preview, choose Install. Confirm it appears in your vault's Entity Templates as a user template, that the default for its type is unchanged, and that existing notes are unchanged. Install again to see the rename-or-cancel prompt.
4. **Update and unpublish.** Edit the local template, choose Update on it, and confirm the listing changes without a duplicate. Choose Unpublish and confirm it leaves browse. Choose Publish again (Republish) and confirm it returns at the same address.
5. **Delete permanently.** On a published template choose Delete permanently and confirm. Confirm the listing address now shows "no longer available", the saved token is cleared, and your local template is unchanged. (Publish it again first if you need it for the next steps.)
6. **Recovery.** Clear site data for the app, open the listing link, enter the saved owner token in Recover owner controls, and pick the matching local template to relink.
7. **Report.** From a second browser profile, report the listing. Report again to see "already reported". As operator, read `GET /api/template-directory/admin/reports?listingId=…` with the admin token. Also try `POST /api/template-directory/admin/rebuild-index` after deleting the index object to confirm browse recovers.
8. **Operator takedown.** `POST /api/template-directory/admin/suspensions` with the listing id. Confirm the listing is gone from browse and the owner token can no longer update or republish it (a plain message says it was removed).
9. **Read-only vault.** Open a guest vault: browse and preview work, Install and Publish are unavailable with an explanation.

## Automated checks (impacted files only, per repository rules)

```bash
bun run lint:changed
bun run test:changed
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bun scripts/discovery-audit.mjs   # regression check; no governed page changes expected
```

Worker contract tests and the 1,000-listing benchmark run with the worker package tests picked up by `test:changed`.

## What to look for

- Public responses never include the owner token, its hash or reporter hashes.
- Stat sheet directory tests pass unchanged.
- Installing never changes a default or an existing note.
