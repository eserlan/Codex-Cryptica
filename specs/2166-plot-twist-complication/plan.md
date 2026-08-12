# Implementation Plan: Plot Twist & Complication Generator

**Branch**: `2166-plot-twist-complication` | **Date**: 2026-08-12 | **Spec**: `specs/2166-plot-twist-complication/spec.md`

## Summary

Add a rich, structured in-app campaign generator for turning an existing
premise or bounded campaign context into a coherent twist or complication. The
engine will live in `packages/generator-engine`, reuse the existing public
generator prompt/parser/fallback pattern, and be exposed through the generic
campaign generator registry and form. It will map to a `note` draft and will
not add a new public `/generators` route in this slice.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: `packages/generator-engine`, existing `parseFencedJson`, theme maps, campaign context helpers, generic `GeneratorConfigForm.svelte`  
**Storage**: N/A; generated drafts remain transient until the existing explicit save flow  
**Testing**: Vitest/Bun generator-engine tests, existing web component/type checks  
**Target Platform**: SvelteKit web app and framework-neutral generator workspace package  
**Project Type**: Workspace library plus web application integration  
**Performance Goals**: No additional UI wiring or synchronous whole-vault work; context remains bounded by the existing `GeneratorVaultContext` contract  
**Constraints**: Local-first, privacy-preserving, deterministic fallback, constructor/engine boundaries intact, no public SEO surface in this issue  
**Scale/Scope**: One generator id, one rich structured engine module, registry catalogue entry, focused tests, and user-facing help copy if the existing help architecture has a suitable generator entry point

## Constitution Check

- **Library-first**: prompt construction, parsing, option resolution, and local fallback live in `packages/generator-engine`; Svelte remains generic UI.
- **TDD**: add generator-engine tests for option resolution, prompt constraints/context, complete fallback output, malformed AI response parsing, and registry mapping before implementation is considered complete.
- **Simplicity/YAGNI**: use the existing generic campaign form and `mapOutputToDraft`; no custom modal, graph topology, persistence, or public route.
- **Privacy/local-first**: context is the existing bounded vault context; no telemetry, server persistence, or new data store.
- **DI**: use the existing injected AI gateway/service seam; no singleton imported into the engine.
- **Natural language/accessibility**: labels and descriptions use plain language; the generic accessible form is reused.
- **Validation**: run focused package tests, web check/lint, and repository lint as applicable.

**Gate status**: PASS. No constitution violation or unresolved technical clarification is required for this scope.

## Project Structure

```text
specs/2166-plot-twist-complication/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
└── quickstart.md

packages/generator-engine/src/
├── public-plot-twist.ts
├── public-plot-twist.test.ts
├── campaign-generator-types.ts
├── campaign-generator-registry.ts
├── campaign-generator-registry.test.ts
└── index.ts

apps/web/src/lib/config/
└── help-content.ts  # only if the existing generator help structure has a suitable entry
```

**Structure Decision**: Treat the feature as a rich structured campaign
generator. The engine module is named `public-plot-twist.ts` because that is the
existing shared home for rich prompt/local-fallback generators, but public SEO
route exposure is explicitly out of scope. The campaign registry adapts its
output to the existing note draft contract.

## Design

### Engine contract

Define typed options and resolved values for:

- `premise` (required user situation/prompt)
- `twistType` (random, betrayal, revelation, hidden motive, reversal, escalation,
  false assumption, moral dilemma, trap/manipulation, wrong threat, or wrong
  motive)
- `impact` (subtle, significant, campaign-changing)
- `timing` (early, midpoint, climax, aftermath, any)
- `foreshadowing` (surprise me, foreshadowable, already hinted)
- `constraints` (optional avoid/trope text)
- `themeId`/`genre` and optional bounded campaign context

Build an AI prompt with an explicit continuity rule: preserve witnessed events
and supplied facts, identify an assumption that can be overturned, avoid cheap
secret-villain/secret-relative/dream invalidation, and make the result create
new player decisions. Parse a structured JSON response into the shared
`GeneratorOutput` fields, placing the six required headings in `content` and a
GM-facing summary/notes in `lore` where appropriate.

The local fallback should be deterministic when passed an injected RNG, use the
resolved options, and always produce all six headings plus actionable choices.
Unknown values resolve to supported defaults; blank premise is handled as an
explicit validation-safe fallback rather than silently pretending context was
provided.

### Registry integration

- Add `plot-twist` to `GeneratorId` and `SUPPORTED_GENERATOR_IDS` in matching
  order.
- Map it to the `note` entity category.
- Register a `Plot Twist & Complication` definition with an Iconify-compatible
  Lucide icon name such as `lucide:shuffle`.
- Expose textarea/select options through the existing generic form.
- Use `mapOutputToDraft("plot-twist")`; no custom component or route.
- Prefix the prompt with the existing context chain and use the existing
  grounding/name/context helpers where relevant.

### Testing strategy

- Engine unit tests cover deterministic fallback, every option family, theme
  fidelity, required headings, actionable choices, malformed/partial AI JSON,
  and blank/unknown input behavior.
- Registry tests cover ordered id registration, `note` entity mapping, prompt
  context continuity instructions, and draft mapping.
- Existing generic form tests remain the integration guard; add only a focused
  assertion if the new option control exposes a regression.
- Run `bun --filter generator-engine test`, `bun --filter generator-engine
lint`, `bun --filter web check`, `bun --filter web lint`, and `bun run lint`.

## Implementation Phases

1. Add the typed engine options, constants, resolver, prompt builder, parser,
   and deterministic local fallback with tests.
2. Register the generator id, note mapping, options, prompt/fallback seams, and
   update exact-order registry tests.
3. Verify generic campaign-form rendering and add concise help copy only if the
   current help system has a reusable generator section.
4. Run focused and repository validation, inspect the diff, and prepare a PR
   targeting `staging`.

## Complexity Tracking

No constitution violations or additional architectural components are proposed.
