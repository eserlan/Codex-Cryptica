## 2026-06-19T13:24:54Z

You are the Hub Routing Implementer. Your working directory is /home/espen/proj/Codex-Cryptica-v2/.agents/worker_m3_hub.
Your task is to implement Milestone 3: Hub Routing & Integration.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:

1. Ensure you are on the `feature/western-theme-hub` branch.
2. Modify `apps/web/src/params/theme_hub.ts`:
   - Add "western" to the `VALID_HUB_THEMES` set.
3. Modify `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.ts`:
   - Add "western" to the `ThemeSlug` type.
   - Add `{ theme: "western" }` to the `entries` function array.
4. Modify `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.svelte`:
   - Add the `western` configuration to `themeConfig`:
     ```typescript
     western: {
       label: "Western",
       localStorageId: "western",
       eyebrow: "Six-Guns, Trails & Dust",
       intro:
         "Dusty borderlands, rowdy saloons, and dangerous outlaws. Generate frontier settlements, bounty quests, gunslinger NPCs, and rail-baron factions for your Western campaign — all pre-tuned to the genre.",
       metaTitle:
         "Western RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
       metaDescription:
         "Free Western RPG generators for tabletop GMs. Create gunslinger NPCs, outlaws, saloons, settlements, quest hooks, and names for your frontier campaign. No login required.",
       cards: [
         ...sharedCards(
           "Settlement Generator",
           "Build frontier outposts and ghost towns with sheriff departments, outlaw camps, and gold claims.",
         ),
         socialHubCard,
         nationCard,
         surpriseMeCard,
       ],
     },
     ```
5. Modify `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/generator-theme.ts`:
   - Add `western: "Western"` to the `HUB_THEME_TO_GENERATOR_GENRE` map.
6. Modify `apps/web/src/routes/(marketing)/generators/+page.svelte`:
   - Add the new Western Hub card to the `themeHubs` array (make sure it goes at the end of the array):
     ```javascript
     {
       href: "/generators/western",
       label: "Western Hub",
       summary:
         "Cowboys and outlaws, frontier towns, dusty saloons, and wild quest hooks.",
       icon: "icon-[lucide--cactus]",
     }
     ```
7. Modify `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/theme-hubs.test.ts`:
   - Add "western" to the list of loaded themes to test.
   - Add `{ theme: "western" }` to the expected array in the `entries` test.
8. Modify `apps/web/tests/generator-theme-hubs.spec.ts`:
   - Add `{ slug: "western", h1: "Western RPG Generators", localStorageId: "western" }` to the E2E `themes` array.
9. Run `bun run test` to verify that all unit tests pass cleanly.
10. Run `bun run lint` to verify that linting check completes with 0 errors.
11. Create `progress.md` in your working directory and update it with `Last visited: [timestamp]` as your liveness heartbeat.
12. Write `handoff.md` and send a message back to the parent (conversation ID: 0368597f-1cc9-4ccc-8592-aa35182f9ae4) when completed.
