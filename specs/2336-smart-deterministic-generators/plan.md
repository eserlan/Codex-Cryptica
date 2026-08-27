# Implementation Plan: Smart Deterministic Generators

**Epic**: #2336 | **Sub-issues**: #2337 #2338 #2339 #2340 #2341 #2342
**Branch**: `2336-smart-deterministic-generators` | **Date**: 2026-08-27

## Summary

Turn the existing local (non-AI) generator tables into a declarative, weighted,
dependency-aware model, add an offline semantic layer that maps a free-text
description onto ordinary generator settings, and surface the result as
inspectable, removable chips. The Settlement generator is the reference
implementation. Nothing in this epic generates prose with an LLM: the semantic
layer only configures the deterministic generator.

## What "non-AI generator" means in this codebase

Findings from the current code, since the issue text is deliberately
outcome-focused:

- The non-AI generators are the `generate<X>Local()` family in
  `packages/generator-engine/src/public-*.ts`. There are **33 of them across 28
  files**, every one built on the same two-step shape.
- Step 1 is `resolve<X>(options, rng)`: it fills each unset option by calling
  `pickFrom(forGenre(config.<axis>ByGenre, genre), rng)`. Flat uniform random,
  one axis at a time, no interaction between axes.
- Step 2 is either a prompt (`build<X>Prompt`) or local prose templates. Both
  consume the same resolved values, so **anything we improve in step 1 improves
  the AI path and the local path at once**.
- `apps/web/src/lib/services/seo/generator-engine.ts` runs
  `runWithAIFallback(useAI, aiAttempt, local)`, so the local tables are also the
  offline/quota fallback for every public generator, not just an "AI off" mode.
- The option pools live in `public-*-constants.ts`, keyed by genre. Settlement
  has 10 axes across 13 genres, with pools of roughly 6 to 8 entries each.
- The public generator forms are 31 `*FormFields.svelte` components in
  `apps/web/src/lib/components/seo/`. They already carry a free-text
  `campaignContext` field, which is currently passed to the prompt only.

Two consequences shape the plan. The framework belongs in the resolve step, not
in a new generator runtime. And the free-text input already exists in the UI, so
#2338/#2339 is about interpreting a field we ship today rather than adding one.

## Technical context

**Language**: TypeScript 6.0.3 (pinned), Svelte 5 runes, Tailwind 4 tokens
**Home**: `packages/generator-engine/src/smart/` (new module, same package)
**UI**: `apps/web/src/lib/components/seo/`
**Testing**: Vitest, seeded RNG (`Rng = () => number`) for determinism
**Constraints**: fully client-side, no network, no new heavy dependency
**Non-goals**: no LLM in the semantic path, no change to generator output
schemas (`PublicGeneratorOutput`), no new public routes

## Constitution check

- **I Library-first**: all logic lands in `packages/generator-engine`; the web
  app only renders chips and passes a config object. A separate package is not
  justified (YAGNI): the model is meaningless without the generator tables it
  annotates.
- **II TDD / X Coverage**: the framework and semantic layer are pure functions
  with a seeded RNG, so both are fully unit-testable. Target 70% for the new
  module, plus a regression test proving an untouched generator still resolves
  exactly as before.
- **III Simplicity**: the rule model coerces plain `string[]` pools, so no
  generator has to migrate before it benefits. Text analysis goes behind a DI
  seam (Principle VIII) with a small built-in tokenizer as the default;
  `compromise` (already a dependency of `ai-engine` and `apps/web`, dynamically
  imported in `resolve-pronouns.ts`) is the drop-in upgrade if match quality
  needs it, rather than a new NLP dependency now.
- **V Privacy**: free text is analysed in the browser and never leaves it. When
  AI is on, the text already goes to the model today via `campaignContext`, so
  this adds no new egress.
- **IX Natural language**: chips read as plain settings ("Coastal", "Prosperous"),
  never as jargon.
- **XII Labels over tags**: the internal semantic metadata on an option is
  called `traits` in code and is never shown to users as "tags". "Labels" stays
  reserved for entity labels, which `PublicGeneratorOutput.labels` already uses.

**Gate status**: PASS, with the naming decision above recorded as a deliberate
call rather than an oversight.

## Architecture

```
free text ──► semantic match ──► intent signals ─┐
smart preset ────────────────────────────────────┼──► SmartGeneratorConfig
manual form selection ───────────────────────────┘    (per axis: locked value
                                                       + provenance, or bias)
                                                            │
                                                            ▼
                                              rules resolver (#2337)
                                    weights, requires/excludes, conditional pools
                                                            │
                                                            ▼
                                              resolved values (unchanged shape)
                                                     │            │
                                              local prose     AI prompt
```

Every input path writes into the same `SmartGeneratorConfig`. Presets are not a
separate code path, and neither is free text. That is what makes the chips
honest: what the user sees is literally what the resolver consumes.

## Data model (#2337)

New files under `packages/generator-engine/src/smart/`:

| File            | Responsibility                                                                           |
| --------------- | ---------------------------------------------------------------------------------------- |
| `types.ts`      | `SmartOption`, `SmartAxis`, `SmartGeneratorSchema`, `SmartGeneratorConfig`, `Provenance` |
| `resolve.ts`    | weighted, constraint-aware resolution against a schema                                   |
| `predicates.ts` | declarative `requires` / `excludes` evaluation                                           |
| `semantic.ts`   | free text to intent signals (#2338)                                                      |
| `lexicon.ts`    | shared trait vocabulary plus per-generator extensions (#2338)                            |
| `presets.ts`    | preset model and application (#2340)                                                     |

Sketch (final shape settles in the PR):

```ts
export interface SmartOption<T extends string = string> {
  value: T;
  weight?: number; // default 1
  traits?: readonly string[]; // "coastal", "wealthy", "authoritarian"
  requires?: SmartPredicate; // option unavailable unless this holds
  excludes?: SmartPredicate; // option unavailable if this holds
  boosts?: Record<string, number>; // trait -> multiplier when that trait is resolved
}

export type OptionPool<T> = readonly (T | SmartOption<T>)[]; // bare strings coerce

export interface SmartAxis<T extends string = string> {
  id: string; // "environment"
  label: string; // "Environment"
  pool(ctx: ResolveContext): OptionPool<T>; // genre-aware, may read resolved axes
}

export interface SmartGeneratorSchema {
  id: string; // "settlement"
  axes: readonly SmartAxis[]; // declaration order IS resolution order
}
```

Predicates stay declarative (`{ axis, anyOf }`, `{ trait }`, `{ not }`,
`{ all }`, `{ any }`) rather than arbitrary callbacks, so rules can be read, diffed and
linted without executing them. That is the "not buried in imperative code"
acceptance criterion in #2337.

Dependencies are expressed against **traits**, not option names. With 13 genres
per generator, "requires a trade-based function" survives content growth while
"requires `Merchant harbour`" does not.

### Resolution algorithm

For each axis in declaration order:

1. If the config locks a value (manual, preset, inferred, or a custom string
   from `SelectWithCustomOption`), take it verbatim and continue.
2. Build the candidate pool, dropping options whose `requires` fails or whose
   `excludes` holds against the axes already resolved.
3. Score each candidate: `weight` x trait affinity from intent signals x
   `boosts` from already-resolved traits.
4. Weighted pick using the injected `Rng`.
5. If the pool empties because constraints over-specified, relax in a fixed
   documented order (`excludes`, then `requires`, with a zeroing bias dropped
   separately), record the relaxation in the result, and never throw.

Backwards compatibility is a test, not a promise: a schema whose pools are bare
strings with no traits and no predicates must produce, for a given seed, exactly
the sequence `pickFrom` produces today.

The resolver returns provenance per axis (`manual | preset | inferred | random`)
which is what the chips UI renders.

## Semantic free-text matching (#2338)

`analyseIntent(text, lexicon, analyzer?) -> IntentSignal[]`, where
`IntentSignal = { trait, score, phrase, negated }`.

- **Normalise**: lowercase, strip punctuation, expand contractions. Behind a
  `TextAnalyzer` DI seam; default implementation is a small deterministic
  tokenizer with a hand-written suffix list, no dependency.
- **Match**: scan 1 to 3 word n-grams against the lexicon. Exact phrase scores
  1.0, morphological variant 0.8, so "merchants", "merchant" and "mercantile"
  all reach the `trade` trait.
- **Negate**: a negation window ("not", "no", "without", "never", "hardly")
  produces a negative score, which actively suppresses matching options rather
  than merely failing to boost them. "not a port town" must not yield a port.
- **Contradict**: conflicting signals on the same dimension keep the stronger
  one and record both, so the UI can say what was dropped.
- **Lexicon**: a shared base covering dimensions common to most generators
  (wealth, scale, danger, climate, governance, tone, age, isolation) plus a
  per-generator extension map. Reuse across generators is the point; settlement
  contributes maybe a dozen entries of its own.

Mapping signals onto the config, in `applyIntent(schema, signals, config)`:

- For each unlocked axis, score its options by trait overlap with the signals.
- If the best score clears `HARD_THRESHOLD` and beats the runner-up by
  `MARGIN`, lock it with provenance `inferred`.
- Otherwise, if it clears `SOFT_THRESHOLD`, apply a weight bias only, so the
  generator still varies between rolls.
- Thresholds live in one exported constants block and are covered by tests
  against a fixture corpus of example descriptions.

Worked example, "A prosperous but creepy coastal town controlled by merchants":
`prosperous` to trait `wealthy`, `creepy` to `unsettling`, `coastal` to
`coastal`, `town` to scale `town`, `controlled by merchants` to `trade` plus
`oligarchic`. Environment, tone, authority and scale lock; primary function is
biased toward trade options but still rolls.

## Smart presets (#2340)

```ts
interface SmartPreset {
  id: string;
  label: string; // "Frontier Colony"
  description: string; // one line, plain language
  genres?: readonly string[]; // omit for genre-neutral
  set?: Record<string, string>; // axis -> value
  bias?: Record<string, number>; // trait -> multiplier
}
```

Applying a preset writes into the same `SmartGeneratorConfig` with provenance
`preset`. Every value stays editable, and a preset that only biases still leaves
the generator rolling. Free text applied after a preset wins on conflicting
axes; both are visible in the chip row.

Settlement ships with roughly eight: Frontier Colony, Merchant Port, Decadent
Metropolis, Haunted Settlement, Company Town, Refugee Camp, Pilgrimage Site,
Dying Outpost. Genre-scoped where they only make sense in one.

## Inferred-option chips and override UX (#2339)

Two new shared components in `apps/web/src/lib/components/seo/`:

- `GeneratorIntentField.svelte`: relabels the existing `campaignContext`
  textarea as the description input, with example placeholder text. Because the
  field already ships, its mobile layout is proven.
- `InferredChips.svelte`: a wrapping chip row above the selects, one chip per
  non-random axis, reading `Environment: Coastal harbour` with a remove button.

Rules:

- Inferred and preset chips are visually distinguished from manual ones by an
  icon plus text, never colour alone (accessibility).
- Removing a chip returns that axis to random and re-runs nothing else.
- Changing a select manually re-stamps that axis as manual and drops its chip
  marker.
- Analysis runs on blur or debounce, never on every keystroke, and never blocks
  the Generate button.
- With an empty description and no preset, the form behaves exactly as it does
  today. That is a test, not a claim.
- The chips also apply when AI is on, because the resolved values feed the
  prompt too. One behaviour, one explanation for the user.

Copy avoids implying generated content: "We read your description as these
settings. Change anything you like."

Per Principle VII, a help-content entry in
`apps/web/src/lib/config/help-content.ts` explains the description field.

## Settlement reference implementation (#2341)

Migrate `public-settlement.ts` / `public-settlement-constants.ts` to a schema
with this resolution order, chosen so that later axes can depend on earlier
ones:

`environment -> primaryFunction -> authorityType -> tone -> mainTension -> size`

Then, still inside the resolver, the derived picks (`notableLocations`,
`factions`, name affixes) become conditional pools rather than free draws, which
is where most of the incoherence is visible today (a mountain-pass settlement
currently draws harbour locations).

Content work, which is the bulk of the effort:

- Add `traits` to every option across all 13 genres.
- Expand thin pools, roughly doubling them where a genre has six entries.
- Add requires/excludes for the obvious contradictions (landlocked plus port,
  hidden cove plus metropolis scale).
- Add the preset set.

Output shape and `PublicGeneratorOutput` stay identical, so the SEO pages, the
handoff flow and the import path are untouched.

## Audit and prioritisation (#2342)

Inventory is already done and is included here so the follow-up issue starts
from data. 28 generator files, 33 `generate<X>Local` functions. Ranking by
`pickFrom` call count as a proxy for axis richness, cross-checked against how
much the axes actually interact:

**Tier 1, migrate right after settlement**

| Generator                             | pickFrom | Why                                                              |
| ------------------------------------- | -------- | ---------------------------------------------------------------- |
| `public-faction.ts` (3 generators)    | 30       | Goals, methods and resources contradict each other constantly    |
| `public-npc.ts`                       | 21       | Role, background and manner should agree; highest traffic        |
| `public-dungeon.ts`                   | 20       | Theme, inhabitants and hazards are the clearest dependency chain |
| `public-social-hub.ts` (2 generators) | 20       | Shares settlement's environment vocabulary, cheap reuse          |

**Tier 2, clear value, larger content cost**

`public-world.ts` (15), `public-quest.ts` (14), `public-ship.ts` (14),
`public-star-system.ts` (13), `public-artifact.ts` (13),
`public-minor-magic-item.ts` (13), `public-kingdom.ts` and `public-nation.ts`
(12 each), `public-villain.ts` (11), `public-adventure.ts` (10).

**Tier 3, low return**

`public-names.ts` (3), `public-plot-twist.ts` (3), `public-puzzle.ts` (2),
`public-random-table.ts` (0), `public-language.ts` (4, already has its own
linguistic model). Few axes, little cross-field coherence to win. Free text
adds nothing a select does not already do.

Deliverable for #2342: this table promoted to a short doc plus one follow-up
issue per Tier 1 generator and one per Tier 2 family.

## PR sequence

| PR  | Issue | Contents                                                                                                     | Gate                                                       |
| --- | ----- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1   | #2337 | `smart/` types, predicates, resolver, tests. No generator migrated. **Merged as #2521.**                     | Seeded-RNG parity test vs `pickFrom`                       |
| 2a  | #2341 | Settlement schema, traits across 13 genres, rules and affinities, `resolveSettlement` on `resolveSmart`      | Existing settlement tests green, output shape unchanged    |
| 2b  | #2341 | Conditional derived pools: points of interest and factions filtered by the resolved environment and function | A mountain-pass settlement stops drawing harbour locations |
| 3   | #2340 | Preset model, settlement presets, preset picker in the form                                                  | Preset values remain editable                              |
| 4   | #2338 | Lexicon, `analyseIntent`, `applyIntent`, fixture corpus tests                                                | Pure module, not yet wired to UI                           |
| 5   | #2339 | `GeneratorIntentField`, `InferredChips`, settlement wiring, help content                                     | Empty-description path byte-identical to today             |
| 6   | #2342 | Audit doc, follow-up issues                                                                                  | -                                                          |

PRs 1 to 3 are shippable without any semantic work, which keeps the epic
useful even if #2338 stalls.

## Test plan

- Parity: for a fixed seed, a trait-free schema resolves identically to the
  current `pickFrom` sequence.
- Constraints: an over-constrained config relaxes in the documented order and
  never throws.
- Determinism: same seed plus same config gives the same result, every time.
- Semantics: fixture corpus of about 20 descriptions with expected trait sets,
  including negation and contradiction cases.
- No-input: empty description, no preset, all selects untouched still produces
  the current distribution.
- Component: chip removal reverts the axis, manual edit clears the inferred
  marker, mobile viewport renders the chip row without overflow.

## Risks

- **Content volume**: annotating 13 genres x 10 axes for settlement alone is the
  real cost of #2341, and it repeats per generator. Mitigation: the shared base
  lexicon does most of the trait vocabulary once, and Tier 3 generators are
  explicitly never migrated.
- **Over-constraint**: rich dependencies can empty a pool. Mitigation: the
  documented relaxation order, plus a test that every genre can resolve from an
  empty config 1000 times without relaxing.
- **False confidence in matching**: a keyword lexicon will mis-read some
  phrasing. Mitigation: this is exactly why inferred settings are chips the user
  can delete, and why weak matches only bias instead of locking.
- **Scope creep into AI**: the temptation to "just call the model" for parsing.
  The DI seam keeps that a deliberate, separate decision rather than a drift.

## Decisions needed before PR 1

1. **Preselect or bias by default.** Should a confident match lock an axis, or
   only weight it? Plan assumes lock above a high threshold, bias below.
2. **Genre coverage for PR 2.** All 13 settlement genres, or Fantasy plus the
   three highest-traffic ones first with the rest coerced from bare strings?
3. **Intent field when AI is on.** Plan assumes yes, one behaviour. The
   alternative is showing chips only in the local path.
