# Research: Neutral App Chrome and World Theming

## Decision 1: Split App Appearance From World Theme

**Decision**: Introduce separate preference scopes: global app appearance and per-vault world theme. App appearance controls chrome colors, chrome typography, and global surfaces. World theme controls canvas/world colors, graph style, genre texture, and genre vocabulary.

**Rationale**: Issue #860 identifies the root problem as structural: a single theme paints everything. Splitting the scopes addresses default neutrality, chrome clarity, and per-world genre identity without removing existing themes.

**Alternatives considered**:

- Keep one theme and add neutral default only. Rejected because chrome would still change when users select a genre theme.
- Create entirely separate stores and package systems immediately. Rejected as unnecessary for the first implementation; the existing theme store already owns vault-specific loading and injectable persistence.

## Decision 2: Backwards Compatibility Treats Existing Theme As World Theme

**Decision**: Existing saved theme ids remain valid and are interpreted as world theme selections. New global app appearance preference gets its own storage key and defaults to system or neutral light/dark resolution without overwriting existing vault theme data.

**Rationale**: FR-003 requires saved fantasy or other genre selections to continue working. This lets current users keep their selected world mood while new users avoid fantasy as the app-wide default.

**Alternatives considered**:

- Migrate every saved fantasy theme to neutral automatically. Rejected because it would overwrite intentional user choices.
- Create a one-time migration wizard. Rejected for first delivery because it adds UX surface before the core separation exists.

## Decision 2a: Add Dedicated `workspace` World Theme

**Decision**: Introduce a new neutral world theme id, `workspace`, for worlds with no saved world theme. Do not reuse the existing `modern` theme as the default.

**Rationale**: The neutral default needs product-default semantics and should not inherit assumptions from an existing style theme. Keeping `modern` separate preserves backwards compatibility for users who intentionally chose it and avoids turning it into both a style option and a migration/default mechanism.

**Alternatives considered**:

- Reuse `modern` as the neutral default. Rejected because `modern` is already an existing selectable theme with its own visual identity and saved-user meaning.
- Use no world theme until the user chooses one. Rejected because world surfaces, graph styling, and defaults still need deterministic tokens.

## Decision 3: Use Scoped CSS Variables Instead Of New Styling Framework

**Decision**: Continue using Tailwind 4 semantic variables, but introduce explicit app-chrome and world-theme variable scopes. App chrome variables live at the document/root level or chrome containers; world theme variables are applied only to world/canvas containers.

**Rationale**: The repo already uses Tailwind 4 semantic tokens and CSS variable switching. Scoping variables preserves the existing component style model while preventing parchment or other texture from leaking into app chrome.

**Alternatives considered**:

- Replace the theme system with component-level props. Rejected because it would spread styling concerns across many components.
- Add CSS-in-JS or a runtime style library. Rejected by YAGNI and dependency constraints.

## Decision 4: System Appearance Resolves At Runtime

**Decision**: The "system" app appearance stores a stable preference value but resolves to neutral light or neutral dark based on `prefers-color-scheme`. Runtime changes should update app chrome without changing the selected world theme.

**Rationale**: The issue explicitly recommends light/dark switched by user preference or OS. Storing `system` separately avoids mutating user preference whenever OS mode changes.

**Alternatives considered**:

- Store only concrete light/dark values. Rejected because it cannot represent "follow my device" behavior.
- Make system the only mode. Rejected because users need explicit light and dark choices.

## Decision 5: Texture Belongs To World Moments Only

**Decision**: `--bg-texture` must not be used on `body` or global chrome. Texture may be applied to world/front-page, graph/canvas, cover, or entity surfaces where the selected world theme calls for it.

**Rationale**: The issue calls out wallpapered parchment as a major usability problem. Scoping texture makes genre moments stronger and keeps controls readable.

**Alternatives considered**:

- Lower texture opacity globally. Rejected because it still leaves chrome and body dependent on genre theme.
- Remove textures entirely. Rejected because world themes should still carry genre identity.

## Decision 6: Typography Has Three Roles

**Decision**: App chrome uses a neutral readable type voice, world surfaces may use genre heading/display voice, and authored body content remains long-form readable. Fantasy must no longer rely on one font for both heading and body.

**Rationale**: The issue identifies flat hierarchy from a single fantasy font. A layered typography contract solves that without forcing decorative typography into user prose.

**Alternatives considered**:

- Change fantasy to a different single font. Rejected because it does not solve the hierarchy problem.
- Let every component decide its own font. Rejected because it undermines theme consistency.

## Decision 7: Fantasy Refinement Is Part Of This First Slice, Full Theme Matrix Is Not

**Decision**: Include fantasy typography, graph edge weight, overlay, palette balance, and edge/corner refinements in this feature. Defer full light/dark variants for every genre and onboarding genre selection to later specs.

**Rationale**: Fantasy is the problematic current default and the most visible existing theme. Full theme matrix and onboarding are larger product additions and are explicitly marked as later moves in issue #860.

**Alternatives considered**:

- Build all genre light/dark variants now. Rejected as too broad for a safe first implementation.
- Do only neutral app chrome and leave fantasy unchanged. Rejected because the issue lists fantasy tuning as a quick win and users who keep fantasy should get the hierarchy fix.
