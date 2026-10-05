<!-- fallow:agent-install v1 authored sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 -->
<!-- fallow:agent-install v1 claude-import:start -->

@AGENTS.md
<!-- fallow:agent-install v1 claude-import:end -->

## Active Technologies

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + Canvas 2D API, `@codex/spatial-engine`, Tailwind 4 semantic tokens, Lucide Iconify utility classes (170-hex-crawling-maps)
- Browser-local OPFS (for standard 2D map mask WebP/PNG persistence) and `localStorage` / vault settings (for per-map grid settings). Zero new databases or external schemas required. (170-hex-crawling-maps)

- TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + `packages/chronology-engine` (internal framework-free package), Tailwind 4 semantic tokens, Floating UI, `@codex/events`. No new third-party dependency. (3717-calendar-eras)
- Browser-local IndexedDB via existing `calendarStore` configuration persistence. No new database store or migration needed. (3717-calendar-eras)

## Recent Changes

- 3717-calendar-eras: Added TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14 + `packages/chronology-engine` (internal framework-free package), Tailwind 4 semantic tokens, Floating UI, `@codex/events`. No new third-party dependency.
