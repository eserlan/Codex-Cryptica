---
name: write-generator-guide
description: Write a page-specific "How to use the …" guide for one public generator page (/generators/[slug]) at a time, so it replaces the shared fallback template. Covers reading real generator output, writing a summary and three tips, enforcing distinct copy with a test, and the noindex alternative when no real guide is possible.
---

# Write a Generator Guide

Each public generator page shows a "How to use the …" section. The section reads from `SLUG_GUIDES` in `apps/web/src/lib/components/seo/generator-page-guides.ts`. When a slug has no entry, `defaultGuideForSlug` supplies a template. That template ignores the slug, so every fallback page carries the same summary and tips with only the name changed. This gives readers little page-specific help. Google's scaled content abuse policy concerns many pages produced primarily to manipulate rankings rather than help users; repeated sections alone do not establish a policy violation ([Google Search Central spam policies](https://developers.google.com/search/docs/essentials/spam-policies)).

This skill replaces the fallback with copy written for one generator per run.

## Hard rules

- **Never use `defaultGuideForSlug`** or any other template for a new guide. Each entry must describe that generator's actual output.
- **No copy may be shared across guides.** The distinctness test in `generator-page-guides.test.ts` fails when any run of eight words appears in two guides. That catches copied sentences and name-swapped templates. Do not work around it by shuffling words; rewrite from the generator's own output.
- **Describe what the generator produces**, not the roadmap, the prompt wording, or a feature it does not have. Check the output first.
- **British English**, plain language, no hype. New copy must not use em dashes (U+2014) or en dashes (U+2013); use commas, colons, parentheses or full stops. Some older guides contain dashes; leave them unless you are rewriting that guide.
- If a real guide is not possible for a page, use the noindex alternative below. Do not leave the template indexable.

## One slug per run

Each run handles exactly one slug, on its own branch, in its own PR. Do not batch slugs, even closely related ones. The distinctness test still compares the new guide with every existing guide, so overlap with related generators that already have guides is caught.

## Steps

1. **Confirm the slug.** It must be in `GENERATOR_SLUGS` (`apps/web/src/lib/components/seo/generator-slugs.ts`) and must not already have a `SLUG_GUIDES` entry. Read the page's intro title and description in `generator-page-meta.ts`.

2. **Find what the page actually passes.** The engine may accept more options than the page uses. Read the slug's entry in `generator-page-generation.ts` (the AI path) and `generator-page-local-generation.ts` (the offline path), the page's form defaults (for example `generator-page-adventure-defaults.ts`), and the slug's form fields component (for example `MagicItemFormFields.svelte`). Describe only options a user can set on the page. An engine option the page never passes, such as a theme, falls back to its default on every run, so do not mention it.

3. **Generate real output.** The generator logic is in `apps/web/src/lib/services/seo/generator-engine-*.ts`, which often delegates to `packages/generator-engine/src/public-<slug>.ts`. Check the slug has an offline path in `generator-page-local-generation.ts`. If it does not (for example `adventure-idea-generator` at the time of writing), you cannot run it from a scratch script: read its AI prompt and output schema, and run the page on the dev server with AI enabled, or write the guide only from what the page's form and prompt make the output contain, and say so in the PR. Otherwise, run the local generator at least three times from a scratch script, using the same options the page passes and valid values from the generator's config. Invalid values fall back to defaults without an error, and casing comes from your input, so do not report a quirk caused by your own input as a generator defect. If the page offers AI, read the prompt's output schema (`build<Name>Prompt`) as well, and write copy that holds for both paths. The sample drafts in `generator-page-drafts*.ts` are hand-picked examples, so use them only as a cross-check. Note the fields a GM actually gets and which options change them. Before you state that an option affects the result, confirm it in the code. Confirm any scripted measurement (for example, counting distinct effects across options) against a direct sample: print the output for one fixed seed and read it before relying on the numbers. Read the output for defects as well: grammar (such as "a amulet"), casing, empty or repeated sections, and placeholder text. When one option drives the wording (for example the item type or form), check every value of that option, not only three runs.

4. **Write the summary.** One or two sentences. Say what the generator is for at the table and what the GM does with the result. It must be specific enough that it would be wrong for any other generator.

5. **Write three tips.** Each tip has a short `title` and a `detail` of one or two sentences. Each tip should point to a concrete field, option or result from the output you generated in step 3. Avoid advice that would fit any generator, such as "customise the tone first". When a tip names a form field or option, use its exact label from the form component.

6. **Add the entry** to `SLUG_GUIDES`, following the shape of the existing entries (`summary`, `tips`, optional `links` to related Answer pages or generators that exist).

## Validate and ship

7. **Run the tests:** `bun scripts/test-changed.mjs --base origin/staging`. If the distinctness test reports shared copy, it names the slugs and the shared words. Rewrite the new guide. Do not edit an older guide to make the test pass.

8. **Check public copy and fix what you find.** Follow `docs/seo/generator-content-review.md`. Confirm the guide matches what the generator produces. Also compare the page's own meta description, intro text and form help text with the real output, and check any Answer page, topic hub or example that describes this generator. Fix every mismatch, and every output defect found in step 3, in the same PR. That includes generator behaviour, for example an option the form offers that one path ignores. Add tests for each behaviour fix, covering the success path and at least one negative path as `AGENTS.md` requires, and write the guide for the behaviour after the fix. Do not split fixes into separate issues or PRs unless the person asks.

9. **Validate** with the PR gate in `AGENTS.md`: `bun scripts/lint-changed.mjs --base origin/staging`, the affected workspace type-check (`bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`), and the Fallow audit (`bunx fallow audit --format json --quiet --explain --gate-marker agent`) before committing. After committing, review the diff against the codex-review checklist (`.agent/skills/codex-review`), then record the stamp with `bun scripts/codex-review-stamp.mjs`. The pre-push hook (`.husky/pre-push`) refuses a push without a current stamp for HEAD, so stamp again after every new commit. Never skip it with `SKIP_CODEX_REVIEW=1`.

10. **PR body** must include a **"Public copy reviewed"** note for the slug: what output you checked and whether any other page needed changes ("No changes needed" is valid), and each fix made in step 8 with the tests that cover it. If the work is tracked by GitHub issues, close the slug's issue from the PR.

11. **After deploy,** fetch the live `/generators/<slug>` page and confirm the new summary is in the server HTML.

## Noindex alternative

Use this only when no specific guide is realistic for a generator (for example, its output is too thin to describe without padding). The page stays reachable for people; only the index signals change. All four parts are required, or search engines receive contradictory signals:

1. **One source of truth.** Add the slug to an exported `NOINDEX_GENERATOR_SLUGS` set in `generator-slugs.ts`. Create the set if it does not exist yet.
2. **Robots meta.** In the existing `<svelte:head>` block of `SEOGeneratorLayout.svelte`, output `<meta name="robots" content="noindex" />` when the slug is in the set. Precedent: `apps/web/src/routes/cif/+page.svelte`.
3. **Sitemap.** Exclude the set in `apps/web/src/routes/sitemap.xml/+server.ts`, which currently lists every slug in `GENERATOR_SLUGS`.
4. **IndexNow.** Exclude the set in `apps/web/src/lib/seo/indexnow.ts`, which also lists every slug.

Add tests for each part: a noindexed slug renders the meta tag and is absent from the sitemap and IndexNow lists, and an indexable slug renders no tag and is still listed. Note the reason for noindexing in the PR body.
