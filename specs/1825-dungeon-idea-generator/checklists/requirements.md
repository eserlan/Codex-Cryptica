# Requirements Checklist: Dungeon Idea Generator

## Functional Requirements

- [x] **FR-001**: Add `"dungeon"` to `SUPPORTED_GENERATOR_IDS` and export `dungeonConfig` in `packages/generator-engine`.
- [x] **FR-002**: Map `"dungeon"` generator ID to `"location"` entity category in `GENERATOR_ENTITY_TYPE`.
- [x] **FR-003**: Provide offline random generator (`generateDungeonLocal`) supporting Fantasy, Dark Fantasy, Sci-Fi, Cyberpunk, and Post-Apocalyptic genres.
- [x] **FR-004**: Provide AI prompt builder (`buildDungeonPrompt`) and response parser (`parseDungeonResponse`) for Gemini SDK integration.
- [x] **FR-005**: Support input options: Theme/Genre, Original Purpose, Current Status, Primary Hazard, Scale, and Custom Instructions.
- [x] **FR-006**: Generated output includes: Title, Lore/Summary, Architectural Atmosphere, Key Sectors/Wings, Inhabitants & Factions, Central Secret/Boss Mystery, Hazards & Traps, Treasures & Artifacts, and Adventure Hooks.
- [x] **FR-007**: Expose the Dungeon Idea Generator in generator session hub and campaign vault generator selector.
- [x] **FR-008**: Include follow-up generator suggestions (Generate Boss NPC, Inhabitant Factions, Relics).

## Non-Functional & Quality Requirements

- [x] **NFR-001**: Local generation completes in under 10ms with zero network requests.
- [x] **NFR-002**: Title generation adheres to `BANNED_NAMES` filter to avoid repetitive AI clichés.
- [x] **NFR-003**: 100% unit test coverage for `public-dungeon.ts` and registry integration.
- [x] **NFR-004**: All user-facing text uses clean natural language per Constitution Principle IX.
- [x] **NFR-005**: All code passes `bun run lint` and `bun run test` without warnings or errors.
