# Phase 0 Research: Bestiary & Creature Catalogue Packs

All NEEDS CLARIFICATION from the spec's open questions were resolved during design review (#1545) and
are recorded here as decisions.

## R1 — Pack sourcing: static vs AI vs hybrid

- **Decision**: Static-first hybrid. Packs ship as curated static content; an optional AI theme-
  adaptation pass is a later phase (P3), not a dependency of the base flow.
- **Rationale**: Pure AI-on-demand is slow, costs tokens, and breaks Lite/no-AI mode (spec 054).
  Pure static cannot satisfy "adapt to vault theme". Static base + optional AI pass satisfies both and
  keeps the MVP offline-capable (Constitution V).
- **Alternatives considered**: (a) Pure AI generation — rejected: cost/latency, no offline. (b) Pure
  static, never adaptive — rejected: fails the theme-adaptation acceptance criterion long-term.

## R2 — Where the feature lives

- **Decision**: Reuse the existing importer rail. Content + mapper go in a new framework-free package
  `@codex/content-packs`; the entry point is a "Creature Packs" section in the existing
  `ImportSettings` importer that injects a pack into the `review` step.
- **Rationale**: This is a bulk import/populate flow, not a one-at-a-time generator. The importer
  already provides preview, per-item selection, and vault write (`ReviewList` → save path), directly
  satisfying "preview before import" and "avoid flooding". Library-First (Constitution I) puts content
  in a package; the web app stays thin.
- **Alternatives considered**: (a) Dedicated catalogue/library UI — deferred; more surface than the
  MVP needs (YAGNI). (b) Extend `generator-engine` — rejected: generators are procedural single-shot,
  packs are curated catalogues; different concern, cleaner as its own package.

## R3 — Two import rails; creature support

- **Finding**: There are two import systems. The **document-analysis rail** (`DiscoveredEntity` +
  `OracleAnalyzer` + `ReviewList`) does **not** support `creature` — its `suggestedType` union is
  `Character | Location | Item | Lore | Unknown`, the Oracle prompt only extracts
  `[Character, Location, Item, Lore, Faction]`, and `mapType()` collapses anything unrecognised to
  `note`. The **draft rail** (`import-handler.ts` `ImportDraft`) already lists `creature`.
- **Decision (Option A)**: Widen the document-analysis rail to express creatures, because it owns the
  in-app preview UI (`ReviewList`) we want to reuse:
  - `packages/importer/src/types.ts`: add `"Creature"` to `DiscoveredEntity.suggestedType`.
  - `ImportSettings.svelte` `mapType()`: `if (t === "creature") return "creature";`
  - **Do not** change the Oracle prompt — it only affects AI document analysis, not our static packs
    (Karpathy: surgical, Constitution XI).
- **Alternatives considered**: Route packs through the `ImportDraft` rail (already speaks creature) —
  rejected: its preview UX is the marketing pages, not the in-app `ReviewList` we chose in R2.

## R4 — Stat blocks

- **Decision**: System-neutral by default, with an optional free-text combat-notes section.
- **Rationale**: The schema and art-direction layers are deliberately system-agnostic; bolting on
  edition-specific stat blocks fights that and balloons scope.

## R5 — Origin marking (imported/pack-sourced)

- **Decision**: Mark pack-sourced creatures with a **Label** (e.g. `creature-pack`) carried through
  `DiscoveredEntity.frontmatter.labels`, which the import save path already persists
  (`labels: entity.frontmatter.labels || []`).
- **Rationale**: Constitution XII (Labels over Tags) forbids exposing "tags"; the importer already
  threads `frontmatter.labels` into the created entity, so no new write path is needed.

## R6 — Duplicate avoidance on re-import

- **Decision**: The mapper sets `DiscoveredEntity.matchedEntityId` when a same-id creature already
  exists in the target vault. `ReviewList` leaves matched entries deselected by default, and the save
  path independently guards against overwriting existing entities.
- **Rationale**: Satisfies User Story 3 / FR-008 by reusing the importer's existing match semantics
  rather than inventing new dedupe logic. The vault lookup is passed into the pure mapper (injected,
  per Constitution VIII) rather than imported inside the package.

## R7 — Empty-vault call-to-action placement

- **Decision**: The empty-vault host is **`GraphView.svelte`**, which renders the reusable
  `EmptyState` component (`$lib/components/ui/EmptyState.svelte`, `data-testid="graph-empty-state"`,
  headline "Your graph is empty", primary CTA "＋ Create your first entity" →
  `modalUIStore.requestCreateEntity()`). We add a **secondary** "Populate with a pack" CTA here. This
  requires extending `EmptyState` with optional `secondaryCta` / `onSecondaryCta` props (it currently
  supports a single CTA).
- **Not the host**: `EntityExplorerWorkspace`'s empty state (`entity-explorer-workspace-empty`) means
  "no entity _selected_", not "vault is empty" — excluded.
- **Rationale**: `GraphView`'s `EmptyState` is the canonical empty-_vault_ surface and already owns the
  "create your first entity" moment — the natural place to also offer "populate with a pack". Reusing
  `EmptyState` keeps the CTA consistent with existing styling/a11y.
- **Activation**: The CTA issues navigation to the importer with the pack section in view; per F1, the
  CTA's own behaviour (visibility toggle + navigation intent) is testable independently of US1's
  destination section.

## R8 — Content shape per creature

- **Decision**: Each entry renders into the existing **creature entity template** section order so
  imported creatures match hand-authored ones: Summary, Habitat/Environment, Behaviour, Threat Level,
  Common Variants, Story Hooks, and an optional Combat Notes section.
- **Rationale**: Consistency with `EntityTemplateConstants` / the creature template; satisfies FR-005.
