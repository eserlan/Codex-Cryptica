# Feature Specification: Language Generator

**Feature Branch**: `141-language-generator`  
**Created**: 2026-07-05  
**Status**: Draft  
**Input**: User description: "Add language generator"

## Clarifications

### Session 2026-07-05

- **Q**: How should the saved Language entities be structured and identified in the vault so that other generators can locate and reuse them as naming context?  
  **A**: Identify saved Language entities by looking for notes containing `kind: language` in their frontmatter, or belonging to a category with the ID or label "language".
- **Q**: For the offline/local procedural fallback (when AI is disabled or offline), how detailed should the pseudo-language generator's ruleset and output structure be?  
  **A**: Lightweight Syllable combiner: Use pre-defined, genre/inspiration-based consonant-vowel lists to assemble names, words, and simple phrase lists.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a campaign-ready fictional language profile (Priority: P1)

As a Game Master or Worldbuilder, I want to generate a fictional language profile with styling, sound notes, a naming rule system, and a vocabulary word bank so that I can establish linguistic consistency for my setting.

**Why this priority**: Core value of the feature. Without the ability to generate a structured language, the feature has no MVP value.

**Independent Test**:
The user opens the Campaign Generator Hub, selects the "Language Generator", chooses a genre (e.g., "Classic Fantasy"), tone inspiration (e.g., "Gravelly & Harsh"), and hits generate. The interface presents a structured language card with a name, phonology rules, name structure conventions, a small word bank, and translation examples.

**Acceptance Scenarios**:

1. **Given** the Campaign Generator Hub is open, **When** I click the "Language Generator" and select "Cyberpunk" with a "Sleek & Technical" tone and click "Generate", **Then** the system outputs a detailed profile for a fictional language including sound notes, naming patterns, and a 10+ word vocabulary bank.
2. **Given** AI is disabled in the settings, **When** I run the language generator, **Then** the system falls back to a local procedurally generated language profile containing consistent syllables, naming rules, and a word bank.

---

### User Story 2 - Save language draft to Campaign Vault (Priority: P1)

As a vault creator, I want to review the generated language draft and save it directly into my campaign vault as a Note or structured Entity so that I can reference it during writing sessions.

**Why this priority**: Crucial for campaign integration. Generators must persist their results so users don't lose the generated lore.

**Independent Test**:
After generating a language, the user clicks "Save Draft". The app successfully creates a new entity in the vault under the "note" category (or a custom "language" category if the campaign has one) and stores the markdown and metadata.

**Acceptance Scenarios**:

1. **Given** a generated language draft, **When** I click the "Save Draft" button with "Create relationship link" enabled, **Then** a new entity is saved, and a relationship is mapped between the source entity and the new language entity.

---

### User Story 3 - Reuse language profile context in other generators (Priority: P2)

As a creator using other generators (e.g., NPC, Settlement, or Faction generators), I want to supply my custom generated language as background context so that subsequent generated names and places sound unified.

**Why this priority**: Enhances the cohesion of the worldbuilding tools and fulfills the "reusable word bank/naming rules" goal.

**Independent Test**:
In the NPC generator options, when a saved Language entity is present in the vault, the user can select it as a "Naming Language" option, which alters the prompt sent to the LLM to incorporate the phonology and word rules of that language.

**Acceptance Scenarios**:

1. **Given** a saved language entity named "Thranish", **When** I open the NPC generator and select "Thranish" as the naming inspiration, **Then** the prompt includes the Thranish syllables and naming rules to influence the generated name.

---

### User Story 4 - Public Marketing Tool Page (Priority: P2)

As a visitor to the Codex Cryptica website, I want to use a free web-based version of the Language Generator to preview the application's capabilities before creating a vault.

**Why this priority**: Drives user acquisition and showcases the generator capability to marketing visitors.

**Independent Test**:
Navigating to `/generators/language-generator` displays the public form layout and allows running the generator using the free guest AI proxy.

**Acceptance Scenarios**:

1. **Given** a web visitor on `/generators/language-generator`, **When** they fill the options and submit, **Then** the guest AI proxy runs the generator and displays a fully formatted public card.

---

### Edge Cases

- **AI Failure / Timeout**: If the AI model fails to respond or returns malformed JSON, the generator MUST show a user-friendly error and offer to fall back to local generation.
- **Theme/Genre Mismatches**: If custom genres or themes are used in the campaign, the generator MUST gracefully adapt the instructions or fall back to system defaults.
- **Banned Names Collision**: If generated name examples or prefixes match items in the campaign's name ban list, the system must filter or replace them.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST add a new generator ID `"language"` to the supported campaign generators.
- **FR-002**: The system MUST map the `"language"` generator to the `"note"` entity type by default, but allow custom category overrides if the vault defines a category labeled "Language".
- **FR-003**: The Language Generator MUST support the following configurable inputs:
  - **Genre/Theme**: Dropdown (e.g., Classic Fantasy, Cyberpunk, Gothic, Space Opera, Post-Apocalyptic, Modern Conspiracy).
  - **Tone/Style**: Dropdown (e.g., Harsh & Consonant-heavy, Lyrical & Vowel-rich, Ancient & Formal, Clipped & Technical, Shadowy & Whispered).
  - **Culture/Faction Context**: Optional text field for adding custom context (e.g., "for subterranean dwarven mining guilds").
  - **Language Role**: Dropdown (e.g., Common Speech, Sacred/Ritual Tongue, Imperial Standard, Thieves' Cant, Dead Language).
  - **Name Structure**: Dropdown (e.g., Compound Words, Suffix-heavy, Prefix-heavy, Short & Monosyllabic).
- **FR-004**: The system MUST return a structured JSON response containing:
  - `title`: The name of the generated language.
  - `summary`: A short, descriptive tagline.
  - `lore`: Complete markdown profile structured with standard headings: "Pronunciation & Phonology", "Naming Conventions", "Example Names", "Common Vocabulary & Word Bank", and "Sample Phrases".
  - `labels`: List of labels.
- **FR-005**: The system MUST provide a procedural local generator fallback that constructs a consistent pseudo-language structure using pre-defined, genre/inspiration-based consonant-vowel syllable lists to assemble names, words, and simple phrase lists if AI is disabled or offline.
- **FR-006**: The system MUST expose the new generator on the public route `/generators/language-generator`, linked from the `/tools` hub and the theme generator hubs, matching the route structure of the newer public generators (settlement, kingdom, nation, ship). No standalone `/tools/language-generator` route is required.
- **FR-007**: The system MUST export `languageConfig` and utility adapters from the `@codex/generator-engine` workspace package.
- **FR-008**: The system MUST detect saved Language entities in the vault by identifying notes containing `kind: language` in frontmatter or entities belonging to a category with the ID or label 'language'.

### Key Entities _(include if feature involves data)_

- **Language Profile**: An entity containing the generated language name, phonetic traits, naming structures, vocabulary keys, and translations, saved as a standard Markdown file with frontmatter metadata.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can generate a fictional language profile within 5 seconds under standard network conditions.
- **SC-002**: Saved language profiles are correctly indexed by the search engine and accessible in the campaign entity list.
- **SC-003**: The generated language vocabulary is parseable and can be successfully loaded as contextual input by other campaign generators in under 100ms.
