# Plan: Staged Adventure Idea generation — #4135

No spec; the GitHub issue is the requirement source. Parent: #4132. Builds on the shared staged helpers from #4134 (`staged-runtime.ts`: `askChecked`, `withRetryFeedback`).

## Approach

New framework-free module `packages/generator-engine/src/adventure-staged.ts`, modelled on `dungeon-staged.ts`.
The existing one-pass + single-repair route stays as baseline and fallback.

Stages (all built from the one-pass prompt's `briefing`, so the form fields, seeds, themes, campaign context and given-situation rules are unchanged):

1. **Situation**: title, summary, throughline, initial situation, primary objective, and every objective asset with its place and holder.
2. **Places and people**: the drawn number of key locations (2-3) and NPCs or factions (2-3). Every asset place and holder needs its own card.
3. **Consequences**: threats, discoveries, complications, rewards, outcomes and hooks. Each entry lists the established names it `involves`, and each discovery says what it `opens`.

Each stage uses `askChecked`: parse JSON, run a pure check (hard and soft problems), and on failure run one retry that names the problems and the previous draft. The latest draft with no hard problems is kept.
Later stages return only their own fields, so they cannot change the objective, assets or cast. The three stages are assembled into the one-pass response shape and passed through `parseAdventureResponseDetailed`. Rendering and the Adventure Canvas converter therefore see the same document as before.

An unusable stage, or a rejected assembly, resolves `null`, and the caller runs the existing one-pass route, which has its own local fallback. An abort always throws, and nothing partial is returned.

## Deterministic checks (pure, exported, tested)

- **Situation**:
  - required fields
  - assets need a name and a place, kept to at most 3 places and 3 holders
  - banned or reused title
  - given-situation fidelity: names kept and deadline adopted, shared with the one-pass parser through `seedFidelityProblems`
- **Places and people**:
  - 2-3 of each; a count off the drawn target but in range is accepted
  - required fields, including the dilemma
  - names distinct, and none banned or reused
  - every asset place is a location card and every asset holder is in the cast
- **Consequences**:
  - each list within its range, and each entry has a title and text
  - an unknown `involves` name is hard for threats and outcomes and soft elsewhere; the party is always allowed
  - each discovery needs `opens`
  - of the one-pass checks on the assembled document, only clock integration triggers a retry; the rest are reported in `remainingIssues`

## Wiring

- **Web:** `GeneratorEngineSpecialized.generateAdventure` runs staged by default; `staged: false` forces the baseline. It adds `onProgress` and `signal`. Both adventure slugs show the step list and get a cancellable run.
- **In-app:** `CampaignGeneratorAIGenerationService.generateAdventureWithAI` runs staged first, carrying the vault and context chain prefix, then the existing generic route.
  - `adventure` leaves the generic streaming route so the staged route runs.
  - A continuity thread or `staged: false` stays on the generic route.
  - Cancellation is rethrown rather than starting the generic call.
- **Dev builds:** both entry points log `AdventureStagedStats` (counts only, no generated text).

## A/B comparison

`scripts/adventure-ab.ts` (`bun run eval:adventure-ab`) runs ten controlled cases spanning genres and pressures through both routes with the same resolved prompt. It reports:

- calls and latency
- fallbacks
- remaining one-pass problems
- grounding of threats and outcomes
- whether a given situation's names survived
- title variety

It needs a real model behind the local proxy. Coherence, specificity and usefulness are read from `--json`, not scored. Running it is optional and tracked in #4214.

## Out of scope / caveats

- Staged calls do not use the interaction or continuity API (#2034) and do not emit prompt metrics.
- `packages/ai-engine/src/adventure-turn-generation.service.ts` and `packages/adventure-engine` are Adventure Mode (play), not the Adventure Idea generator, and are unchanged.
