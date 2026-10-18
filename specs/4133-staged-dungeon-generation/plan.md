# Plan: Staged Dungeon & Delve generation (pilot) — #4133

No spec; the GitHub issue is the requirement source. Parent: #4132.

## Approach

New framework-free module `packages/generator-engine/src/dungeon-staged.ts`, modelled on `point-crawl-staged.ts`.
The existing one-pass + repair route stays as baseline and fallback.

Stages (all inputs come from the already-resolved `ResolvedDungeon`, so the fixed sector plan, stock types and faction drives never change):

1. **Foundation** — title, summary, throughline, history, currentState, signatureFeature, secret, one brief per sector id.
2. **Geography & contents** — sector names/descriptions/stockDetail for the fixed ids, plus hazards, treasures, hooks.
3. **Factions** — factionSituation and two factions, written against the validated sector/content inventory.
4. **Targeted coherence** — assemble, run through `parseDungeonResponseDetailed` (existing validation, rendering), run deterministic checks; only if issues remain, one repair call with the existing `buildDungeonCoherencePrompt`.

Each stage: parse JSON -> validate -> on failure one retry that names the problems and returns only that stage's fields -> otherwise stage is unusable.
Unusable stage (or any rejection) => `null`; caller runs the existing one-pass path (which itself falls back to the local foundation). Abort always throws; nothing partial is returned.

Only validated outputs of earlier stages are passed forward (not chat history).

## Deterministic checks (pure, exported, tested)

- foundation: required fields, sector brief ids equal the plan in order.
- sectors: count/ids/order, stockType matches plan, non-empty/unique stockDetail, banned names.
- factions: exactly 2, fixed drives (forced, not trusted), placeholder/duplicate names, mandatory fields, territory ids exist and non-empty, no invented named place (goal/obstacle/relationship/strength/situation mention a place noun phrase or `sector-N` id not established), no goal to acquire what the faction's own territory already holds (unless explained).

## Wiring

- Web: `GeneratorEngineSpecialized.generateDungeon` — staged by default, `staged: false` forces baseline; adds `signal`.
- In-app: `CampaignGeneratorAIGenerationService.generateDungeonWithAI` — staged first (vault/context chain prefix passed through), then existing path.
- Export from `index.ts`.

## Out of scope / caveats

- The ten-seed live benchmark needs a real model + keys; `DungeonStagedStats` (calls, repaired stages, fallback) is returned so a harness can log it. Not run here.
- Staged calls do not use the interaction/continuity API (#2034) and do not emit prompt metrics.
