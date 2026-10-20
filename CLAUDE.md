<!-- fallow:agent-install v1 authored sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 -->
<!-- fallow:agent-install v1 claude-import:start -->

@AGENTS.md
<!-- fallow:agent-install v1 claude-import:end -->

## Active Technologies

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `map-engine` (hex maths; + `parseHexLabel`), `random-source-engine` (offline rolling), `session-journal-engine` (+ `formatHexExplored`), `schema` (`MapSchema` + optional `grid`, `hexCrawl`), `vault-engine` `GuestExporter` (strips `hexCrawl`), `@codex/ai-engine` (`aiClientManager`), `generator-engine` `formatCampaignContextBlock`, the exported `extractJsonObject`, `@codex/events` (`JOURNAL:CAPTURE`), Floating UI, `zod`, Tailwind 4 semantic tokens, Iconify classes. New internal package `packages/hex-crawl-engine`. No new third-party dependency. (178-hex-crawl-mode)
- Optional additive fields on the existing map records in `.codex/maps.json`: `grid` and `hexCrawl`. They are synced, backed up, exported and restored with maps. One new device-local display preference, `showTerrainIcons`, joins the existing per-map display settings. One device-local "AI notice dismissed" hint key. No IndexedDB, OPFS layout or migration change. (178-hex-crawl-mode)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `onboarding-journey-engine` (extended), `help-engine` (`QUICK_PROMPT_SETS`, `FEATURE_REGISTRY`, `HelpArea`), `JourneyStore` (read-only outcome), `OnboardingStore` (`chosenGoal`, `goalInvitation`), `helpAssistant` and `cifPopout` (open and ask), `isHelpAssistantAvailable`, `helpStore` (tour), `modalUIStore` (dialogs), Floating UI (already a dependency), Tailwind 4 semantic tokens, Iconify classes. No new third-party dependency. (176-cif-contextual-tips)
- `localStorage` through the injected `StorageLike`: `codex-cif-tips` (preference, opt-in answer, tip history; device-wide). `sessionStorage`: `codex-cif-tips-session` (a tip was shown this session). No IndexedDB, OPFS or vault schema change, so no migration. (176-cif-contextual-tips)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `help-engine` (guidance action schema, catalogue, `validateAction`, quick prompts; extended with shell controls and `extraAvailable`), `HelpActionRunner` and `HelpHighlightService`, `onboarding-orchestrator` (extended), `OnboardingStore`, `helpStore` tour, `GettingStartedChecklist`, `vaultEventBus`, `@codex/events` app bus (`JOURNAL:CAPTURE`), `categories` store, `zod`. New internal package `packages/onboarding-journey-engine`. No new third-party dependency. (175-cif-guided-onboarding)
- `localStorage` through the injected `StorageLike`: `codex-onboarding-journey:<vaultId>` (journey progress), `codex_goal_invitation` and `codex_chosen_goal` (device-wide choice). `sessionStorage`: `codex-onboarding-journey-active` (reload rule). No IndexedDB, OPFS or vault schema change, so no migration. (175-cif-guided-onboarding)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `oracle-engine` (`rollOracleOutcome`, widened), `solo-session-engine` and `session-journal-engine` (both extended), the vault file helpers (`getVaultDir`, `writeOpfsFile`, `readOpfsBlob`), `@codex/events` (`JOURNAL:CAPTURE`), the Oracle `ui` manager's pending prompt, Adventure Mode at `/adventure`, `help-engine`, Tailwind 4 semantic tokens and Iconify classes. No new third-party dependency. (174-solo-oracle-threads)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `solo-session-engine` and `session-journal-engine` (both extended), `random-source-engine` via `randomSourceStore.roll`, the generator workflow (`modalUIStore.openGeneratorWorkflow`, `CampaignGeneratorModal`), `SessionJournalPromoter`, the Oracle `ui` manager and `OracleChat`, `@codex/events` (`JOURNAL:CAPTURE`), `help-engine`, Tailwind 4 semantic tokens and Iconify classes. No new third-party dependency. (173-solo-play-loop)
- Extended `codex-solo-session:<vaultId>` record (new optional `partyIds` and `scenes`, still version 1, and Phase 1 records stay valid). New `codex-solo-table-pins:<vaultId>` in `localStorage`. Three new journal entry types written through the existing capture path. No IndexedDB, OPFS or vault schema change. (173-solo-play-loop)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `dice-engine` (parser, roller), `session-journal-engine` via `sessionJournalStore` (start, sections, end), `map-engine` via `mapStore` (`selectMap`, `soloFog`), `help-engine` (registry, context, catalogue), `@codex/events` (journal capture through `diceHistory`), Tailwind 4 semantic tokens, Iconify Lucide classes. New internal package `packages/solo-session-engine`. No new third-party dependency. (172-solo-session-entry)
- `localStorage` through the injected `StorageLike`: `codex-solo-session:<vaultId>` (session record) and `codex-solo-bar-minimised` (preference). No IndexedDB, OPFS or vault changes, so no migration. (172-solo-session-entry)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Existing `map-engine` (hex maths, renderer), `session-journal-engine` (capture, promote), `@codex/events` (`JOURNAL:CAPTURE`), `help-engine`, Tailwind 4 semantic tokens. No new third-party dependency. (171-solo-map-play)
- Existing per-map settings in `localStorage` (`soloFog`, `visionRange`; unchanged); existing IndexedDB `session_journals` (one optional field, `captureMapMoves`; no migration). Travel tally in memory only. (171-solo-map-play)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Canvas 2D API, `@codex/spatial-engine`, Tailwind 4 semantic tokens, Lucide Iconify utility classes (170-hex-crawling-maps)
- Browser-local OPFS (for standard 2D map mask WebP/PNG persistence) and `localStorage` / vault settings (for per-map grid settings). Zero new databases or external schemas required. (170-hex-crawling-maps)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + `packages/chronology-engine` (internal framework-free package), Tailwind 4 semantic tokens, Floating UI, `@codex/events`. No new third-party dependency. (3717-calendar-eras)
- Browser-local IndexedDB via existing `calendarStore` configuration persistence. No new database store or migration needed. (3717-calendar-eras)

## Recent Changes

- 3717-calendar-eras: Added TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + `packages/chronology-engine` (internal framework-free package), Tailwind 4 semantic tokens, Floating UI, `@codex/events`. No new third-party dependency.
