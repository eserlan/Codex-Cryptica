---
name: write-generator-guide
description: Write, audit, score or improve the surrounding content of public generator pages (/generators/[slug]), including existing guides, examples, FAQs, curated Answers and the completed-result journey into the local Codex vault. Use for initial guide migrations and editorial polish; assess each slug against an evidence-based 8/10 threshold.
---

# Write a Generator Guide

Each public generator page shows a "How to use the …" section. The section reads from `SLUG_GUIDES` in `apps/web/src/lib/components/seo/generator-page-guides.ts`. When a slug has no entry, `defaultGuideForSlug` supplies a template. That template ignores the slug, so every fallback page carries the same summary and tips with only the name changed. This gives readers little page-specific help. Google's scaled content abuse policy concerns many pages produced primarily to manipulate rankings rather than help users; repeated sections alone do not establish a policy violation ([Google Search Central spam policies](https://developers.google.com/search/docs/essentials/spam-policies)).

Use this skill for both initial migrations and reviews of existing guides. The editorial goal is to help the visitor make a useful GM decision, learn what to do next and optionally continue working in the vault. Score the surrounding materials and the transition, not the creativity or quality of newly generated AI or non-AI content. A representative result is evidence of the product contract, not the subject of the editorial assessment.

## Hard rules

- **Never use `defaultGuideForSlug`** or any other template for a new guide. Each entry must describe that generator's actual output.
- **No copy may be shared across guides.** The distinctness test in `generator-page-guides.test.ts` fails when any run of eight words appears in two guides. That catches copied sentences and name-swapped templates. Do not work around it by shuffling words; rewrite from the generator's own output.
- **Describe what the generator produces**, not the roadmap, the prompt wording, or a feature it does not have. Check the output first.
- **British English**, plain language, no hype. New copy must not use em dashes (U+2014) or en dashes (U+2013); use commas, colons, parentheses or full stops. Some older guides contain dashes; leave them unless you are rewriting that guide.
- If a real guide is not possible for a page, use the noindex alternative below. Do not leave the template indexable.

## Scope and workflow

Default to one slug per run and PR. A grouped editorial issue may cover multiple slug-specific reviews in a bounded PR when required by the factory workflow; repeat the evidence and scoring for each slug independently, preserve the distinctness check against all other guides, and coordinate shared-file edits. Do not close a grouped issue until every listed slug is accounted for. For a review-only request, report the scores and findings without editing.

## Steps

1. **Confirm the canonical slug and starting state.** It must be in `GENERATOR_SLUGS` (`apps/web/src/lib/components/seo/generator-slugs.ts`). If it has no `SLUG_GUIDES` entry, migrate the fallback; otherwise review the existing guide and preserve what already works. Read `generator-page-meta.ts`, the existing guide, preloaded example, FAQs, Answers and continuation config. Score the baseline using the rubric below. Do not rewrite a passing page without a concrete reason.

2. **Inspect the shipped generator before drafting (editorial evidence gate).** Follow `docs/seo/generator-content-review.md` (#5231):
   - **Verify the actual controls and product promises.** Inspect the form/component defaults, result layout and save contract. Exercise at least one representative explicit generation using the available mode (non-AI is sufficient for ordinary editorial review) and inspect the rendered result. Verify any mode-specific claim against the relevant AI/non-AI implementation or an observed result; distinguish the static example from the generated result. Record evidence and any limitation rather than guessing.
   - **Verify the handoff**, not just the presence of a save button. Inspect the canonical key, actual imported type, sections, relationships and maps as applicable. Distinguish named references in text from real graph connections, intentional GM-only content from player-safe content, and staged transfer from confirmed local persistence. Follow the actual arrival steps in step 8.
   - **Keep generator-engine QA separate.** Do not require three seeded generations, assess creative/semantic output quality, or rewrite prompts, schemas, parsers or deterministic mechanics merely to polish surrounding copy. If the task explicitly includes generation-engine QA or changes its behaviour, retain the deeper checks: at least three representative deterministic runs over control combinations/edge cases where supported, AI output or prompt/schema/parser verification, and a trace of controls through generation, parsing, formatting, rendering and import. Check preservation, meaningful control coverage, identity/reference consistency, GM-only handling and success/failure paths. This is a separate engineering assessment, not part of the editorial score.
   - **Disposition:** Do not conceal broken functionality with copy. Fix misleading surrounding copy and bounded in-scope defects with tests; link discovered engine, shared UI or import defects to focused owner issues. If a necessary claim or transition cannot be verified, mark it unverified or blocked rather than awarding full points. Avoid expanding editorial PRs into redesigns.

3. **Choose an editorial proposition before writing.** Complete these two framing sentences for your PR notes:
   - _This generator uniquely helps a GM [do X] by [mechanism Y]._
   - _After reading this guide, the GM can [do something useful at the table]._

4. **Write the summary.** One or two sentences fulfilling the proposition. Say what the generator produces at the table and what the GM does with the result. It must be specific enough that it would be wrong for any other generator.

5. **Write the tips (usually three).** Each tip has a short `title` and a `detail` of one or two sentences. Make each tip do a _different_ job rather than repeating generic advice or mechanically cloning headings from another page:
   - **GM usefulness comes first:** Explain how to turn the output into playable situations. Use actual controls by their exact form labels where relevant. **Every tip must teach a distinct GM decision or action and its concrete play/worldbuilding consequence.** For example, explain why a GM would choose a control value and what scene, tension, complication or relationship that choice enables, rather than naming the section it fills. Simple copy-first tools may teach a useful naming or improvisation decision instead.
   - **Keep mechanics out of the guide:** Do not write tips that merely document field mapping or AI/offline differences (for example, "In offline drafts, X appears as Y"); keep those details in QA notes or FAQs unless essential to using the generator.
   - **Distinctiveness check:** Ask whether each piece of advice would still make sense on another generator page. If yes, rewrite it.
   - Keep lore-creation advice in the GM guide and saving/adoption guidance near the completed result; do not spend a third of the GM guide describing browser storage.

   **GM usefulness & editorial quality gate (pass before drafting links):** Answer this question explicitly in your PR notes: _"What can a GM now do at the table that they couldn't do before reading this guide?"_ If the answer is "they know which field populates which section", rewrite the guide until it teaches a concrete table move.

6. **Design an editorial progression and align page copy.**
   - **Intent → next-step progression → validated links → rationale:** Identify the visitor's starting point and what they have after generating, then pick 1–3 distinct next-step jobs in deliberate reading order (for example: build/understand → run at the table → track across sessions, or prep → encounter → aftermath). Three is a cap, not a quota; one or two strong links beat padding a third.
   - Inspect candidate Answer pages' actual content and canonical routes before linking, write benefit-led labels showing what the visitor can do next, and assess contextual reciprocal links without adding promotional blocks.
   - Compare the page's meta description, intro text, static sample (`generator-page-drafts*.ts`), FAQs and affected Answer/hub copy with verified capabilities. The preloaded example must be concrete, clearly an example and representative of the current product, even if its defaults differ. Fix inaccurate copy; keep FAQs specific, with mode and storage details only where useful. Record discovered engine defects separately unless explicitly in scope. Use `bun scripts/generator-content-impact.mjs --base origin/staging` when changes affect linked public content.
   - Check the completed-result continuation on every review, even if the guide alone changed. Use the shared #5136/#4624/#4625 handler; configure the canonical slug in `apps/web/src/lib/components/seo/generator-continuation.ts` and update `generator-continuation.test.ts` for eligible vault-importable outputs. Do not leave eligible slugs excluded merely because of a prior rollout wave. Resolve canonical/legacy alias mismatches. A concise, generator-specific benefit and **Add to my Codex** action belong near the successful result/actions, not below a long document or sales block. Never show the contextual CTA for a preloaded example, empty, loading or failed result. Preserve Copy/Reroll/Share. Copy-first `names` and genuinely unsupported tools remain exempt; document eligibility and any shared-work dependency rather than inventing or duplicating an importer.

## Editorial quality rubric (10 points)

Score each slug before and after changes against the same evidence. Award each checkpoint 1 for fully met, 0.5 for partial, 0 for absent or unverified. Do not award points for planned work, the number of generated runs, or creativity/semantic quality of generated results.

| Area                     | Points | Evidence checkpoints (1 point each)                                                                                                                                                                                                                                                                             |
| ------------------------ | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Practical GM guidance    |      3 | Distinct editorial proposition; exact relevant controls with reasons for choosing them; every tip teaches a useful, distinct GM decision/action with a concrete consequence.                                                                                                                                    |
| Intro, example and FAQ   |      2 | Accurate, distinctive intro and appropriate, specific FAQs (no filler or misleading claims); clearly identified, concrete and representative static example.                                                                                                                                                    |
| Curated learning journey |      2 | Relevant canonical Answers verified by reading the destinations; deliberate next-step progression, with benefit-led labels explaining what the reader can do next.                                                                                                                                              |
| Vault continuation       |      3 | Discoverable contextual action with a generator-specific benefit near explicit successful results; truthful state/eligibility copy and frictionless use alongside other result actions; verified arrival at the correct persisted entity/root with expected structure and no unrelated onboarding interruption. |

For a genuinely copy-first or unsupported tool, assess the last three checkpoints against its appropriate next action (e.g. quick selection and copying, honest copy-first proposition, and a successful copy with no forced vault). Do not penalise the absence of an irrelevant CTA. For Answers, choose 1–3 genuinely useful articles where available; no quota. If none is appropriate, document the actual search and rationale for omitting links, rather than inventing filler; assess the resulting learning journey proportionately.

**Pass: at least 8/10 per slug.** An eligible page with only the generic Save to Codex fallback or missing contextual CTA is capped at 7.5/10, even if generic saving works. A misleading product claim, failed or unverified essential transition, or unresolved major accessibility/arrival blocker prevents a pass regardless of subtotal. Record the raw score, any cap/blocker and the final status. Mark incomplete verification explicitly; do not inflate a score to close work. A bounded editorial improvement may ship with a linked shared-work dependency (#5136, #5046, #4626 or #5328 as appropriate); record its provisional score and outstanding acceptance rather than declaring the entire journey complete. Keep indexability decisions subject to the noindex criteria below, not the numeric score alone.

## Validate and ship

7. **Run the tests:** `bun scripts/test-changed.mjs --base origin/staging`. If the distinctness test reports shared copy, it names the slugs and the shared words. Rewrite the guide under review; do not edit an unrelated guide to make the test pass.

8. **Review the rendered page and complete the actual journey.** Inspect `/generators/<slug>` on a local dev server (or staging) at roughly `360px`, `390px` and desktop. Check legibility, focus, overflow, Copy/Reroll/Share, learning links, sample versus explicit result, and that the primary action is discoverable near the result. For eligible tools, explicitly generate, click the shared CTA in a fresh isolated browser/local test vault, and verify the imported entity or meaningful batch root is visible and selected, content/type/labels and any promised structure survive, persistence is confirmed (including reload), and unrelated onboarding does not obscure the result. Check an existing-vault path and failure/retry state proportionate to the changed behaviour using existing tests; keep local test lore private. For copy-first tools, generate and copy/select a result without a forced vault. Record observed states, not only source-code assumptions. If blocked (e.g. Turnstile), use a local dev server or appropriate existing end-to-end evidence; identify any remaining verification gap and owner issue. Do not simulate, bypass access controls or claim an untested import succeeded.

9. **Validate** with the PR gate in `AGENTS.md`: `bun scripts/lint-changed.mjs --base origin/staging`, the affected workspace type-check (`bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`), `bun scripts/discovery-audit.mjs` if discovery metadata changed, and the Fallow audit (`bunx fallow audit --format json --quiet --explain --gate-marker agent`) before committing. After committing, review the diff against the codex-review checklist (`.agent/skills/codex-review`), then record the stamp with `bun scripts/codex-review-stamp.mjs`. The pre-push hook (`.husky/pre-push`) refuses a push without a current stamp for HEAD, so stamp again after every new commit. Never skip it with `SKIP_CODEX_REVIEW=1`.

10. **PR body** must include **"Public copy reviewed"** with concise per-slug **Review Evidence & Defect Disposition**:
    - Baseline and final rubric sub-scores, total, any cap/blocker, pass/fail and concrete evidence for each checkpoint.
    - Actual controls, representative generation mode/result inspected, and what the GM can now do; example, intro and FAQ changes/verified claims.
    - Answer destinations, progression roles, benefits and reciprocal-link assessment; rationale for fewer links where appropriate.
    - Completed-result CTA or copy-first evidence; actual staged/imported status, entity/root, sections, labels, persisted structure versus textual references, onboarding/arrival, and fresh/existing-vault verification. Include mobile/desktop checks and any unverified states.
    - Fixed defects and tests; linked deferred or blocking issues. Include deeper generation-engine QA evidence only when that behaviour was in scope.
      Close a tracked slug issue only after the required review passes; for grouped issues record completed and outstanding slugs individually. If a shared blocker remains, link it and keep the unresolved acceptance visible.

11. **After deploy,** fetch the live `/generators/<slug>` page and confirm the updated surrounding copy is in the server HTML where intended, and the explicit-success continuation/copy-first journey behaves as reviewed. Record deployment verification separately from local/staging evidence.

## Noindex alternative

Use this only when no specific guide is realistic for a generator (for example, its output is too thin to describe without padding). The page stays reachable for people; only the index signals change. All four parts are required, or search engines receive contradictory signals:

1. **One source of truth.** Add the slug to an exported `NOINDEX_GENERATOR_SLUGS` set in `generator-slugs.ts`. Create the set if it does not exist yet.
2. **Robots meta.** In the existing `<svelte:head>` block of `SEOGeneratorLayout.svelte`, output `<meta name="robots" content="noindex" />` when the slug is in the set. Precedent: `apps/web/src/routes/cif/+page.svelte`.
3. **Sitemap.** Exclude the set in `apps/web/src/routes/sitemap.xml/+server.ts`, which currently lists every slug in `GENERATOR_SLUGS`.
4. **IndexNow.** Exclude the set in `apps/web/src/lib/seo/indexnow.ts`, which also lists every slug.

Add tests for each part: a noindexed slug renders the meta tag and is absent from the sitemap and IndexNow lists, and an indexable slug renders no tag and is still listed. Note the reason for noindexing in the PR body.
