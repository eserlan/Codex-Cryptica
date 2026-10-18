# Quickstart: Smart Multi-Format Copy

## Goal

Verify that document-like Copy actions expose safe rich HTML and canonical Markdown together, degrade to exact plain text, and do not alter intentional literal-copy behaviour.

## Test-first implementation loop

1. Add or update the focused test before each behaviour change.
2. Run the focused test and observe the expected failure.
3. Implement the smallest contract-compliant change.
4. Re-run the focused tests before moving to the next surface.

## Focused automated checks

```bash
bunx vitest run apps/web/src/lib/services/ClipboardService.test.ts
bunx vitest run apps/web/src/lib/components/seo/generator-copy.test.ts
bunx vitest run apps/web/src/lib/components/seo/SEOGeneratorLayout.test.ts
bunx vitest run apps/web/src/lib/components/seo/EntityDetailModal.test.ts
bunx vitest run apps/web/src/lib/components/modals/NodeReadModal.test.ts
bunx vitest run apps/web/src/lib/services/character-chat-export.test.ts apps/web/src/lib/components/oracle/chat-message-controller.test.ts
```

Required service assertions:

- one item contains both `text/plain` and `text/html`;
- the plain blob contains the exact Markdown input;
- generated and supplied HTML are sanitised;
- missing clipboard-item construction skips to `writeText`;
- missing or rejected `write` falls back to `writeText`;
- fallback rejection or absence returns `false`;
- optional `image/png` remains present for successful entity image copy;
- failed optional image preparation still copies both text representations.

Required surface assertions:

- full generator copy includes title, summary, labels, main content, and optional lore once;
- section copy passes exact trimmed section Markdown;
- historical copy does not duplicate its summary and includes lore;
- current and historical document builders are materially equivalent for equivalent data;
- Session Hub success feedback resets and failure leaves the modal/entity intact;
- generator analytics retain `markdown` and `section` targets and add `session_hub_detail`;
- Node Read copy gains the service fallback;
- Oracle, character chat, and Zen entity copy compatibility APIs still work.

## Manual acceptance matrix

Use a sample containing a heading, nested list, emphasis, link, table, fenced code block, Unicode, and an intentionally unsafe link/attribute.

| Source                            | Paste target           | Expected                                                                    |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Full generator                    | Word/Google Docs/Gmail | Readable formatted structure; no app-only controls/classes or unsafe markup |
| Full generator                    | Markdown/plain editor  | Canonical Markdown including optional At the Table content                  |
| Generator section                 | Both target types      | Same section only, with heading and structure preserved                     |
| Session Hub detail                | Both target types      | Materially equivalent to current-result copy; summary appears once          |
| Node Read entity                  | Both target types      | Entity Markdown/plain plus safe formatted HTML                              |
| Literal URL/key/prompt/source/log | Plain editor           | Exact original value and no document wrapper                                |

Also test a browser/profile where rich clipboard write is denied or unavailable; Copy must still use the plain-text path and reflect success only if that fallback resolves.

## Final repository gates

Run after focused checks pass. The full test command is the constitution-required final verification gate; the repository’s “No Baseline Tests” rule means not to run it as a separate pre-change baseline before implementation.

```bash
bun run test
bun run lint:types
bun run lint
```

Then run the `codex-review` specialist review before opening a ready-for-review PR. Discovery audit is not required because this feature adds no public route or discovery intent.
