# Research: Business / Enterprise Generator

All decisions below come from reading the existing generators. No open questions remain.

## R1. Which generator to copy

- **Decision**: Model the Business Generator on the Point Crawl generator (spec 177). It uses a structured document plus a markdown rendering, local tables, staged AI with per-part fallback, per-part regeneration, a multi-entity save, and both the in-app and public surfaces.
- **Rationale**: Point Crawl is the newest generator with every surface this spec needs, and its split into `point-crawl-*.ts` modules already passes the Bounded Responsibility check.
- **Alternatives considered**:
  - The plain single-call generators, such as tavern or social hub. They have no structured document, so section regeneration and the multi-entity save would have nothing to work on.
  - Heist. Its staged runner is larger than this generator needs, and it has no multi-entity save.

## R2. Shape of the generated business

- **Decision**: A typed `BusinessDocument`, defined in [data-model.md](./data-model.md), is the single source of truth. The entity `content` and `lore` text is always rendered from it, never the other way round.
- **Rationale**: Section regeneration, the checks in FR-007, name propagation (FR-008) and the save plan (FR-010, FR-015) all need to address individual sections and people. Rendering from data means the text can never drift from what the checks saw.
- **Alternatives considered**: Parsing markdown sections back out of the text. That is fragile, and it is how Council Vote ended up needing roster parsing to audit its paths.

## R3. AI stages

- **Decision**: Three stages on one chat session, with live progress:
  1. **Identity**: sections 1 to 5 (identity, what it does, leadership, staff, clientele).
  2. **Connections**: sections 6 to 8 (dependencies, relationships, reputation).
  3. **Trouble**: sections 9 to 14, plus the management section when the players own the business.

  Each stage is read with `askChecked`, which runs the checks for that stage. When a stage is unusable after one retry, only that stage's sections are filled from local tables and listed in `fallbackSections` (FR-006). After the stages, `checkBusiness` runs and `repairBusiness` replaces any single section that still fails, so the fallback never covers more than the part that failed.

  Later stages are also given the business so far as an "Established facts" block (name, type, leader, staff and, once known, parties), built from the document as it actually stands, so a stage that fell back is described by its local values. A stage whose text names someone the document never introduced is retried once; names that survive are listed in `warnings` (FR-016, FR-017). The name check is a heuristic over capitalised runs; places read as names, so the notice says some may be places.

- **Rationale**:
  - Later stages need earlier ones in context. Hooks must reference the pressure, people and relationships, and one chat session gives the model that history without re-injecting it.
  - Three stages is enough for live progress without paying for a repair turn on every section.
- **Alternatives considered**:
  - A single call. It has no progress and the fallback is all or nothing, which breaks FR-006.
  - One call per section. That is 14 or more round trips, slow, and the hooks lose context.

## R4. Deterministic checks (FR-007)

- **Decision**: `checkBusiness(doc)` returns a list of issues. Each issue has a section id and is one of:
  - `missing` (a required section is empty)
  - `hook-unanchored` (a hook names no person, relationship party, dependency, asset or pressure keyword from the document)
  - `legit-secret-criminal` (legitimacy is fully legitimate and the secret matches the criminal-front word list)
  - `staff-count` (staff count is outside the scale's range: tiny 0 to 1, small 1 to 2, established 2 to 3, regional and major 3 to 4)
  - `inventory-list` (a section has more than 6 list items or includes price patterns)

  Repair replaces the failing section from local tables, which are built to pass every check.

- **Rationale**: Every rule is cheap, deterministic and testable. Hook anchoring uses the document's own names, so no AI judge is needed.
- **Alternatives considered**: An AI consistency review turn. It costs more and isn't deterministic, so it can't back SC-002.

## R5. Section regeneration and name propagation

- **Decision**: `regenerateBusinessSection(doc, sectionId, { useAI, instruction, signal })` returns a new document in which only that section is replaced. When the section is `leadership` or a single staff member and the person's name changes, `propagateRename(doc, oldName, newName)` replaces whole-word matches of the old name in every other section's text, and nothing else changes. With AI unavailable, the section is rerolled from local tables (FR-008). The regeneration UI is one `BusinessRefinePanel` used on both the public page and the in-app draft review.
- **Rationale**:
  - A whole-word replacement keeps every other word as it was, which is exactly what the clarification asked for.
  - One shared panel avoids repeating the gap where Point Crawl and one-shot regeneration exist only on the public page.
- **Alternatives considered**: Regenerating dependent sections too. The user rejected this in clarification.

## R6. In-app save (FR-010, FR-015)

- **Decision**: A pure `buildBusinessSavePlan(doc, { existingTitles, sourceEntity })` in the engine produces:
  - one Faction draft;
  - one Character draft per person, ticked by default;
  - one `SavePartyChoice` per outside party, either `match` (an existing entity id with the link ticked) or `create` (a new Faction or Character, unticked);
  - an optional source link, with the label options from FR-012.

  `saveBusinessToVault(plan, choices, vault)` in `apps/web/src/lib/services/generators/business-vault-save.ts` creates the entities, then adds the connections. If any step throws, it calls `vault.bulkDelete` on every entity it created in this save and rethrows, so no half-saved business is left (User Story 4).

  Matching uses the existing rule from `CampaignGeneratorModal`: an exact, case-insensitive, trimmed title.

- **Rationale**:
  - Keeping the plan pure makes it testable without a vault.
  - Rollback via `bulkDelete` reuses an existing API. `savePointCrawlToVault` has no rollback, and this spec explicitly requires one.
- **Alternatives considered**: `batchCreateEntities`. It doesn't return per-entity ids in a form that suits wiring the connections afterwards, and it still needs a rollback for the connection writes.

## R7. Public-page save

- **Decision**: The public page hands off through the existing `__codex_pending_import` `ImportDraft[]` flow. It sends the Faction draft plus the people the user left ticked, with `relationships` set to `owned by` / `employs`. Outside parties are not matched on the public page: there is no vault there to match against. They stay in the business's text and can be linked in the app later.
- **Rationale**: The import handler only resolves relationships among the drafts it imports. Matching against a vault the public page can't see would mean a new import contract for little gain.
- **Alternatives considered**: Sending outside parties as unticked drafts. The public page has no save-step UI for them, so they would always be skipped.
- **Spec impact**: FR-015 applies to the in-app save step. This is recorded in the spec.

## R8. Launching from an entity (FR-012)

- **Decision**: A new `GenerateBusinessButton.svelte` on the entity detail for Location, Character and Faction entities calls `modalUIStore.openGeneratorWorkflowForEntity(id, "business")`. The existing contextual mode already passes the source entity, its connections and the "create relationship" toggle. The business save step offers the source-link label from FR-012 in place of the generic "related".
- **Rationale**: This reuses the contextual launch mode that "Generate Related" already uses. The new code is one button and a label choice.

## R9. Public discovery (FR-013)

- **Decision**: Register `generator-business` at `/generators/business`:
  - **Primary intent**: "business generator"
  - **Aliases**: "rpg business generator", "shop generator", "rpg shop generator", "enterprise generator", "company generator"
  - **User job**: create
  - **Cluster**: settlement-creation
  - **Related intents**: `generator-tavern`, `generator-social-hub`, `generator-settlement`, `generator-faction`
  - **Acknowledged overlap**: with `generator-tavern`, because a tavern is one gathering venue while this is one organisation and its commercial life.

  The "players own a business" and "economic pressures" answers gain a `relatedTools` link to `/generators/business`.

- **Rationale**: No entry owns "business generator" or "shop generator" today. The tavern entry owns "inn generator", so "inn" is kept out of the aliases.

## R10. Help, changelog, help-engine registry

- **Decision**:
  - Add a help article, `apps/web/src/lib/content/help/business-generator.md`, and register it in `help-content.ts`.
  - Update `in-app-generators.md`.
  - Regenerate `packages/help-engine/src/registry/generators.generated.ts` with `scripts/sync-help-generators.ts`, and update the help-engine fixtures and coverage ledger the same way as for spec 179.
  - Add one user-facing changelog entry.
- **Rationale**: Constitution VII and the repository's changelog rule.
