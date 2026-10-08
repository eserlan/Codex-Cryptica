<!-- fallow:agent-install v1 authored sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 -->
<!-- fallow:agent-install v1 claude-import:start -->

@AGENTS.md
<!-- fallow:agent-install v1 claude-import:end -->

## Active Technologies

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
