# Implementation Plan: ToV Onboarding, Help and Discovery Pages Tied to Working Features

**Branch**: `feat/3951-tov-discovery-and-help` | **Spec**: [spec.md](./spec.md)  
**Parent Epic**: #3941 | **Issue**: #3951  
**Date**: 2026-10-16

---

## Summary of Changes

1. **Public System Guide**: Create `/for/tales-of-the-valiant` landing pack config and register in discovery intent governance.
2. **Authoritative Reference Answer**: Create `/answers/how-do-i-organise-a-tales-of-the-valiant-campaign` with British English, direct snippet, worked example, and prep checklist.
3. **In-Product Help**: Create `apps/web/src/lib/content/help/tales-of-the-valiant.md` with comprehensive instructions for all shipped ToV features, and update `tales-of-the-valiant-generators.md` references.
4. **Legal & CC BY 4.0 Notices**: Include accurate Black Flag Reference Document attribution on public pages.
5. **Quality Gates**: Pass discovery audit, answer schema validation, linting, and targeted tests.

---

## Proposed Workspaces & Files

### Modified Files:

- `apps/web/src/lib/content/discovery/entries/for.ts`: Register `/for/tales-of-the-valiant`.
- `apps/web/src/lib/content/discovery/entries/answers.ts`: Register `/answers/how-do-i-organise-a-tales-of-the-valiant-campaign`.
- `apps/web/src/lib/content/for/packs/index.ts`: Export `talesOfTheValiant` landing page config.
- `apps/web/src/lib/content/answers/pages/index.ts`: Export the new ToV answer.

### New Files:

- `apps/web/src/lib/content/for/packs/tales-of-the-valiant.ts`: System landing page pack.
- `apps/web/src/lib/content/answers/pages/how-do-i-organise-a-tales-of-the-valiant-campaign.ts`: Structured answer config.
- `apps/web/src/lib/content/help/tales-of-the-valiant.md`: In-app help guide.
- `apps/web/src/lib/content/for/packs/tales-of-the-valiant.test.ts`: Landing pack unit tests.
- `apps/web/src/lib/content/answers/pages/how-do-i-organise-a-tales-of-the-valiant-campaign.test.ts`: Answer validation and anti-AI-tell tests.

---

## Quality Gates Checklist

- [ ] `bun scripts/discovery-audit.mjs` passes with 0 errors.
- [ ] `bun run test:changed` passes with 0 errors.
- [ ] `bun run lint:changed` passes with 0 errors.
- [ ] `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` passes with 0 errors.
- [ ] `bunx fallow audit --format human --base origin/staging` passes with 0 introduced blocking findings.
