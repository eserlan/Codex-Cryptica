## 2026-06-19T13:14:56Z

You are the Generator Expansions Implementer. Your working directory is /home/espen/proj/Codex-Cryptica-v2/.agents/worker_m1_generator.
Your task is to implement Milestone 1: Generator Engine Expansions.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:

1. Create a new git branch for this feature named `feature/western-theme-hub` starting from the current branch.
2. Modify `packages/generator-engine/src/public-npc.ts`:
   - Add "Western / Frontier" to `npcThemeConfig.ancestries` with Western-specific ancestries/races.
   - Add "Western / Frontier" to `npcThemeConfig.roles` with roles like Gunslinger, Sheriff, Bounty Hunter, etc.
   - Add "Western / Frontier" to `npcThemeConfig.moralities` with 6 unique thematic moral alignments.
   - Add "Western / Frontier" to `NPC_THEME_VOICE` with description.
3. Modify `packages/generator-engine/src/public-faction.ts`:
   - Add `western: "Western / Frontier"` and `western_dark: "Western / Frontier"` to `themeIdToLabel`.
   - Add "Western / Frontier" to `factionConfig.themes`.
   - Add "Western / Frontier" description to `FACTION_THEME_VOICE` map.
4. Modify `packages/generator-engine/src/public-quest.ts`:
   - Add "Western / Frontier": "Western" to `themeToQuestGenre`.
   - Add "Western / Frontier" to `questConfig.tonesByTheme`, `questConfig.scopesByTheme`, `questConfig.locationTypesByTheme`, and `questConfig.rewardsByTheme`.
5. Run unit tests using `bun run test` to verify that they pass. Add unit tests in `packages/generator-engine/src/public-npc.test.ts`, `packages/generator-engine/src/public-faction.test.ts`, and `packages/generator-engine/src/public-quest.test.ts` to assert that the Western theme resolves correctly.
6. Create `progress.md` in your working directory `/home/espen/proj/Codex-Cryptica-v2/.agents/worker_m1_generator` and update it with `Last visited: [timestamp]` as your liveness heartbeat.
7. Write `handoff.md` in your working directory and send a message back to the parent (conversation ID: 0368597f-1cc9-4ccc-8592-aa35182f9ae4) when completed.
