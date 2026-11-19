# Local PR checks

PR review (dev-agents "Luna") kept finding the same few defect classes after
our local gates had passed. The checks below catch the mechanical ones before a
push. Judgement calls stay in the `codex-review` skill sweeps.

## What runs where

| Check                                      | Runs in                                         | Catches                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-ui-patterns.mjs`            | `bun run lint:changed`                          | Low theme contrast, remote Markdown images, split visual/keyboard order, timers never cleared, root paths without `resolve()` |
| `sitemap-discovery.test.ts`                | `bun run test:changed`                          | A live, indexable discovery registry entry that is missing from the sitemap                                                   |
| `scripts/discovery-audit.mjs`, answer mesh | `bun run lint:changed` (discovery content only) | Duplicate intents, broken reciprocal links                                                                                    |

## UI pattern rules

Only lines changed against the base (`merge-base HEAD origin/staging`, or
`--base <ref>`) are reported, so existing code never blocks unrelated work. New,
untracked files are checked in full.

- **contrast**: each `text-theme-*` class (including `danger`/`warning`, `/NN`
  opacity, and ternary branches) is measured against its `bg-theme-*` class on
  the same element (or against the page background and surface when there is
  none) in every theme template, light and dark, with the `app.css` per-theme
  overrides applied. The threshold is 4.5:1 for text and 3:1 for icons and large
  bold text. The checker cannot see a parent element's background, so a tinted
  parent can still hide a failure.
- **state-contrast**: checks interactive state contrast for `hover:text-theme-*`
  / `hover:bg-theme-*`, `disabled:text-theme-*` / `disabled:opacity-NN`, and 3:1
  non-text contrast on `focus:` / `focus-visible:` ring and outline tokens.
- **border-contrast**: checks 3:1 non-text contrast on outlined interactive
  controls (`<button>`, `<input>`, `<select>`, `<textarea>`) using
  `border-theme-*` without a solid primary/accent fill.
- **modal-focus**: flags raw `aria-modal="true"` or `role="dialog"` in `.svelte`
  files that do not use `use:focusTrap` or `ModalShell` (or explicit `Tab`
  trapping with focus restoration).
- **remote-images**: `renderMarkdown(...)` without `allowImages: false`. Model
  output and imported content must not fetch remote images (Constitution IV).
- **visual-order**: a base `order-N` with a different `sm:`/`md:`/`lg:`/`xl:`
  order. Visual order then differs from DOM order, so keyboard and screen
  reader order no longer match what people see.
- **timer-cleanup**: a `.svelte` `setTimeout` whose stored ID is not cleared in
  an `onDestroy` handler or `$effect` cleanup.
- **base-path**: a string literal starting with `/` passed to `goto`,
  `pushState`, `replaceState`, `preloadData`, `preloadCode`, `redirect` or
  `serviceWorker.register`. Build it with `resolve()` from `$app/paths` so
  base-path deployments keep working (PR #4412). Applies to `.ts` files too.

These rules match source text, not a syntax tree, so a pass is not proof:
spreads, comments and shadowed names can hide a problem. Ambiguous shapes are
flagged rather than guessed.

When a flagged line is right as it is, add a `ui-check-ignore: <reason>`
comment on that line or the line above.

```sh
bun scripts/check-ui-patterns.mjs                 # changed lines vs origin/staging
bun scripts/check-ui-patterns.mjs --files a.svelte  # only these files
bun test scripts/check-ui-patterns.test.ts
```

## Reusable safety & test helpers

- `apps/web/src/lib/components/ui/PaginatedList.svelte`: reusable, accessible
  paginated list with theme-compliant contrast and bounded DOM rendering for
  imported or user-supplied collections.
- `packages/adventure-engine/src/adventure-json/creature-proposals.ts`
  (`escapeEntryText`, exported from `@codex/adventure-engine`): escapes
  Markdown/HTML control characters, `https?://`, and `www.` so imported or
  user text stays literal prose without remote images or autolinked URLs.
- `apps/web/src/lib/services/vault-scoped-batch.ts` (`runVaultScopedBatch`):
  reusable async per-item runner for multi-write Vault workflows. Captures the
  active Vault ID at start, checks Vault identity and optional `AbortSignal`
  before/after each item, and reports `{ processed, total, interrupted, cancelled }`.
- `apps/web/src/lib/test-utils/pr-guardrails.ts`: shared Vitest assertions for
  recurring PR review defects—`assertNoRemoteResourceFetches(html)`,
  `assertNoActiveLinks(html)`, and `assertBoundedPerformance(label, fn, maxMs)`.
