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

1. **Confirm the slug.** It must be in `GENERATOR_SLUGS` (`apps/web/src/lib/components/seo/generator-slugs.ts`) and must not already have a `SLUG_GUIDES` entry. Read the page's intro title, meta description, and intro text in `generator-page-meta.ts`.

2. **Inspect the shipped generator before drafting.** Do not treat this as a synonym-replacement exercise; treat it as a content-and-product review per `docs/seo/generator-content-review.md` (#5231):
   - **Controls and defaults:** Read the slug's entry in `generator-page-generation.ts` (AI path), `generator-page-local-generation.ts` (offline path), the page's form defaults (e.g. `generator-page-adventure-defaults.ts` or `generator-page-character-defaults.ts`), and the form fields component (e.g. `NPCFormFields.svelte`). Describe only options a user can actually set on the page.
   - **Real output (non-AI and AI):** Run the local generator at least three times from a scratch script using the exact options the page passes and valid config values (checking every value when one option drives the wording). If the page has no offline path (e.g. `adventure-idea-generator`), run it on the dev server with AI enabled or read its prompt/schema and state that in the PR. Also read the AI prompt and output schema (`build<Name>Prompt`) so your copy holds for both paths. Check for defects: grammar ("a amulet"), casing, empty or repeated sections, and placeholder text.
   - **Static sample vs. real output:** Check the sample draft in `generator-page-drafts*.ts` against real generated output for grammar, consistency, promises that exceed the real output, and clarity that it is an Example when its settings differ from form defaults.
   - **Copy / Save to Codex / handoff shape:** Verify how Copy, Reroll, and **Add to My Codex** / Save behave on the page (including whether explicit generation is required before a save CTA appears) and what entity type/structure is actually imported. Never promise linked entities or preserved structure without verifying it.
   - **FAQs and existing links:** Check any generator-specific FAQs, Answer pages, topic hubs, or `/for` pages that link to or describe this generator (you can run `bun scripts/generator-content-impact.mjs --base origin/staging` for advisory impact).

3. **Choose an editorial proposition before writing.** Complete these two framing sentences for your PR notes:
   - _This generator uniquely helps a GM [do X] by [mechanism Y]._
   - _After reading this guide, the GM can [do something useful at the table]._

4. **Write the summary.** One or two sentences fulfilling the proposition. Say what the generator produces at the table and what the GM does with the result. It must be specific enough that it would be wrong for any other generator.

5. **Write the tips (usually three).** Each tip has a short `title` and a `detail` of one or two sentences. Make each tip do a _different_ job rather than repeating generic advice or mechanically cloning headings from another page:
   - Name actual controls using their exact labels from the form component and explain why a specific combination matters.
   - Include at least one **concrete play consequence** (a decision, conflict, lead, encounter, relationship, or changing situation).
   - Keep lore-creation advice in the GM guide and saving/adoption guidance near the completed result; do not spend a third of the GM guide describing browser storage.

6. **Curate educational continuations and align page copy.**
   - Add the entry to `SLUG_GUIDES`, optionally with up to three genuinely relevant `links` to verified canonical Answer pages (target for richer tools, not a quota). Assess whether a contextual reciprocal link from an Answer to the generator makes sense, without turning Answers into promotional pages.
   - Compare the page's meta description, intro text, static sample (`generator-page-drafts*.ts`), FAQs, and any linked Answer/hub copy with the real output. Fix mismatches and output defects (including ignored form options) in the same PR, with tests covering both success and negative paths per `AGENTS.md`.
   - If touching the completed-result continuation CTA, reuse the shared `#5136`/`#4624`/`#4625` handler, keep it compact and only on explicit generation, and keep copy-first use frictionless. Always wire the slug into `apps/web/src/lib/components/seo/generator-continuation.ts` (and update `generator-continuation.test.ts`) when the generator has vault-importable output (non-`names` variants), overriding any prior Wave 2 / unconfigured exclusion.

## Validate and ship

7. **Run the tests:** `bun scripts/test-changed.mjs --base origin/staging`. If the distinctness test reports shared copy, it names the slugs and the shared words. Rewrite the new guide; do not edit an older guide to make the test pass.

8. **Review the rendered page.** Inspect `/generators/<slug>` on a local dev server (or staging after deploy) at roughly `360px`, `390px`, and desktop: confirm no clipping, horizontal overflow, hidden actions, oversized promotional blocks, or broken focus order, and check explicit-generation, sample, Copy, Save/handoff, and failure states.

9. **Validate** with the PR gate in `AGENTS.md`: `bun scripts/lint-changed.mjs --base origin/staging`, the affected workspace type-check (`bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`), `bun scripts/discovery-audit.mjs` if discovery metadata changed, and the Fallow audit (`bunx fallow audit --format json --quiet --explain --gate-marker agent`) before committing. After committing, review the diff against the codex-review checklist (`.agent/skills/codex-review`), then record the stamp with `bun scripts/codex-review-stamp.mjs`. The pre-push hook (`.husky/pre-push`) refuses a push without a current stamp for HEAD, so stamp again after every new commit. Never skip it with `SKIP_CODEX_REVIEW=1`.

10. **PR body** must include a **"Public copy reviewed"** section covering:
    - Actual controls, defaults, and representative non-AI/AI output inspected (distinguishing static sample from generated output).
    - The two editorial-proposition sentences.
    - Curated Answer link choices and reciprocal-link assessment.
    - Copy / Save / import handoff shape verified, plus any deferred follow-ups linked to `#5136`, `#5046`, or `#4626`.
    - Each fix made in step 6 with the tests that cover it ("No other page needed changes" when accurate).
    - Rendered-page check summary (`360px`, `390px`, desktop).
      If tracked by a GitHub issue, close the slug's issue from the PR.

11. **After deploy,** fetch the live `/generators/<slug>` page and confirm the new summary is in the server HTML.

## Noindex alternative

Use this only when no specific guide is realistic for a generator (for example, its output is too thin to describe without padding). The page stays reachable for people; only the index signals change. All four parts are required, or search engines receive contradictory signals:

1. **One source of truth.** Add the slug to an exported `NOINDEX_GENERATOR_SLUGS` set in `generator-slugs.ts`. Create the set if it does not exist yet.
2. **Robots meta.** In the existing `<svelte:head>` block of `SEOGeneratorLayout.svelte`, output `<meta name="robots" content="noindex" />` when the slug is in the set. Precedent: `apps/web/src/routes/cif/+page.svelte`.
3. **Sitemap.** Exclude the set in `apps/web/src/routes/sitemap.xml/+server.ts`, which currently lists every slug in `GENERATOR_SLUGS`.
4. **IndexNow.** Exclude the set in `apps/web/src/lib/seo/indexnow.ts`, which also lists every slug.

Add tests for each part: a noindexed slug renders the meta tag and is absent from the sitemap and IndexNow lists, and an indexable slug renders no tag and is still listed. Note the reason for noindexing in the PR body.
