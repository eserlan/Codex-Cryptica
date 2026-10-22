# Feature Specification: Biome Explorer

**Feature Branch**: `180-biome-explorer`  
**Created**: 2026-10-21  
**Status**: Draft  
**Input**: User description: "Biome Explorer MVP (GitHub issue #4289): a standalone browsable library of curated, real-world biomes with attributed images (mostly AI-generated illustrations, labelled as such, plus licensed photographs where available) and sourced ecology/climate details; side-by-side comparison; plausibility guidance that separates documented tendencies from optional fantasy/sci-fi alterations (with explicit cause-and-effect notes); create/edit custom biome profiles based on a reference and save them as structured vault worldbuilding entities; Markdown copy/export; optional copyable illustration prompt (starting "fantasy, illustration of") and image/reference attachment; works fully without AI; responsive and accessible. Out of scope: hex/map integration and cross-generator enrichment (follow-up #4290), climate simulation, scraping galleries, auto-generated images."

## Context

A worldbuilder on r/worldbuilding asked for "websites for environment / biome inspiration", because image boards are often inaccurate and drawing references takes time. Codex Cryptica can answer two questions at once: **what does this environment look like?** and **why does it look like that, and what can live there?**

**Architecture Update (Public Discovery Pivot)**: The Biome Explorer is deployed as a public discovery surface at `/biomes` under `(marketing)`, accessible without an account or vault. Users browse the curated reference library, compare environments side by side, and customize biomes in an interactive client workbench with structured Markdown copy and download export. In-vault entity persistence was superseded by this standalone public-first model.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and search real-world biomes (Priority: P1)

A writer is picturing a setting but doesn't yet know what it looks like. They open the Biome Explorer from the worldbuilding area and see a short, illustrated set of biome cards (for example temperate woodland, boreal forest, grassland and steppe, hot desert, tundra, wetland, tropical rainforest, coastline). They search or filter by name or by a quality such as "cold" or "wet", and open a card to see a larger picture with a short summary. Deeper details on climate, landscape, plants, animals, resources and hazards are available on demand. Every image shows who made it, where it came from, its licence and a text description.

**Why this priority**: This is the core inspiration job and is useful on its own, with no saving or editing.

**Independent Test**: Open the explorer, search for "desert", open the matching card, and confirm the picture, its attribution, and the ecology and climate details are shown.

**Acceptance Scenarios**:

1. **Given** the explorer is open, **When** the user views the library, **Then** each biome appears as a concise card with an image, a name and a one-line summary.
2. **Given** the library, **When** the user types a search term or applies a filter, **Then** only matching biomes are shown, and a clear "no matches" message with a way to clear the search appears when none match.
3. **Given** a biome card, **When** the user opens its details, **Then** they see climate (temperature, seasonality, precipitation), landscape, typical vegetation, wildlife niches, resources and hazards, with meaningful ranges rather than single numbers.
4. **Given** any image, **When** it is shown, **Then** its alt text and provenance are available to the user: for an AI-generated illustration, a clear "AI illustration" label with the tool and date; for a licensed photograph, its creator, source and licence.
5. **Given** the user has no internet connection, **When** they open the explorer, **Then** the text content is still fully readable and any image that can't load shows a labelled placeholder rather than a broken image.

---

### User Story 2 - Understand why: plausibility and sources (Priority: P1)

A worldbuilder wants their steppe to be believable. In a biome's details they read what conditions produce it (water availability, seasonality, elevation, temperature range), what is typical, and where exceptions occur. Each statement is marked as a **common pattern**, a **simplification** or an **exception**, and the card cites the factual sources used. Nothing is presented as a rigid scientific classification.

**Why this priority**: Believability is the differentiator against image boards. Without it the feature is only a gallery.

**Independent Test**: Open a biome and confirm that conditions, variation, simplifications and exceptions are visibly distinguished and that at least one cited source is listed.

**Acceptance Scenarios**:

1. **Given** a biome's details, **When** the user reads the conditions section, **Then** ranges and variation are shown with elevation, water availability and seasonality where relevant.
2. **Given** the details, **When** a statement is a simplification or has known exceptions, **Then** it is labelled as such and not stated as an absolute rule.
3. **Given** a biome, **When** the user opens its sources, **Then** each factual claim area links to a named reference.
4. **Given** the library overall, **When** the user looks for a classification table or climate picker, **Then** none is presented as authoritative science.

---

### User Story 3 - Compare biomes side by side (Priority: P2)

A user is torn between a boreal forest and a temperate woodland for a region. They select two or three biomes and see them in a comparison view, with the same attributes aligned row by row: temperature and seasonality, precipitation, landscape, vegetation, wildlife niches, resources and hazards.

**Why this priority**: Comparison helps users choose a biome, but browsing (Story 1) is already valuable without it.

**Independent Test**: Select two biomes, open the comparison, and confirm every attribute row shows both biomes' values in the same order.

**Acceptance Scenarios**:

1. **Given** the library, **When** the user selects two or three biomes and opens comparison, **Then** the attributes appear aligned for each.
2. **Given** a comparison, **When** the user removes one biome, **Then** the view updates; with fewer than two left, it prompts the user to add another.
3. **Given** a narrow screen, **When** comparing, **Then** the comparison remains readable without side-to-side page scrolling (for example by stacking attributes).

---

### User Story 4 - Create a custom biome from a reference (Priority: P1)

A user starts from a reference biome and chooses **Make my own**. They adjust climate, terrain, vegetation, water availability and ecological pressures, and name the result. The original reference stays unchanged and visible alongside, and the user's changes are clearly recorded as their own invention.

**Why this priority**: Adaptation is the "adapt for worldbuilding" half of the issue. Together with saving (Story 5) it makes the feature reusable.

**Independent Test**: Start from "tundra", change the vegetation and water availability, give it a name, and confirm the draft shows both the reference values and the user's changes.

**Acceptance Scenarios**:

1. **Given** a reference biome, **When** the user chooses to make their own, **Then** a draft is created with the reference's values prefilled and the reference link retained.
2. **Given** a draft, **When** the user edits any of climate, terrain, vegetation, water availability or ecological pressures, **Then** the edit is shown as a departure from the reference.
3. **Given** a draft, **When** the user starts from nothing instead of a reference, **Then** they can fill the same fields from blank.
4. **Given** a draft with no name, **When** the user tries to save, **Then** they are asked for a name first and nothing is saved.

---

### User Story 5 - Save, reopen, edit and export a biome profile (Priority: P1)

A user saves their custom biome into the vault as a structured worldbuilding profile. They can reopen and edit it later, copy it or export it as Markdown for notes or a document, and reuse it by starting a new biome from it. Reference data and the user's own inventions are kept separate in the saved profile so it is always clear which is which.

**Why this priority**: Without saving, the work is lost, and the issue states a profile must not be "just a disconnected text response."

**Independent Test**: Create and save a custom biome, reload the app, reopen the profile, edit a field, then copy it as Markdown and confirm the output includes both the reference and the user's changes in separate parts.

**Acceptance Scenarios**:

1. **Given** a completed draft, **When** the user saves, **Then** a worldbuilding profile is added to the vault and appears with the user's other vault content.
2. **Given** a saved profile, **When** the user reloads the app and reopens it, **Then** all fields are as saved.
3. **Given** a saved profile, **When** the user edits and saves again, **Then** the changes persist.
4. **Given** a saved profile, **When** the user chooses copy or export as Markdown, **Then** they get readable Markdown with reference-derived and user-invented content under separate headings.
5. **Given** a saved profile, **When** the user chooses to base a new biome on it, **Then** a new draft starts from it without altering the original.
6. **Given** a read-only or unavailable vault, **When** the user tries to save, **Then** they see a clear message and their draft is kept so they can retry or export it.

---

### User Story 6 - Fantasy and sci-fi departures with explicit causes (Priority: P2)

A fantasy author wants a forest where it rains ash, or a desert kept lush by a magical spring. They mark a departure from real-world conditions and must write a short cause-and-effect note (for example "a buried leyline feeds the spring, so a lush belt follows the stream"). The profile separates real-world-grounded conditions from fictional alterations, so the two are never silently mixed.

**Why this priority**: This is key to coherent worldbuilding, but the real-world workflow (Stories 1–5) works without it.

**Independent Test**: Add a fictional alteration to a draft, confirm a cause-and-effect note is required, and confirm the saved profile and Markdown list it apart from the grounded conditions.

**Acceptance Scenarios**:

1. **Given** a draft, **When** the user adds a fictional alteration, **Then** it is flagged as fictional and a cause-and-effect note is requested.
2. **Given** an alteration without a note, **When** the user saves, **Then** they are reminded the note is missing but may choose to save anyway (the note is encouraged, not forced).
3. **Given** a profile with alterations, **When** it is displayed or exported, **Then** fictional alterations appear in their own labelled section, apart from real-world conditions.

---

### User Story 7 - Illustration prompt and reference image (Priority: P3)

A user wants a picture of their custom biome. They copy a ready-made illustration prompt generated from their profile (it starts with "fantasy, illustration of") to use in a tool of their choice, and optionally attach their own image or an external reference link to the profile. No built-in image generation is needed.

**Why this priority**: Nice to have, and independent of the core library and profile.

**Independent Test**: Open a saved profile, copy the prompt and confirm it starts with "fantasy, illustration of" and reflects the profile's contents; attach an image and confirm it is shown on the profile.

**Acceptance Scenarios**:

1. **Given** a profile, **When** the user chooses to copy the illustration prompt, **Then** the prompt starts with "fantasy, illustration of", describes the biome including fictional alterations, and is copied to the clipboard.
2. **Given** a profile, **When** the user attaches an image or reference link, **Then** it is stored with the profile, shown on it and kept distinct from the library's images.
3. **Given** the clipboard is unavailable, **When** the user tries to copy, **Then** the prompt is shown selectable so they can copy it by hand.

---

### Edge Cases

- A search matches nothing, or a filter combination leaves zero biomes: a helpful empty state is shown.
- Two or more profiles have the same name: both are saved and distinguished (for example by the saved date or the reference they came from), without overwriting.
- The reference a profile was based on is later changed or removed from the library: the saved profile keeps its own copy of the values and still opens.
- A user attaches a very large or unsupported image: the user is told the limit or format and the profile is not corrupted.
- The user navigates away from an unsaved draft: they are warned before losing changes.
- A user's inventions contradict the reference (for example "desert with 3000 mm rainfall"): this is allowed and shown as a departure, not blocked, while grounded conditions stay marked as the reference's values.
- AI is disabled, unavailable or blocked by the user's policy: all features work and no AI prompts or notices are shown in the way.
- Guest or shared views of the vault: a visible profile is shared like other worldbuilding content (its name, reference snapshot, own fields, fictional alterations and illustration prompt), but its reference links are never included in guest or published exports. A hidden or draft profile is not shared at all.
- Very long text in fields: content wraps and stays readable without breaking layout.

## Requirements _(mandatory)_

### Functional Requirements

**Library and discovery**

- **FR-001**: The system MUST provide a Biome Explorer with a clear entry point in the worldbuilding or exploration area, separate from the random generators.
- **FR-002**: The system MUST include a curated catalogue of real-world biomes, covering at least temperate woodland, boreal forest, grassland or steppe, hot desert, tundra, wetland, tropical rainforest and coastline.
- **FR-003**: Users MUST be able to search the catalogue by text and filter it by at least one climate-related quality.
- **FR-004**: Each biome MUST first appear as a concise illustrated card, with deeper details (climate, landscape, vegetation, wildlife niches, resources, hazards) available on demand.
- **FR-005**: The catalogue and its text MUST be available with no AI and no account, and the text MUST be readable offline.

**Images and provenance**

- **FR-006**: Every library image MUST show alt text and provenance to the user. A licensed photograph shows creator, source and licence. An AI-generated illustration shows an "AI illustration" label with the tool used and the date it was made.
- **FR-007**: The catalogue MUST only use images the product has the right to display: either illustrations the team generated ahead of time and reviewed, or photographs under permissive licences. It MUST NOT use images scraped from third-party galleries or boards, and MUST NOT present an AI-generated image as a photograph.
- **FR-008**: Every AI-generated image MUST be labelled as an illustration in the interface, and each one MUST have been checked by a person for ecological plausibility (the plants, animals and landforms it shows match the biome's own description) before it ships.
- **FR-008a**: Every biome MUST have at least one AI-generated illustration as its main image. Licensed photographs MAY be added as secondary images where a good one exists.
- **FR-009**: If an image can't load, the system MUST show a labelled placeholder that keeps the card usable.

**Plausibility and sources**

- **FR-010**: Each biome MUST describe its conditions (temperature, seasonality, precipitation, elevation range, water availability) as ranges or variation rather than a single value.
- **FR-011**: The system MUST distinguish common patterns, simplifications and exceptions in a biome's description.
- **FR-012**: Each biome MUST cite the factual references it was based on.
- **FR-013**: The system MUST NOT present the catalogue as a scientific classification system, nor offer a climate picker or fixed rainfall matrix as a source of truth.

**Comparison**

- **FR-014**: Users MUST be able to compare two to three biomes, with the same attributes aligned in the same order.
- **FR-015**: The comparison view MUST remain readable on small screens.

**Custom biome profiles**

- **FR-016**: Users MUST be able to create a custom biome from a reference biome or from blank.
- **FR-017**: Users MUST be able to edit climate, terrain, vegetation, water availability and ecological pressures in a custom biome.
- **FR-018**: The system MUST keep reference-derived content and user-invented content separate, and show edits as departures from the reference.
- **FR-019**: The system MUST support fictional alterations (fantasy or science-fiction), flag them as fictional, and request an explicit cause-and-effect note for each, without blocking the save if it's empty.
- **FR-020**: The system MUST never silently mix fictional alterations into the real-world conditions.

**Saving and reuse**

- **FR-021**: Users MUST be able to save a custom biome to the vault as a structured worldbuilding profile that behaves like other vault content (listed, reopened, edited, deleted).
- **FR-022**: Saved profiles MUST persist across reloads and keep their own copy of the reference values they were based on.
- **FR-023**: Users MUST be able to edit a saved profile, and to start a new profile based on it without changing the original.
- **FR-024**: Users MUST be able to copy or export a profile as Markdown that keeps reference-derived content, user inventions and fictional alterations in separate labelled parts.
- **FR-025**: The system MUST protect unsaved drafts: warn before discarding, and retain the draft if saving fails.

**Illustration prompt and attachments**

- **FR-026**: Users MUST be able to copy an illustration prompt generated from a profile; it MUST begin with "fantasy, illustration of" and reflect any fictional alterations.
- **FR-027**: Users MUST be able to attach an image or external reference link to a profile, kept distinct from library images and their provenance.
- **FR-028**: Image generation MUST NOT be required for any feature, and when optional AI help is offered it MUST be clearly optional and respect the user's AI settings.

**Quality and boundaries**

- **FR-029**: All screens MUST work on small and large screens and be fully usable by keyboard and screen reader, including descriptive labels for images and comparison tables.
- **FR-030**: The feature MUST ship with Help content explaining how to find and use it, and its limits (not a climate simulator, real-world references versus fictional alterations).
- **FR-031**: Existing maps, hex-crawl features and generators MUST work unchanged whether or not the Biome Explorer is present, and the explorer MUST NOT change any map or hex data.
- **FR-032**: Profiles saved by users MUST remain private to the vault by default (a new profile is never published or shared until the user chooses to) and follow the same sharing and export rules as other vault content, except that a profile's reference links are never included in guest or published exports.

### Key Entities _(include if feature involves data)_

- **Reference Biome**: A curated, read-only real-world biome. It holds a name, summary, climate ranges, landscape, vegetation, wildlife niches, resources, hazards, labelled patterns/simplifications/exceptions, cited sources and one or more images with provenance.
- **Image Reference**: A picture or illustration shown for a biome. It holds alt text and either generation details (tool, date, the description used, and who reviewed it) for an AI illustration, or creator, source and licence for a photograph.
- **Source Citation**: A named factual reference that supports a biome's statements.
- **Biome Profile**: The user's saved worldbuilding record. It holds a name, an optional link to the reference it came from, a snapshot of the reference values, the user's own edits (climate, terrain, vegetation, water availability, ecological pressures), a list of fictional alterations, an optional illustration prompt and optional attachments.
- **Fictional Alteration**: A deliberate departure from real-world conditions, with a description and a cause-and-effect note.
- **User Attachment**: An image or external link the user adds to a profile, separate from library images.

## Assumptions

- The MVP library contains a manageable curated range of about eight to twelve biomes, which may grow later. The exact list is a content decision for planning and is not fixed by this spec.
- Library images are mostly illustrations the team generates ahead of time with an AI image tool (one main image per biome, in one consistent style), each checked by a person for ecological plausibility. Licensed photographs (public-domain or Creative Commons) are added as secondary images where a good one exists. Provenance is documented per image. Hosting follows the project's rule that image assets live in the project's asset storage, not in the repository. Generating these images is a team task done before release; the app itself never generates catalogue images.
- The image tool's terms must allow commercial use of its output, and this is confirmed before the images ship.
- Biome Profiles are stored as an ordinary kind of vault worldbuilding entity, so they inherit existing search, linking, backup, sync and export behaviour. This is a requirement-level assumption, not a technical design.
- Profiles are single-vault content; moving them between vaults uses the existing vault import and export.
- "Common patterns, simplifications and exceptions" labelling is part of the curated content, not computed.
- Biome Explorer needs no account and no network beyond loading library images.
- Links to the settlement and worldbuilding guidance already on the site are offered as helpful pointers within a biome's details, and the explorer does not become an answer page.
- Map, hex and generator integration, and any biome-aware creature or settlement generation, are out of scope here and belong to follow-up #4290.

## Terminology

User-facing wording is **Biome Explorer** (the tool), **reference biomes** (the library), **My biomes** (saved items), **Make my own** (the action) and **fictional changes** (the alterations). "Profile" is used only in this document and in code for the saved record.

## Out of Scope

- Global climate simulation, planet-scale or automated biome maps, and procedural terrain rendering.
- Scraping third-party galleries or boards.
- Generating library images inside the app, on demand or per user. (The team's ahead-of-time illustrations are in scope; see Assumptions.)
- Hex or map integration, terrain classification on hexes, and cross-generator enrichment (follow-up #4290).
- Treating the catalogue as a formal scientific biome classification.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user can find and open a biome matching a quality they have in mind (for example "cold and dry") in under 30 seconds.
- **SC-002**: A user can go from opening the explorer to a saved custom biome profile in under 5 minutes.
- **SC-003**: 100% of library images show alt text and complete provenance, 100% of AI-generated images carry the "AI illustration" label and a recorded human review, and 100% of biomes list at least one cited source.
- **SC-004**: 100% of fictional alterations in saved and exported profiles appear apart from the real-world conditions, and no exported Markdown mixes them.
- **SC-005**: A saved profile is unchanged after a reload and a full round trip through edit, save and export; in testing, no data is lost across 20 such round trips.
- **SC-006**: Every function (browse, compare, create, save, export, copy prompt) can be completed by keyboard alone and is correctly announced by a screen reader, with no horizontal page scrolling at phone width.
- **SC-007**: With AI disabled and the network offline, all text-based functions still work and the user sees no errors.
- **SC-008**: Maps, hex-crawl features and generators behave identically before and after the feature is introduced, as verified by their existing tests passing unchanged.
- **SC-009**: In a short test with worldbuilders, at least 80% say the explorer helped them move from visual inspiration to a coherent environment profile faster than image boards or drawing references.
