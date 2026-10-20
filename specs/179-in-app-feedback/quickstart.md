# Quickstart: In-App Problem Reports and Feedback

How to prove the feature works end to end. Details are in [the contract](./contracts/feedback-report-api.md) and [data model](./data-model.md).

## Prerequisites

1. A **private** GitHub repository for triage (for example `eserlan/codex-cryptica-feedback`) with the labels `report:problem`, `report:idea` and `report:other`.
2. A fine-grained personal access token limited to that repository, with **Issues: read and write** and no other permission.
3. Worker configuration (see `docs/feedback-triage.md`):

   ```sh
   cd apps/workers/oracle-proxy
   bunx wrangler secret put FEEDBACK_GITHUB_TOKEN
   bunx wrangler secret put FEEDBACK_HASH_KEY
   # FEEDBACK_GITHUB_REPO is set under [vars] in wrangler.toml
   ```

   For local runs, put the same values in `apps/workers/oracle-proxy/.dev.vars`, which is not committed.

## Automated checks

```sh
bun run --cwd packages/feedback-engine test
bun run --cwd apps/workers/oracle-proxy test -- feedback
cd apps/web && bunx vitest run src/lib/components/feedback src/lib/services/feedback src/lib/stores/ui/feedback-dialog.svelte.test.ts
```

Expected:

- the contract, redaction table, area mapping, reference format and issue rendering pass
- the worker passes its success, duplicate, rate-limit, misconfigured and GitHub-failure cases, and its privacy assertions
- the dialog passes its success, failure and accessibility cases

## Manual scenarios

Run `bun run dev:proxy` and `bun run dev`, and use the app on `http://localhost:5173`.

1. **Problem from the tabletop, phone width** (Story 1, SC-001): set the viewport to 360 px, open a map with the tabletop on, then Help → Report a problem → "Something isn't working". Type a description and submit. **Expect**: at most three actions after opening Help and under two minutes in total (time it), then a confirmation with a `CC-XXXX-XXXX` reference. The private repository has a new issue `[Problem] CC-…` labelled `report:problem`, and the area is `tabletop`.
2. **Idea from a public generator** (Story 2): on `/generators/npc`, use the footer "Report a problem" link and choose "I have an idea". **Expect**: an issue `[Idea] CC-…` with the area `public-generators`.
3. **Disclosure matches** (Story 3): open the form inside a campaign with content. **Expect**: the "What is sent" list shows exactly the app version, area, browser and screen values. It says reports are stored as private issues on GitHub, and that an email, if given, is stored with the report. The issue contains those values, the description and the email, and nothing else.
4. **Secret in text** (Story 3): include `my key is sk-abc123def456ghi789jkl012mno345`. **Expect**: the issue shows `[removed: possible secret]` instead of the key.
5. **Markup stays inert** (Story 5): include `![x](https://example.com/p.png) <script>alert(1)</script> @eserlan`. **Expect**: the issue shows that text verbatim inside a code block, with no image, no script and no mention notification.
6. **Offline** (Story 4): turn on DevTools → Network → Offline and submit. **Expect**: the offline message, the text is kept, Retry is offered, and the Discord and GitHub alternatives are shown. Go back online and retry. **Expect**: one issue.
7. **Double submit** (Story 4): throttle the network and click Submit twice. **Expect**: one issue, one reference.
8. **Limit** (Story 4): submit six reports within an hour. **Expect**: the sixth shows the limit message and keeps its text.
9. **Misconfigured** (Story 4): remove `FEEDBACK_GITHUB_TOKEN` from `.dev.vars` and submit. **Expect**: the unavailable message, never a confirmation.
10. **Keyboard and screen reader** (FR-010): open the form from the Help window using only the keyboard. **Expect**: focus moves into the dialog, every control is named, errors are announced, Escape closes it, and focus returns to the opener. Check in light and dark themes.
11. **Deletion by reference** (Story 5): run `bun scripts/feedback-delete.ts CC-XXXX-XXXX` while logged in to `gh` as the maintainer. **Expect**: the issue is deleted, not just closed.
