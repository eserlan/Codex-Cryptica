# Local PR checks

PR review (dev-agents "Luna") kept finding the same few defect classes after
our local gates had passed. The checks below catch the mechanical ones before a
push. Judgement calls stay in the `codex-review` skill sweeps.

## What runs where

| Check                                      | Runs in                                         | Catches                                                                                       |
| ------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `scripts/check-ui-patterns.mjs`            | `bun run lint:changed`                          | Low theme contrast, remote Markdown images, split visual/keyboard order, timers never cleared |
| `sitemap-discovery.test.ts`                | `bun run test:changed`                          | A live, indexable discovery registry entry that is missing from the sitemap                   |
| `scripts/discovery-audit.mjs`, answer mesh | `bun run lint:changed` (discovery content only) | Duplicate intents, broken reciprocal links                                                    |

## UI pattern rules

Only lines changed against the base (`merge-base HEAD origin/staging`, or
`--base <ref>`) are reported, so existing code never blocks unrelated work. New,
untracked files are checked in full.

- **contrast**: each `text-theme-*` class, including `/NN` opacity and ternary
  branches, is measured against its `bg-theme-*` class on the same element (or
  against the page background and surface when there is none) in every theme
  template, light and dark, with the `app.css` per-theme overrides applied. The
  threshold is 4.5:1 for text and 3:1 for icons and large bold text. Prefixed
  classes (`hover:`, `dark:`) are skipped. The checker cannot see a parent
  element's background, so a tinted parent can still hide a failure.
- **remote-images**: `renderMarkdown(...)` without `allowImages: false`. Model
  output and imported content must not fetch remote images (Constitution IV).
- **visual-order**: a base `order-N` with a different `sm:`/`md:`/`lg:`/`xl:`
  order. Visual order then differs from DOM order, so keyboard and screen
  reader order no longer match what people see.
- **timer-cleanup**: `setTimeout` in a `.svelte` file that never calls
  `clearTimeout`.

When a flagged line is right as it is, add a `ui-check-ignore: <reason>`
comment on that line or the line above.

```sh
bun scripts/check-ui-patterns.mjs                 # changed lines vs origin/staging
bun scripts/check-ui-patterns.mjs --files a.svelte  # only these files
bun test scripts/check-ui-patterns.test.ts
```
