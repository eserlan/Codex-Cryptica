# Tasks — #4133

- [x] T1 Export `formatDungeonSeeds` (and needed helpers) from `public-dungeon.ts`
- [x] T2 `dungeon-staged.ts`: stage prompts (foundation, sectors, factions)
- [x] T3 `dungeon-staged.ts`: validators (foundation, sectors, factions, coherence)
- [x] T4 `dungeon-staged.ts`: runner `generateDungeonStaged` (retry, abort, null on unusable, stage 4)
- [x] T5 Tests `dungeon-staged.test.ts`: happy path + preserved ids/drives/output shape; faction invents room; goal acquires owned object; missing sectors; invalid ids; failed stage -> null; abort; stage-1/2 outputs reach stage 3 prompt
- [x] T6 Export from `index.ts`
- [x] T7 Wire web `generateDungeon` (+ test in generator-engine-modules.test.ts)
- [x] T8 Wire in-app `generateDungeonWithAI` (+ test)
- [x] T9 Validate: lint:changed, test:changed, svelte-check in apps/web, fallow audit
- [ ] T10 Ten-seed live benchmark vs the one-pass route (needs a real model; `DungeonStagedStats` is returned for logging). Not run.
