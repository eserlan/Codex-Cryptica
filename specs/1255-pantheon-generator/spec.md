# Feature Specification: Pantheon / God Generator Landing Tool

**Feature Branch**: `1255-pantheon-generator`  
**Created**: 2026-06-11  
**Status**: Draft  
**Input**: User description: "Create a public, indexable Pantheon / God Generator that acts as both a useful worldbuilding tool and a discovery entry point into Codex Cryptica."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a Single Deity or Spirit (Priority: P1)

An RPG GM or worldbuilder visits the public generator without logging in and wants to generate a single divine entity (god, spirit, ancestor, etc.) to fit their campaign setting. They select options like divine type, domain, and culture inspiration, click "Generate," and immediately see a structured markdown preview of the entity's lore. They can copy the output or click "Save to Codex" to import it.

**Why this priority**: This forms the core Minimum Viable Product (MVP). It provides immediate value to fantasy worldbuilders and establishes the conversion funnel into Codex Cryptica.

**Independent Test**: Can be tested by filling out the single deity options, clicking generate, verifying that a named deity is rendered with all expected sections (Name, Type, Domains, Symbols, Worshippers, Temples, Rituals, Myths, Adventure Hooks), and verifying that copying to clipboard or clicking the Save button functions correctly.

**Acceptance Scenarios**:

1. **Given** a user is on the Pantheon/God Generator page, **When** they choose "Single Deity", select "Classic Fantasy" genre, "God" type, and "Death" domain, and click "Generate", **Then** the page displays a generated deity with a death-themed name and corresponding deity details in Markdown format.
2. **Given** a generated deity is displayed, **When** the user clicks "Save to Codex", **Then** the deity draft is stored in local storage and the user is prompted with a modal redirecting them to the main app dashboard for importing.
3. **Given** a generated deity is displayed, **When** the user clicks "Copy Markdown", **Then** the structured Markdown text representing the deity is copied to their clipboard.

---

### User Story 2 - Generate a Small Pantheon with Relationships (Priority: P2)

A worldbuilder wants to create a cohesive pantheon of deities rather than a single god. They select "Small Pantheon" (3-4 deities) and choose a conflict theme (e.g., succession, cosmic balance). The generator outputs a list of deities along with defined relationship connections and divine conflicts between them.

**Why this priority**: A pantheon provides richer worldbuilding depth than single entities and demonstrates the multi-entity and connection-mapping capabilities of Codex Cryptica.

**Independent Test**: Can be tested by choosing the "Small Pantheon" option, generating a response, and confirming that the UI displays a structured set of multiple deities, details their relationships/conflicts, and allows saving them as a bundle.

**Acceptance Scenarios**:

1. **Given** the user selects "Small Pantheon", **When** they choose "Cosmic Balance" conflict theme and click "Generate", **Then** the system outputs a pantheon containing 3 to 4 deities, each with distinct domains, along with a "Divine Conflicts & Alliances" section detailing how they relate to one another.
2. **Given** a generated pantheon, **When** the user clicks "Save to Codex", **Then** the system packages the pantheon as a Faction entity, each deity as a Character entity, and creates connections between them, saving all of them to local storage for importing into the app.

---

### User Story 3 - Steer Generation with Campaign Context (Priority: P3)

A GM wants the generated divine lore to fit an ongoing campaign. They type a brief description in the "Campaign Context" box (e.g., "The sun is dying and the moon has shattered"). The generator incorporates this context to steer the name, myths, and hooks of the deity or pantheon.

**Why this priority**: Custom context makes the generator feel tailored, increasing user satisfaction and the likelihood of saving the draft.

**Independent Test**: Can be tested by adding specific text in the Campaign Context box, clicking generate, and verifying that the generated deity's name, myths, or hooks reference or align with the provided context.

**Acceptance Scenarios**:

1. **Given** the user enters "The sky is permanently covered in ash" in the Campaign Context box, **When** they generate a deity, **Then** the output incorporates ash, darkness, or the blocked sky into the deity's description or lore.

---

### Edge Cases

- **AI Failure / Rate Limiting**: If the AI model fails or is rate-limited, the system must gracefully fall back to generating a fully formatted deity using pre-defined local roll tables, displaying a warning notice but presenting valid content.
- **Malformed AI JSON Response**: If the AI returns malformed JSON, the parser must recover by creating a default title and placing the raw text into the content block, avoiding page crashes.
- **Empty / Junk Campaign Context**: If the user enters only spaces or emojis in the context box, the generator should ignore the context and proceed with standard generation without error.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Pantheon / God Generator MUST be hosted on a public page `/generators/pantheon-generator` or `/generators/god-generator`, accessible without user login.
- **FR-002**: The page MUST be indexable by search engines, with a unique meta title and description, and be listed in the app's sitemap.
- **FR-003**: The UI MUST provide a toggle/selector to switch between generating a "Single Deity" and a "Small Pantheon".
- **FR-004**: The generator MUST accept the following user inputs:
  - **Genre/Theme**: Selectable (Classic Fantasy, Cyberpunk, Gothic Noir, Sci-Fi, Modern Conspiracy, Post-Apocalyptic).
  - **Divine Type**: Selectable (God, Spirit, Saint, Demon, Ancestor, Abstract Force).
  - **Divine Domain**: Selectable (War, Nature, Knowledge, Shadow, Death, Light, Arcana, Chaos, Harmony).
  - **Tone**: Selectable (Mythic, Dark, Mystical, Weird, Heroic).
  - **Worshippers**: Selectable (Mystery Cult, State Religion, Secret Brotherhood, Nomadic Tribe, Folk Devotion).
  - **Conflict Theme** (Pantheon only): Selectable (Succession, Cosmic Balance, Betrayal, Forbidden Love, Forgotten Pact).
  - **Campaign Context**: Optional free-text textarea (max 240 characters).
- **FR-005**: The single deity generator output MUST include the following structured fields:
  - Name
  - Type
  - Domains
  - Symbols & Icons
  - Worshippers & Cults
  - Temples & Sacred Places
  - Rituals & Taboos
  - Myths & Legends
  - Adventure Hooks
- **FR-006**: The pantheon generator output MUST include 3 to 4 deities (each with names and brief descriptions) and a list of relationships/conflicts linking them.
- **FR-007**: The generator MUST output a structured payload that can be saved to `localStorage` under the key `__codex_pending_import` as a single draft (Single Deity) or an array of drafts (Pantheon) with appropriate type categories (`character` for deities, `faction` for the pantheon).
- **FR-008**: The generator page MUST have a "Copy Markdown" button that copies the structured markdown output to the user's clipboard.
- **FR-009**: The generator page MUST feature links to other generator pages in the ecosystem to drive engagement.

### Key Entities

- **Deity**: A character-type entity representing a single god or spirit. Attributes: Name, Type, Domains, Symbols, Worshippers, Temples, Rituals, Myths, Hooks. Maps to a Codex `character` entity with appropriate tags.
- **Pantheon**: A faction-type entity representing the divine organization. Attributes: Name, Description, Member Deities, Conflict Theme. Maps to a Codex `faction` entity.
- **Divine Connection**: A connection-type entity representing a relationship between deities (e.g. Ally, Rival, Parent, Child). Maps to Codex `connection` definitions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can generate a deity or pantheon in under 5 seconds when the AI model responds normally.
- **SC-002**: Generated drafts saved via the "Save to Codex" CTA must successfully load into the user's campaign vault upon redirect to the main app dashboard.
- **SC-003**: The page must pass standard lighthouse/SEO checks for page titles, headings, and semantic structure.
- **SC-004**: The page is fully responsive, looking polished and usable on mobile screens down to 360px wide.
