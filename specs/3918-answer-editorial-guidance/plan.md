# Implementation Plan: Reader-first Answer authoring

**Branch**: `3918-answer-editorial-guidance` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

## Summary

Update the add-answer drafting guidance around reader intent and demonstrated outcomes. Keep the current Zod model and rendering blocks. Remove universal test policies that force article shape or product links, and replace them with structural contract tests and sample-specific editorial regressions. Deliver a documented benchmark, not an automated quality score.

## Technical Context

**Language/Version**: Markdown; TypeScript 6.0.3; Bun 1.3.14.

**Primary dependencies**: Existing Zod, Vitest and Answer registry; no new dependency.

**Storage**: Versioned guidance and benchmark documents; no runtime persistence change.

**Testing**: Focused Answer schema/registry tests, existing editorial and mesh tests, mirror compatibility checks.

**Platform/type**: Internal authoring workflow supporting existing SvelteKit reference pages.

**Performance goals**: No runtime performance change.

**Constraints**: Preserve #3035, constitution, existing post-merge correction process and backwards compatibility.

**Scope**: Skill entry points, targeted tests and editorial benchmark; no production article changes required.

## Constitution Check

Pre-research: PASS. Post-design: PASS with the validation obligations below.

- I/III: Reuse the existing schema/renderer; no new engine, editorial classifier or duplicate policy framework.
- II/X: Test valid omission and meaningful invalid input before changing universal registry assertions. Retain article-specific factual regressions.
- V/VIII: No user data, network service, store or DI change.
- VI/XI: Impacted-only checks; distinguish machine-valid structure from editorial judgement.
- VII: N/A, no new app feature. Author documentation is the changed skill itself.
- IX: Plain British English and audience-appropriate explanations remain required.
- XIII: No new or repositioned public discovery page. Recheck intent ownership and run discovery audit if implementation expands to published content.
- XIV: Skill is over 500 lines but has one responsibility, Answer authoring. Keep supporting benchmark material separate. The large registry test file is exempt as tests; prefer a focused schema test file for new contract fixtures.

## Project Structure

- `.agent/skills/add-answer/SKILL.md`: canonical guidance.
- `.agents/skills/add-answer/SKILL.md`, `.codex/skills/add-answer/SKILL.md`: synchronised compatibility copies; inventory any additional tracked copies before editing.
- `apps/web/src/lib/content/answers/schema.ts`: unchanged contract unless implementation discovers a genuine contradiction.
- `apps/web/src/lib/content/answers/schema.test.ts`: focused acceptance/rejection cases (new if absent).
- `apps/web/src/lib/content/answers/registry.test.ts`: remove universal shape/product-placement assertions; retain factual and content-specific checks.
- `docs/answer-editorial-benchmark-3918.md`: source-pinned comparison, two contrasting critiques, sample rewrites and outcome assessment.
- `specs/3918-answer-editorial-guidance/`: design artifacts; tasks.md is a subsequent task-generation step.

## Implementation sequence

1. Inventory tracked entry points and compare copies. Reconcile current canonical art direction, image workflow and category guidance before synchronising. Preserve #3035 principles and #4012/#4013 checks. Do not blindly overwrite newer content.
2. Write focused contract tests: concise valid definition with omitted optional blocks/product/tools; each block still valid when present; reject empty sections, blank required strings, malformed table and invalid supplied links. Keep existing schema constraints; no new minimum length target.
3. Replace registry-wide assertions requiring an example, three sections, a >140-character excerpt and a non-Answer Codex link. Preserve substantive sample-specific assertions, R2, live routes, related-Answer reciprocity and discovery checks. Editorial completeness becomes a documented outcome assessment, not a substitute numerical test.
4. Rewrite skill policy and scaffold together. Provide a small intent-to-format decision table, adaptable block examples and a pre-draft reader/job statement. Remove mandatory comparison, checklist, takeaway and product placement from both prose and template. Maintain a direct, self-contained excerpt without a character floor. Remove the current 10–15% trimming target; use retained meaning and reader outcomes to judge compression.
5. Add cross-section compression, audience, authoritative grounding/version checks, next-job links and evidence-backed optional product connection. Correct the skill's verification commands to impacted-only checks. Keep deterministic checks separate from judgement.
6. Produce the benchmark described in research.md. Assess each rewrite by what the reader can now calculate, decide, recognise or prepare. Record residual uncertainty and independent verification needs. Do not modify production articles solely to satisfy this demonstration.
7. Synchronise mirrors; inspect the diff for retained safeguards. Run quickstart.md checks, specialist codex-review and Fallow before any later commit/PR. Resolve findings; no commit or PR is part of this planning request.

## Risks and controls

- Relaxed tests could admit stubs: retain structural validation and article-specific regressions; demonstrate completeness through concrete reader tasks.
- Green checks cannot prove prose quality or source correctness: retain independent editorial verification and the existing correction loop.
- Mirrors already differ: reconcile rather than copy without review; verify byte equality after reconciliation if full copies are retained.
- Historical corrections are incomplete: use exact commit snapshots, not today's evolved article, and explicitly document remaining weaknesses.

## Complexity Tracking

No constitution exceptions or added runtime architecture.
