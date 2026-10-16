# Feature Specification: Optional Tales of the Valiant Mechanics in NPC, Creature, and Item Generators

**Feature Branch**: `feat/3948-tov-generator-mechanics`  
**Created**: 2026-10-15  
**Status**: Draft  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/3948 - ToV P1: Add optional ToV mechanics to NPC, creature and item generators"

## Clarifications

### Session 2026-10-15

- Q: How should optional Tales of the Valiant mechanics for magic items and loot be structured and saved? → A: Option A (Generate structured BFRD item fields formatted into dedicated markdown sections and entity metadata, saveable as standard equipment/loot entities without a dedicated stat-sheet template).
- Q: Should the NPC Generator produce a streamlined "Quick NPC" stat block or a full leveled character build when Tales of the Valiant mode is enabled? → A: Option A (Default to CR-based Quick NPC mapped to `builtin-tov-npc`, with a generator option to generate a full leveled character mapped to `builtin-tov-character`).
- Q: Should the optional Game System selector be available on public standalone generator pages (`/generators/...`) as well as inside campaign vaults? → A: Option A (Exposed on both public SEO generator pages and the in-app campaign modal; public pages default to System Neutral, and generated ToV mechanics can be copied to clipboard or imported via vault handoff).
- Q: How should Tales of the Valiant mechanics be generated when running in offline or AI-disabled mode? → A: Option B (Require AI for ToV mechanical structuring; if AI is disabled or offline, output standard system-neutral content with an informational notice explaining that game-system mechanics require AI mode).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate an NPC with Optional Tales of the Valiant Stat Block (Priority: P1)

A Game Master preparing a Tales of the Valiant campaign wants to generate an NPC (such as an apothecary, city watch captain, rival adventurer, or hedge wizard). They open the NPC Generator in Codex Cryptica, select "Tales of the Valiant" as the game system (or inherit it from their ToV-configured campaign vault), and run the generator. By default, the generator produces a streamlined Quick NPC stat block (Challenge Rating, Armor Class, Hit Points with hit die formula, ability modifiers, key saving throws, and primary action/combat entries) mapped to `builtin-tov-npc`. If the user selects the "Full Character" option (e.g. for a major companion or recurring hero/villain), the generator instead generates a full leveled character build (Lineage, Heritage, Background, Class/Subclass levels, Talents, and spell/resource trackers) mapped to `builtin-tov-character`. In both modes, narrative backstory, motivations, and relationships are generated alongside the mechanics. When saved, the entity is created with narrative notes in markdown and the appropriate pre-populated ToV stat sheet attached.

**Why this priority**: NPCs are the most frequently generated entities during game preparation and live session running. Providing structured, playable ToV stats directly from the generator eliminates manual character sheet drafting while preserving CC's core worldbuilding depth.

**Independent Test**: Can be tested by running the NPC generator with Game System set to "Tales of the Valiant", verifying that valid BFRD-compliant stats appear alongside narrative traits, and saving the draft to verify that the resulting entity attaches a functional `builtin-tov-npc` stat sheet.

**Acceptance Scenarios**:

1. **Given** a user is on the NPC Generator and selects "Tales of the Valiant" mode, **When** they generate an NPC, **Then** the output contains both rich narrative traits (personality, appearance, motivations) and structured ToV mechanics (HP, AC, Ability Scores with modifiers, PB, attacks, and lineage/heritage traits).
2. **Given** a generated ToV NPC draft, **When** the user clicks "Save to Vault", **Then** the entity is saved with narrative content in the markdown body and the structured mechanics bound into a `builtin-tov-npc` stat sheet with click-to-roll formulas.
3. **Given** the user selects "System Neutral" (default), **When** they generate an NPC, **Then** only narrative and system-agnostic fields are generated, exactly matching existing generator behavior with no ToV terminology leakage.

---

### User Story 2 - Generate a Creature or Monster with BFRD Mechanics (Priority: P1)

A Game Master needs an encounter creature or boss monster suited for Tales of the Valiant (e.g., a swamp horror, animated ruin guardian, or corrupted beast). They run the Creature & Monster Generator with ToV mode enabled. The generator produces source-valid BFRD creature stats including Size, Type, Alignment/Tags, Armor Class, Hit Points with hit die formula, Speed, Ability Scores, Saving Throws, Skills, Damage Vulnerabilities/Resistances/Immunities, Senses, Languages, Challenge Rating (CR) with Proficiency Bonus, Traits, Actions, and Reactions. Homebrew or generated abilities not in the core BFRD are clearly marked for GM review.

**Why this priority**: Monster and encounter generation requires strict mechanical integrity (CR calculations, action economy, hit dice formulas). Seamlessly bridging narrative monster concepts into playable ToV encounter tokens is central to the M2 GM tools roadmap.

**Independent Test**: Can be tested by generating creatures of various Challenge Ratings under ToV mode, verifying mathematical consistency (e.g. PB matches CR, attack bonuses derive from stats + PB, damage formulas are valid dice strings), and saving to an entity attaching the `builtin-tov-monster` template.

**Acceptance Scenarios**:

1. **Given** the Creature Generator with ToV mode active, **When** the user requests a CR 3 monstrosity, **Then** the generator returns valid BFRD creature stats (PB +2, appropriate HP/AC for CR 3, formatted multiattack/action entries, and valid dice formulas such as `2d6 + 3`).
2. **Given** a creature output with non-standard or bespoke abilities, **When** reviewing the draft, **Then** any extrapolated/homebrew mechanics are visibly tagged as requiring GM review, distinguishing them from verified BFRD rules.
3. **Given** a saved ToV creature entity, **When** opened in the sheet or VTT token inspector, **Then** all action rolls, saving throws, and HP bars are functional and interactive.

---

### User Story 3 - Generate a Magic Item or Loot with ToV Properties (Priority: P2)

A GM or solo player generates treasure or a signature magic item. In the Magic Item Generator, they opt into "Tales of the Valiant" mode. The generator provides the item's lore, physical description, and quirks, plus ToV-appropriate mechanics: Item Rarity (Common to Legendary), Attunement requirements, item type (Weapon, Armor, Wondrous Item, Ring, etc.), activation cost (Action, Bonus Action, Reaction, or Passive), charge pool/recharge rates, saving throw DC formulas, and Luck-related properties if applicable.

**Why this priority**: Extends the general game-system magic item feature (#2388) to ToV, ensuring magic items and loot can be immediately referenced or equipped on player/creature stat sheets without manual transcription.

**Independent Test**: Can be tested by generating magic items across different rarities with ToV selected, verifying that attunement, activation action, and charge mechanics conform to BFRD standards without breaking system-neutral loot generation.

**Acceptance Scenarios**:

1. **Given** the Magic Item Generator with ToV selected, **When** generating a weapon or wondrous item, **Then** the output includes rarity, attunement rules, activation action type, charges/recharge timing, and precise rules text adhering to BFRD terminology.
2. **Given** a magic item with mechanical properties or roll formulas, **When** saved as an entity, **Then** the item's mechanics are saved in a structured 'Game Statistics' markdown section and entity metadata, compatible with character inventory references without attaching a bespoke stat sheet.
3. **Given** the user selects System Neutral, **When** generating a magic item, **Then** the generator behaves as standard narrative-first without rules-specific tags.

---

### User Story 4 - Vault-Level Profile Inheritance with Transparent Override (Priority: P2)

A user has configured their campaign vault with the Tales of the Valiant system profile (via #3943). When they open any supported generator (NPC, Creature, Magic Item) from within that vault, the generator automatically pre-selects "Tales of the Valiant" based on vault settings. The user can easily override this selection to "System Neutral" or another profile for a specific generation without altering their vault-wide preference.

**Why this priority**: Prevents repetitive configuration for users running dedicated ToV campaigns while honoring the principle that game systems are strictly opt-in and easily reversible.

**Independent Test**: Can be tested by setting the active vault's system profile to `tales-of-the-valiant`, launching the NPC generator, verifying the default selector is ToV, changing it to System Neutral for one generation, and confirming the vault profile remains unchanged.

**Acceptance Scenarios**:

1. **Given** a vault with `systemProfile: "tales-of-the-valiant"`, **When** the user opens an NPC, Creature, or Magic Item generator inside that vault, **Then** the game-system selector defaults to "Tales of the Valiant".
2. **Given** a public standalone generator (e.g. `/generators/npc`) or a vault with default `generic` profile, **When** opened, **Then** the game-system selector defaults to "System Neutral".
3. **Given** an anonymous visitor on a public generator, **When** they select "Tales of the Valiant" and generate, **Then** the result displays structured ToV mechanics that can be copied formatted to clipboard or transferred to a vault via the guest-to-vault handoff flow.
4. **Given** a user overrides the generator's selector to "System Neutral", **When** generation completes, **Then** the draft is produced in neutral mode and the vault's overall system profile is not modified.

---

### Edge Cases

- **Offline or Non-AI Generation**: ToV mechanical structuring requires AI mode. When generating without AI (e.g. offline or with AI disabled), the generator outputs standard system-neutral content along with an informational notice indicating that game-system mechanics require AI generation, without failing or throwing errors.
- **Custom / Unknown System Profiles**: If a vault specifies an unrecognized or custom system profile, generators must gracefully fall back to System Neutral without throwing errors.
- **Save to Vault without Stat Sheet Support**: If the target vault or entity category does not support stat sheets, the generated mechanics must be cleanly formatted into a standard Markdown "Game Statistics" section within the entity note body so no generated content is lost.
- **Dice Formula Integrity**: Generated dice expressions (e.g. `1d8 + 3`, `3d6`, `2d10 + 4`) must be strictly validated; malformed expressions that cannot be evaluated by the dice engine must be sanitized or flagged.
- **No Trademark or Commercial Infringement**: The output must strictly stick to open BFRD licensed content (under CC BY 4.0); proprietary Kobold Press setting names, non-SRD subclasses, or official logos must not be generated or asserted as open rules.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Generators MUST support an optional Game System selector on both public standalone generator pages (`/generators/...`) and the in-app campaign generator modal, providing at least "System Neutral" (default) and "Tales of the Valiant".
- **FR-002**: The Game System selector MUST resolve default values using the precedence: explicit generator choice > active vault system profile (`GameSystemRegistry`) > System Neutral (public standalone generator pages without vault context always default to System Neutral).
- **FR-003**: The NPC Generator MUST support generating ToV mechanics: defaulting to a streamlined Quick NPC stat block (Challenge Rating, Armor Class, Hit Points with hit die formula, ability modifiers, key saving throws, and primary actions), with an option in the generator configuration to generate a full leveled character (Lineage, Heritage, Background, Class/Subclass levels, and Talents).
- **FR-004**: The Creature / Monster Generator MUST support generating ToV creature statistics including Size, Creature Type, Alignment, Armor Class, Hit Points, Speed, Ability Scores, Saving Throws, Skills, Damage Resistances/Immunities, Senses, Languages, Challenge Rating, Proficiency Bonus, Traits, Actions, and Reactions.
- **FR-005**: The Magic Item Generator MUST support generating ToV item properties including Rarity, Item Category, Attunement requirements, Activation Actions, Charges/Recharge, saving throw DCs, and mechanical effect descriptions formatted into a dedicated Markdown 'Game Statistics' section and entity metadata, saveable as equipment/loot notes without requiring a dedicated stat-sheet template.
- **FR-006**: Generated ToV mechanics MUST strictly conform to the pinned BFRD rules baseline (CC BY 4.0) established in #3942 and MUST NOT clone or leak distinct 5e-specific or proprietary non-open terminology.
- **FR-007**: Any generated mechanical value, talent, or trait that is invented or extrapolated by the AI beyond canonical BFRD reference entries MUST be clearly annotated with a "Homebrew / GM Review" flag or notice.
- **FR-008**: Narrative content (character backstory, personality, bonds, physical description, setting integration) and mechanical statistics MUST remain cleanly decoupled so either can be edited independently.
- **FR-009**: When saving a generated ToV draft to the vault, the system MUST automatically bind the appropriate native ToV template (`builtin-tov-npc` for Quick NPCs, `builtin-tov-character` for full leveled characters, and `builtin-tov-monster` for creatures) and populate its fields from the generated mechanics.
- **FR-010**: All generated dice expressions (attacks, damage, hit dice, recharge rolls) MUST be formatted as valid roll formulas supported by `diceRollerService` and the stat-sheet click-to-roll system.
- **FR-011**: System-neutral mode MUST remain 100% backward-compatible; existing generator outputs, public SEO generator pages, and non-ToV campaign workflows MUST NOT be altered or degraded.
- **FR-012**: Implementation MUST extend the existing `packages/generator-engine` and `packages/stat-sheet-engine` architecture without creating duplicate or ToV-only forks of any generator.
- **FR-013**: The draft review interface MUST provide visual preview tabs or sections allowing the GM to review Narrative and Game Mechanics before committing the save.
- **FR-014**: Required BFRD attribution notices MUST be accessible and referenced whenever ToV mechanics are generated or saved.

### Key Entities

- **`GameSystemProfile`**: The system profile contract defining identity (`tales-of-the-valiant`), capabilities (`npcTemplateId`, `creatureTemplateId`, `supportedResources`), and licensing provenance.
- **`GeneratorOutput`**: The extended output payload holding both standard narrative content/lore and an optional typed `mechanics` bundle containing system-specific stat blocks.
- **`GeneratedDraft`**: The reviewable pre-save draft enriched with structured stat-sheet values and template association for seamless vault saving.
- **`StatSheetData`**: The persistent stat-sheet model containing values, resource counters (HP, Luck, Doom), and click-to-roll action formulas mapped to `builtin-tov-npc` or `builtin-tov-monster`.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of generated ToV NPC and Creature drafts can be saved directly to the vault as playable entities with their corresponding native ToV stat sheet attached in a single click.
- **SC-002**: 100% of generated attack and damage formulas are syntactically valid and successfully trigger rolls when clicked in the stat sheet.
- **SC-003**: Zero regressions or behavioral changes in System Neutral generation across all public and campaign generators.
- **SC-004**: Generated ToV statistics adhere to mathematical consistency (e.g. PB matches CR/level, ability modifiers match standard formula `floor((score - 10) / 2)`) with a 0% error rate in deterministic fixtures.
- **SC-005**: All generated non-SRD / homebrew traits and actions carry an explicit GM review indicator.
- **SC-006**: Generator code reuse is maintained with 0 duplicate generator definitions created.
