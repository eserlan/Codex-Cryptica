# Research: Default Art Prompts

## Decision 1: Add A Pure Art Direction Resolver

**Decision**: Implement art direction resolution as a pure, testable function or service that accepts draw context and returns a resolved prompt plus metadata about the fallback level used.

**Rationale**: The fallback hierarchy is the core feature. Keeping it pure makes it easy to test, reuse from every draw entry point, and reason about without coupling to image generation network behavior.

**Alternatives considered**:

- Build prompt rules directly into each draw button or command path. Rejected because it would create inconsistent behavior.
- Add another AI call to rewrite prompts. Rejected because the feature needs predictable defaults and should not add latency before image generation.

## Decision 2: No Dedicated Art Direction Settings Storage

**Decision**: Do not add Vault Settings fields or new persistence for art direction in the first implementation. Custom user art direction should remain normal note/entity content that may be included in draw context.

**Rationale**: The user explicitly prefers ordinary notes/entities for custom styles. This avoids product clutter and uses the vault's existing content model, sync, permissions, search, and editing behavior.

**Alternatives considered**:

- Add `AI Art Direction` settings with textareas for default and category overrides. Rejected because it duplicates a concept users can express as notes/entities.
- Add a hybrid settings-plus-content model. Rejected for the first implementation because it increases ambiguity and persistence scope.

## Decision 3: Ship Category Defaults For Composition

**Decision**: Provide shipped category defaults for common category-like contexts: Character, Creature, Location, Item, Faction, Event, Note, and world cover.

**Rationale**: Theme gives mood, but category gives composition. A location should lean toward establishing shots, while an item should lean toward prop presentation. This is the highest-value defaulting behavior from issue #867.

**Alternatives considered**:

- Ship only theme defaults. Rejected because every category would receive similar image composition.
- Require user category prompts. Rejected because the MVP should improve first-use behavior without setup.

## Decision 4: Theme Defaults Are Descriptive And Safe

**Decision**: Theme defaults describe medium, mood, materials, lighting, and composition. They must not name living artists or instruct direct imitation of living artists.

**Rationale**: The issue examples included artist-name style references, but shipped defaults should be legally and product-safe while still steering visual output.

**Alternatives considered**:

- Copy the issue's artist-name prompt examples. Rejected because shipped defaults should avoid living-artist imitation.
- Make defaults so generic that they do not steer style. Rejected because the feature exists to create consistent visual direction.

## Decision 5: Existing Image Generation Service Stays Intact

**Decision**: Resolve art direction before calling the existing image generation service. Do not change the model request/response path except for passing the prepared prompt.

**Rationale**: Existing code already handles AI enablement, direct/proxy calls, image response parsing, and errors. This feature should improve prompt preparation without changing image transport.

**Alternatives considered**:

- Replace the image generation service with a new art-aware service. Rejected because it increases blast radius and duplicates existing behavior.
- Add resolver behavior inside `generateImage`. Rejected because `generateImage` should receive final prompt text and remain focused on model IO.

## Decision 6: Draw Command Category Words Are Hints

**Decision**: `/draw character Almos` may use `character` as category context, but if `Almos` resolves to an entity with a category, the entity metadata wins.

**Rationale**: This gives users useful shorthand while preserving canonical vault metadata when the subject is a known entity.

**Alternatives considered**:

- Treat command category words as subject text only. Rejected because it loses a helpful composition hint.
- Let command category words always override entity metadata. Rejected because it can accidentally contradict known entity data.

## Decision 7: Entry Point Coverage Is Explicit

**Decision**: The first implementation must route these existing entry points through the same resolver: `/draw`, entity sidebar draw, Zen mode draw, graph context menu image generation, front page cover generation, and Oracle chat draw where context exists.

**Rationale**: Users should not see different art direction behavior depending on which button or command they use.

**Alternatives considered**:

- Cover only `/draw` and entity sidebar first. Rejected because the spec now explicitly names current draw buttons, and partial coverage would preserve inconsistency.
