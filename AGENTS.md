# Codex-Cryptica Agent Instructions

This file is the Codex-facing instruction layer for this repository.

## Source Of Truth

- The Speckit command definitions in [`.gemini/commands`](./.gemini/commands) are the canonical command source for this repo.
- [`.codex/commands`](./.codex/commands) is a shared mirror for Codex CLI compatibility.
- Keep command behavior synchronized in the canonical Speckit files first, then mirror any Codex-specific guidance here.
- If these instructions ever conflict with [`.specify/memory/constitution.md`](./.specify/memory/constitution.md), the constitution wins.
- **Verify against the Constitution**: Always refer to the project constitution at [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) to guide design/architecture decisions, and verify all implementation plans against it. To manage, update, or synchronize the constitution, refer to the [`.agent/workflows/sdd-constitution.md`](./.agent/workflows/sdd-constitution.md) workflow.

## How Codex Should Work Here

- Treat `speckit` commands as workflow steps, not as built-in Codex features.
- For spec-driven work, use the existing `.specify` scripts and artifacts:
  - `.specify/scripts/bash/check-prerequisites.sh`
  - `.specify/scripts/bash/create-new-feature.sh`
  - `.specify/scripts/bash/setup-plan.sh`
  - `.specify/scripts/bash/update-agent-context.sh`
- Read the relevant files before editing:
  - `spec.md`
  - `plan.md`
  - `tasks.md`
  - `checklists/requirements.md`
  - [`.specify/memory/constitution.md`](./.specify/memory/constitution.md)
  - [`.agent/workflows/sdd-constitution.md`](./.agent/workflows/sdd-constitution.md)

## Repository Rules

- **Style Guide Adherence**: ALWAYS read and adhere to [docs/STYLE_GUIDE.md](file:///home/espen/proj/remotecodexarcana/docs/STYLE_GUIDE.md). All UI components MUST use Svelte 5 Runes, Tailwind 4 semantic tokens (e.g., `text-theme-primary`), and follow the documented DI (Dependency Injection) and transition/animation patterns.
- **Icon Usage**: NEVER use `lucide-svelte` components. ALWAYS use the Iconify utility pattern: `class="icon-[lucide--name] h-4 w-4"`.
- Follow the constitution's library-first, TDD, privacy, DI, and documentation principles.
- Do not commit implementation changes without tests for the affected behavior.
- When adding or updating tests for changed behavior, cover both the expected success path and at least one meaningful negative, cancellation, or failure path.
- Use constructor-based dependency injection for services and stores.
- **Oracle Store Architecture**: The monolithic `OracleStore` is decomposed into 6 reactive managers (`ui`, `chat`, `context`, `actions`, `settingsManager`, `reconciliation`). When extending Oracle functionality, identify the correct manager in `apps/web/src/lib/stores/oracle/` instead of bloating the facade.
- Prefer local-first and client-side solutions when the architecture allows it.
- Keep user-facing language clear and plain.
- **User-Facing Changelogs**: Keep all entries in the changelog (`apps/web/src/lib/content/changelog/releases.json`) strictly focused on high-impact, user-facing features. Do not list under-the-hood technical refactors, code optimization, or architectural decomposition updates in the changelog highlights.
- Create a new branch for code changes, fixes, or refactors.
- Prefer the GitHub app/MCP tools for structured GitHub work such as PR metadata, comments, labels, reviews, file patches, and PR edits.
- Create regular ready-for-review pull requests by default; never create draft PRs unless the user explicitly asks for a draft.
- Prefer `gh` for CI and Actions debugging, raw check/log inspection, or other terminal-native GitHub workflows.
- Use `gh` as the fallback when the connector does not expose the needed GitHub action cleanly.

## Maintenance Rule

- If Speckit command behavior changes, update the command files in [`.gemini/commands`](./.gemini/commands) first, then refresh the Codex mirror at [`.codex/commands`](./.codex/commands).
- Then update this file only for Codex-specific behavior or repository-wide guidance.
- Avoid duplicating long command scripts here; link back to the canonical files instead.

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the [current plan](./specs/132-calendar-agenda-view/plan.md).

<!-- SPECKIT END -->

## Active Technologies
- TypeScript 6.0.3 + Svelte 5 runes + SvelteKit, Tailwind 4 semantic tokens, existing layout UI (133-entity-explorer-layout)
- Existing browser-local sidebar-open and active-tool preferences; no new (133-entity-explorer-layout)

- TypeScript 6.0.3 + Svelte 5 runes + SvelteKit, Tailwind 4 semantic tokens, existing `packages/chronology-engine`, existing `schema` types, existing vault/world/timeline stores (132-calendar-agenda-view)
- Existing vault entity data plus browser-local IndexedDB-backed calendar settings via `apps/web/src/lib/stores/calendar.svelte.ts`; no new persistence format (132-calendar-agenda-view)

- TypeScript 6.0.3 + Svelte 5 runes + SvelteKit, Tailwind 4 semantic tokens, new `packages/generator-engine` workspace package over existing public generator logic, `@google/generative-ai` via existing `aiClientManager`, existing vault/theme/modal/help stores (131-in-app-rpg-generators)
- OPFS and IndexedDB through existing vault stores; generated drafts remain transient until explicit save (131-in-app-rpg-generators)

- TypeScript 6.0.3 + Svelte 5 (Runes), SvelteKit, `@google/generative-ai` (Gemini SDK via `aiClientManager`), `@codex/vault-engine` (129-seo-landing-pages)
- `localStorage` (transient transfer), OPFS & IndexedDB (via vault stores) (129-seo-landing-pages)

- TypeScript 6.0.3 + Svelte 5 Runes, SvelteKit, `@google/generative-ai` (127-context-aware-entity-generator)
- OPFS (Vault Files), IndexedDB (via existing stores/vault.svelte.ts) (127-context-aware-entity-generator)

- TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace + `chronology-engine`, `schema`, Svelte 5, Floating UI, IndexedDB `idb`, existing Tailwind 4 theme tokens (116-scroll-wheel-date-picker)
- Browser-local vault settings in IndexedDB via `apps/web/src/lib/stores/calendar.svelte.ts`; entity temporal metadata in local vault data (116-scroll-wheel-date-picker)
- TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace + Svelte 5, Cytoscape, `graph-engine`, `schema`, existing vault/entity stores, existing Tailwind 4 theme tokens (118-graph-important-label)
- Existing local vault entity `labels` array persisted through IndexedDB-backed vault stores; no new storage shape (118-graph-important-label)

## Recent Changes

- 116-scroll-wheel-date-picker: Added TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace + `chronology-engine`, `schema`, Svelte 5, Floating UI, IndexedDB `idb`, existing Tailwind 4 theme tokens
- 118-graph-important-label: Added TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace + Svelte 5, Cytoscape, `graph-engine`, `schema`, existing vault/entity stores, existing Tailwind 4 theme tokens
