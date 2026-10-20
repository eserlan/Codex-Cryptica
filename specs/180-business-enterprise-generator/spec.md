# Feature Specification: Business / Enterprise Generator

**Feature Branch**: `180-business-enterprise-generator`  
**Created**: 2026-10-20  
**Status**: Draft  
**Input**: User description: "Add a Business / Enterprise Generator (#3627) for one specific commercial organisation the PCs can visit, own, work for, compete with, investigate, protect, exploit or become entangled with. Distinct from the Social Hub / Tavern generator (a place where people gather), the Settlement Economy generator (#3559, settlement-scale trade) and the Faction generator (goals and power). It answers: what does this business do, who runs it, who depends on it, what pressures is it under, and how does it create play? Not a shop inventory generator. Optional 'Players own this business' mode aligned with #3622: the business should generate adventures, not replace adventuring."

## Clarifications

### Session 2026-10-20

- Q: What gets created when a business is saved? → A: A Faction entity for the business, plus the owner and key staff as Character entities the user can untick, connected with _owned by_ and _employs_.
- Q: Where can the generator be opened from in this release? → A: The generator hub and public page, plus "Generate a business here" from a Location, Character or Faction entity, pre-filling context. Generator-to-generator hand-offs come later.
- Q: When a business is saved, what happens to the outside parties it names (competitor, supplier, patron, regulator and so on)? → A: Each one whose name matches an existing vault entity is offered as a link to that entity. Each one with no match is offered as a new Faction or Character, unticked by default.
- Q: When Players own this business is on, who fills the Owner / leadership section? → A: A manager or steward the party employs (goal, style, pressure), saved with _employs_. No owner is generated and no _owned by_ link is created.
- Q: When the user regenerates the owner or a staff member, what happens to other sections that mention that person by name? → A: The old name is replaced with the new one wherever else it appears; nothing else in those sections changes.
- Q: Should GMs be able to edit a business's section text inside the generator before saving? → A: No. Inside the generator they refine with regenerate and an optional steer; section text is edited after saving, in the entity editor as usual. The review keeps today's editable title, type and labels.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a playable business (Priority: P1)

A Game Master opens the Business Generator, inside their campaign or on the public page, picks a genre, a business type and a few light options (scale, legitimacy, wealth, clientele, location, tone, optional campaign context) and gets one business presented as a living organisation: who runs it, who works there, who buys from it, what it depends on, who it competes with, what it is known for, and the pressure, secret, opportunity, complication and hooks that bring the party in.

**Why this priority**: This is the whole job of the generator. Without it nothing else matters.

**Independent Test**: Generate a business with AI off and with AI on, in at least three genres, and check that every required section is present, that the business type fits the genre, and that the hooks arise from the business's own pressure, dependency, asset, relationships or secret.

**Acceptance Scenarios**:

1. **Given** a user with AI off (or AI Disabled in settings), **When** they press Generate, **Then** a complete business with every required section appears immediately from local tables.
2. **Given** a user with AI available, **When** they press Generate, **Then** the business is written by AI with visible progress, and if AI fails or returns something unusable the user still gets a complete business from local tables, with a short note saying so.
3. **Given** the genre is cyberpunk, **When** the user opens the business type list, **Then** it offers cyberpunk businesses (ripper clinic, fixer front, noodle bar and so on), not reskinned fantasy shops.
4. **Given** any generated business, **When** the user reads the hooks, **Then** each of the 2 to 3 hooks names something already established in that business (its pressure, a dependency, its asset, a relationship, a staff member or its secret).
5. **Given** the user typed campaign context, **When** they generate, **Then** names, people and pressures reflect that context.

---

### User Story 2 - Players own this business (Priority: P2)

A GM whose party has bought, inherited or founded a business turns on **Players own this business** and gets an extra management section: starting strengths, liabilities, upgrade paths, recurring obligations and what success attracts. All of it is written as sources of adventure rather than bookkeeping.

**Why this priority**: Owning a base or business is a common campaign pattern (#3622). It adds clear value on top of the core output but isn't needed for it.

**Independent Test**: Generate the same business type with the toggle off and on. Only the "on" result has the management section, and none of it asks the GM to track numbers or ledgers.

**Acceptance Scenarios**:

1. **Given** the toggle is on, **When** the business is generated, **Then** the leadership section names a manager the party employs, not an owner, and the output adds 2 to 3 starting strengths, 2 to 3 liabilities, concrete upgrade paths, abstract recurring obligations and at least one thing that success attracts.
2. **Given** the toggle is on, **When** the user reads recurring obligations, **Then** they are named obligations (payroll, rent, guild dues, debt) with no prices, ledgers or turn-by-turn accounting.
3. **Given** the toggle is on, **When** the user saves, **Then** the manager is saved with _employs_ and no _owned by_ connection is created.
4. **Given** the toggle is off, **Then** no management section appears.

---

### User Story 3 - Refine one part without losing the rest (Priority: P2)

The GM likes the business but wants a different owner, a nastier pressure or another hook. They regenerate just that section, optionally with a short steer, and everything else stays put.

**Why this priority**: Multi-section outputs are rarely right first time. Rerolling everything to fix one part throws away good work. Section text isn't edited inside the generator. That happens after saving, in the entity editor.

**Independent Test**: Generate a business, regenerate the current pressure with a steer, and check that only the pressure changes and that it still fits the existing owner, staff and relationships.

**Acceptance Scenarios**:

1. **Given** a generated business, **When** the user regenerates one section, **Then** only that section changes.
2. **Given** the owner is named in a hook and the secret, **When** the user regenerates the owner and gets a new name, **Then** the hook and the secret now use the new name, and their other wording is unchanged.
3. **Given** AI is unavailable, **When** the user regenerates a section, **Then** it is rerolled from local tables.

---

### User Story 4 - Save the business into the campaign (Priority: P2)

The GM saves the business to their vault so it can sit on the graph next to the settlement, factions and NPCs it touches, and grow over time.

**Why this priority**: The issue asks for relationships to be "potential graph connections in CC rather than isolated flavour text". Saving is what turns a roll into campaign material.

**Independent Test**: Save a generated business and check what entities and connections are created, and that nothing is written to existing entities without the user approving it.

**Acceptance Scenarios**:

1. **Given** a generated business, **When** the user saves it, **Then** the vault gets a Faction entity for the business and a Character entity for the owner and each key staff member the user left ticked, connected with _owned by_ and _employs_, plus any other relationships using the labels in FR-011.
2. **Given** the generator was opened from an existing vault entity (a Location, including a settlement, a Faction or a Character), **When** the user saves, **Then** a connection to that entity is proposed and only written if the user keeps it.
3. **Given** the business names a competitor that already exists in the vault, **When** the user opens the in-app save step, **Then** a _competes with_ link to that existing entity is offered and ticked, and no duplicate is created.
4. **Given** the business names a supplier with no match in the vault, **When** the user opens the in-app save step, **Then** creating it as a new Faction is offered but unticked, and if left unticked it stays in the text only.
5. **Given** the save is cancelled or fails part way, **Then** no half-saved business or dangling connection is left in the vault.

---

### User Story 5 - Find it from search and from other tools (Priority: P3)

A GM searching for a business, shop or enterprise generator for their RPG lands on the public `/generators/business` page, generates one without an account, and can reach it from `/generators`, genre hubs and `/tools`, as well as from the "players own a business" answer page.

**Why this priority**: It brings in search traffic and connects the existing answers on owning a business to a tool, but the generator is useful without it.

**Independent Test**: Visit `/generators/business` logged out, generate a business, and run the discovery audit with zero errors.

**Acceptance Scenarios**:

1. **Given** a logged-out visitor on `/generators/business`, **When** the page loads, **Then** they can generate a business with local tables and see how it differs from the tavern generator.
2. **Given** the discovery registry, **When** the audit runs, **Then** the new page owns its intent without colliding with `/generators/tavern` or `/generators/social-hub`.

### Edge Cases

- **Criminal by default**: Not every secret makes the business a front. With legitimacy set to fully legitimate, the secret must not reveal that the business is secretly criminal.
- **Genre mismatch**: A user picks a business type from one genre then switches genre. The type list resets to that genre's types instead of keeping an out-of-genre type.
- **Inventory creep**: The output names what the business sells or provides in a few lines. It does not list stock, prices or item tables unless the type genuinely needs a short list (for example an apothecary's notable remedies).
- **Tiny scale**: A one-person stall gets zero to one staff and a scale-appropriate pressure. It is not padded to the usual roster.
- **Hooks that don't connect**: If an AI hook doesn't reference anything established in the business, it is replaced with a local hook built from the business's own pressure or dependency.
- **Name collisions**: If the business, owner or staff name matches an existing vault entity on save, the user is told and can rename or keep it, rather than getting a silent duplicate.
- **Long free text**: Very long campaign context is trimmed to the generator's existing context limit, and the user isn't shown an error.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a Business / Enterprise Generator both as an in-app campaign generator and as a public, no-login tool at `/generators/business`.
- **FR-002**: Inputs MUST be light. Only genre and business type are required; every other input has a sensible default:
  - Genre / setting (the canonical themes plus custom)
  - Business type, filtered by genre on the public page (the in-app generator uses a free-text field with a hint, a deliberate deviation recorded here), including at least the types listed in #3627 for fantasy, sci-fi / space opera and cyberpunk, and genre-appropriate types for modern, horror, western and pirate
  - Scale: tiny, small, established, regional, major
  - Legitimacy: fully legitimate, grey market, criminal front, mixed
  - Wealth / resources
  - Clientele
  - Location / settlement context
  - Tone
  - Optional free-text campaign context
  - Optional toggle: **Players own this business**
- **FR-003**: Every generated business MUST include these sections:
  1. **Name and identity**: name, type, short description and reputation, what makes it distinctive.
  2. **What it actually does**: what it sells, makes or provides; who pays; why it exists here; its main source of income; how it earns and whether it owns what it handles or only carries or arranges it for others; how big it is in plain words; and how it is doing financially right now.
  3. **Owner / leadership**: name, goal, management style, and one personal pressure or vulnerability. When the players own the business, this is a manager or steward the party employs instead (see FR-004).
  4. **Key staff**: a small set sized by scale (tiny 0 to 1, small 1 to 2, established 2 to 3, regional and major 3 to 4), each with a role and one trait that matters in play.
  5. **Clientele**: typical, valuable, and undesirable or dangerous customers, plus anyone excluded.
  6. **Suppliers and dependencies**: at least one critical dependency and what happens if it fails.
  7. **Competitors and relationships**: at least one named relationship (competitor, supplier, patron, regulator, criminal group, neighbour or faction).
  8. **Reputation**: how it is seen, and at least one practical consequence of that.
  9. **Current pressure**: one active pressure that materially affects the business.
  10. **Unusual asset**: one distinctive advantage.
  11. **Secret**: one secret that matters in play.
  12. **Opportunity**: one opportunity the business could take if someone acts on it.
  13. **Complication**: one immediate problem that invites the party in.
  14. **Adventure hooks**: 2 to 3 hooks, each tied to something established in sections 3 to 13.
- **FR-004**: When **Players own this business** is on, section 3 MUST describe a manager or steward the party employs rather than an owner, and the output MUST add a management section with 2 to 3 starting strengths, 2 to 3 liabilities, concrete upgrade paths, abstract recurring obligations (named, never costed) and what success attracts. When it is off, that section MUST NOT appear.
- **FR-005**: Local generation MUST produce a complete business, covering every section in FR-003 (and FR-004 when on), for every supported genre and business type with no network access.
- **FR-006**: AI generation MUST be the prominent default when AI is available. It MUST show progress while it runs, and when a part fails or is unusable, fall back to local content for only the sections that part covers, never the whole business. The user MUST be told which sections came from local tables.
- **FR-007**: Deterministic checks MUST run on every result, local or AI:
  - every required section is present and non-empty
  - each hook references something established in the business
  - a fully legitimate business's secret doesn't reveal it as criminal
  - staff count fits the scale
  - no section is a stock list or price table

  A result that fails a check is repaired or has that section replaced from local tables.

- **FR-008**: Users MUST be able to regenerate any single section, with an optional short steer. Other sections MUST stay unchanged, with one exception: when the owner, manager or a staff member is regenerated with a new name, the old name MUST be replaced with the new one wherever else it appears, and nothing else in those sections changes.
- **FR-009**: When the generator is opened from an existing vault entity, it MUST pre-fill genre, location and campaign context from that entity and its close connections where available.
- **FR-010**: Saving MUST create one Faction entity for the business, holding every section's text, and one Character entity each for the owner and every key staff member the user left ticked (all ticked by default). The business connects to the owner with _owned by_ and to each staff member with _employs_. When the players own the business, the manager is connected with _employs_, and no _owned by_ link is created. Unticked people stay in the business's text only. Graph writes MUST follow the existing approval flow: a link to an existing entity is only written if the user keeps it.
- **FR-011**: Connections created on save MUST use plain relationship labels from this set: owned by, employs, supplied by, serves, competes with, regulated by, owes, protected by, located in, contracted by.
- **FR-012**: The generator MUST be reachable from the in-app generator hub, the public page, and a "Generate a business here" action on Location, Character and Faction entities, which pre-fills context per FR-009 and proposes a link back to that entity (_located in_ for a Location, _owned by_ for a Character, _protected by_ or _contracted by_ for a Faction, chosen by the user). Hand-offs from the Settlement and Social Hub generators are out of scope for this release.
- **FR-013**: The public page MUST be registered in the discovery intent registry before it is built, cross-link to the existing answers on owning a business and turning economic pressure into hooks, and explain how it differs from the tavern / social hub generator.
- **FR-014**: When AI Disabled is on, AI controls MUST be hidden and local generation used, as with every other generator.
- **FR-015**: In the in-app save step, every outside party named in the business's relationships (competitor, supplier, patron, regulator, criminal group, neighbour, faction) MUST be shown in the save step:
  - If its name matches an existing vault entity, the save step offers a link to that entity with the relationship's label. The link is ticked by default.
  - If there is no match, the save step offers to create it as a new Faction (organisations) or Character (individuals) with that link. The new entity is unticked by default.
  - Unticked parties stay in the business's text only. Nothing is written to an existing entity except the new connection.
  - The public page has no vault to match against. Its save hands the business and the ticked people to the app, and outside parties stay in the business's text.
- **FR-019**: The size line in operations MUST agree with the key-staff roster: a business with no key staff MUST NOT claim a regular workforce, and one with staff MUST NOT say it has none. A contradiction in AI output is retried once and otherwise the size line is rewritten from the tables; local size wording is chosen by scale.
- **FR-020**: The AI is asked to make the distinctive feature matter in at least one of the pressure, asset, opportunity, complication or hooks, and to keep the complication a different problem from the pressure. This is a prompt instruction, not a hard check.
- **FR-016**: Every stage after the first MUST be given the business so far as fixed facts: its name, type, leader, staff and, once known, its parties. A stage that fell back to the tables is described by what is actually in the document. Later stages MUST NOT rename the business or introduce named people who are not in those facts.
- **FR-017**: A name that appears in the text without being introduced as the business, a person or a party MUST cause one retry of the stage that wrote it. If it survives, the result MUST list it as a warning shown to the GM.
- **FR-018**: A relationship's graph label MUST truly describe its kind of party: a rival competes with the business, a supplier supplies it, a regulator regulates it, a criminal group owes, protects, supplies or is served by it, and a neighbour is never described as the place the business is located in. A label that does not fit MUST be rejected and replaced by the kind's default.
- **FR-021**: A wrong staff count, a size line that contradicts the roster, or a missing operations or clientele field in the AI's identity stage MUST NOT discard the stage. The reply is kept, asked about once, and then repaired in place (roster fitted to the scale, size line rewritten, only the missing fields taken from the tables and listed as fallback). Only a reply with no usable business name, description or leader falls back whole.
- **FR-022**: In the AI's last stage the unusual asset MUST develop the distinctive feature (a second asset may be added, never substituted), and every adventure hook MUST be written for the player characters. Both are checked, asked about once, and then accepted. Two people sharing a surname MUST be said to be related, or are asked about once.
- **FR-023**: The AI is told not to default to debt, a rival and an inspection; the trouble should fit the business's wealth and legitimacy.

### Key Entities

- **Business**: the generated organisation. It has name, type, genre, scale, legitimacy, identity, what it does, reputation, current pressure, unusual asset, secret, opportunity, complication and hooks, plus an optional management section.
- **Business Person**: the owner (or, when the players own the business, the manager) or a key staff member, with a name, role, a goal or trait, and an optional pressure.
- **Business Relationship**: a named outside party (competitor, supplier, patron, regulator and so on) with a relationship label from FR-011, a short reason it matters, whether it is an organisation or an individual, and, on save, either a matched vault entity or none.
- **Dependency**: an external input the business relies on, with what happens if it fails.
- **Management Section**: strengths, liabilities, upgrade paths, obligations and what success attracts. It is present only when the players own the business.

## Assumptions

- The public URL is `/generators/business`. The final slug and title are settled against the discovery registry during planning.
- Section regeneration follows the same pattern as other multi-section generators in the app. The draft review keeps its existing editable title, type and labels; section text is edited after saving.
- No new storage format: a saved business uses the existing vault entities and connections.
- Building the Settlement Economy generator (#3559) and hand-offs from the Settlement and Social Hub generators are out of scope for this release. If it exists by the time this ships, a link to it is welcome but not required.
- Money is never simulated. Obligations and upgrades are named and described, never priced.
- The business type list per genre is a curated table. Users can also type a custom business type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Across every supported genre and business type, 100% of local results contain every required section (and the management section exactly when the toggle is on).
- **SC-002**: 100% of results, local or AI, pass the checks in FR-007 after repair: each hook ties back to the business, legitimate businesses aren't revealed as criminal, and staff count fits the scale.
- **SC-003**: Local generation on the public page shows a full business in under 200 ms.
- **SC-004**: A GM can go from opening the generator to a saved business on their graph in under 1 minute and 4 clicks with default inputs.
- **SC-005**: In 100% of cases, regenerating one section changes that section and no other. The only exception is a person's old name, which is replaced with the new one elsewhere.
- **SC-006**: The public page passes the discovery audit with 0 errors and is reachable in 1 click from `/generators`, genre hubs and `/tools`.
