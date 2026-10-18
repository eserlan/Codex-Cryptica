# Feature Specification: Entity Template Marketplace

**Feature Branch**: `168-entity-template-marketplace`  
**Created**: 2026-09-29  
**Status**: Draft  
**Input**: GitHub issue #3548 — Share entity templates through the template marketplace (follow-up to #3445 / spec 167, builds on spec 150)

## Clarifications

### Session 2026-09-29

- Q: Shared directory or separate pages for entity and stat sheet templates? → A: One template directory with a template-kind filter (Entity templates / Stat sheet templates). Entity templates are additionally filterable by entity type and by genre/system. Nothing about the existing stat sheet listings changes.
- Q: Moderation and reporting policy for public entity templates? → A: Same policy as stat sheet listings (spec 150): basic reporting, owner takedown and operator-authenticated admin takedown, with no mandatory pre-approval and no automated moderation.
- Q: Licensing and attribution wording? → A: Publishing requires an explicit acknowledgment that the creator has the right to share the template and allows others to copy, use and adapt it in their own vaults. No licence picker in the first release. Attribution is an optional public display name.
- Q: How are publish credentials handled? → A: Each listing has its own listing identity and owner token, exactly as for stat sheet templates. No accounts.
- Q: How does a local template stay linked to its published listing? → A: The listing identity and owner token are remembered on this device, tied to the vault template. Update and Unpublish appear on that template; recovery after clearing browser data is by entering the saved token, which also relinks the template.
- Q: Which entity types can a listing use? → A: Any entity type, including custom categories. The entity type filter lists the built-in types first, then any other types found in listings.
- Q: Who can report a listing, and how is abuse limited? → A: Anyone can report. Each device is limited to one report per listing and to a capped number of reports overall. The operator sees each report's reason and a per-listing report count.
- Q: Can a taken-down listing come back? → A: An owner's own unpublish is reversible: the owner can republish to the same listing with the token. An operator takedown is final: the listing stays hidden and the owner token cannot restore it.
- Q: What limits apply to published content? → A: Template body up to 50,000 characters (same as spec 167); name up to 80 characters; description up to 500; up to 8 genre/system labels of up to 30 characters each. The publish form shows live counters.
- Q: Can an owner erase a published template permanently? → A: Yes. Besides reversible unpublish, the owner can permanently delete a listing with the owner token, at any time, unless the operator has removed it. Delete removes the listing and its template text from public storage.
- Q: What are the report caps, and what is a "device"? → A: A device is identified by its network address. Each device may send at most 5 reports per minute and 20 per day, plus one report per listing.
- Q: Are individual listings search-engine indexable pages? → A: Not by default. The directory is governed by the discovery intent registry (Constitution XIII); individual community listings are not registered as indexable discovery pages and are excluded from indexing unless a later registry entry says otherwise.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and filter community entity templates (Priority: P1)

A world-builder opens the template directory, switches to Entity templates, and browses what the community has shared. They narrow the list to Factions, then to a system such as "Pathfinder" or a genre such as "Dark fantasy", and search by keyword. Each card shows enough to decide whether it is worth opening.

**Why this priority**: Discovery is what makes sharing worthwhile for people who did not write the templates.

**Independent Test**: Seed the directory with entity templates of several types and genres, browse, filter by entity type and genre/system, search by keyword, and verify only matching public summaries appear and that stat sheet listings are unaffected.

**Acceptance Scenarios**:

1. **Given** published entity templates exist, **When** a user opens the directory and chooses Entity templates, **Then** they see a paginated list of cards showing name, description, entity type, genre/system labels, creator display name when provided, and when it was last updated.
2. **Given** the user selects an entity type, a genre/system, or both, **When** the filter applies, **Then** only matching listings remain and the active filters stay visible and clearable.
3. **Given** the user enters a search term, **When** the search applies, **Then** results match name, description, entity type or labels without needing an exact phrase.
4. **Given** no listings match, **When** search or filters complete, **Then** a clear empty state appears and the user's query and filters are preserved.
5. **Given** the user switches between Entity templates and Stat sheet templates, **When** the view changes, **Then** each kind shows only its own listings and filters.
6. **Given** one listing is malformed or unavailable, **When** the directory loads, **Then** it is skipped or shown as unavailable without blocking the others.

---

### User Story 2 - Preview and install a community template (Priority: P1)

A user opens a listing, reads its description, and previews the note a new entity would start with. They choose Install, and it is added to their vault as a normal user template, ready to be set as a default or used like any other.

**Why this priority**: Installing turns discovery into value while keeping the local-first model.

**Independent Test**: Preview a listing, install it into a test vault, confirm it appears in the vault's Entity Templates list as a user template with identical text, and confirm no existing entity or default changed.

**Acceptance Scenarios**:

1. **Given** a valid listing, **When** the user opens its detail view, **Then** they see the full description, entity type, labels, attribution, and a preview of the note the template produces.
2. **Given** the user chooses Install, **When** installation completes, **Then** the template is saved in the vault as an ordinary user template that can be edited, duplicated, exported, deleted or made the default.
3. **Given** a template was installed, **When** installation completes, **Then** the vault's current default for that entity type is unchanged and existing entities are unchanged.
4. **Given** the vault already has a template with the same name, **When** the user installs, **Then** they can choose a different name or cancel, and the existing template is never overwritten.
5. **Given** a listing fails validation, has an unsupported package version, or cannot be downloaded, **When** the user installs, **Then** they see a plain-language explanation and nothing is saved.
6. **Given** a template was installed, **When** the original creator later updates or unpublishes the listing, **Then** the installed copy is not changed.
7. **Given** a guest or read-only vault, **When** the user views a listing, **Then** they can preview it but Install is unavailable with an explanation.

---

### User Story 3 - Publish my own entity template (Priority: P1)

A user has a template they are proud of. From the Entity Templates list they choose Publish, add a description and genre/system labels, optionally a display name, review exactly what will be shared, confirm they are happy for it to be public, and publish. They are shown their owner token to keep.

**Why this priority**: Publishing creates the supply the directory depends on.

**Independent Test**: Publish a user template with metadata, verify it appears in the directory with the right kind, type and labels, and that only the template package and listing metadata were shared.

**Acceptance Scenarios**:

1. **Given** a user template, **When** the user starts publishing, **Then** they see a preview of exactly the template package and public metadata that will be shared.
2. **Given** a name, description, entity type and at least one genre/system label, plus the sharing acknowledgment, **When** the user publishes, **Then** a public listing is created and a success message and owner token with copy/export controls are shown.
3. **Given** a built-in template, **When** the user wants to publish it, **Then** Publish is not offered for it directly; they duplicate it first so the published text is their own.
4. **Given** a legacy file template, **When** the user wants to publish it, **Then** they duplicate it first, as for built-ins.
5. **Given** the template body contains text the user would not want public, **When** the preview is shown, **Then** the full body is visible so they can catch it before publishing.
6. **Given** a published listing, **When** the owner edits the metadata or replaces the template text, **Then** the same listing updates with no duplicate.
7. **Given** a published listing, **When** the owner unpublishes it, **Then** it disappears from browse and search while their local template stays.
8. **Given** the user cleared their browser data, **When** they enter the saved owner token, **Then** they regain edit and unpublish controls for that listing and the matching local template is relinked to it.
9. **Given** a template that is already published from this device, **When** the user opens its actions, **Then** Update and Unpublish are offered instead of Publish.
10. **Given** the same vault is opened on another device, **When** the user views the template, **Then** it shows as unpublished there until the owner token is entered, and the token is never part of a file export or the vault.
11. **Given** a published or unpublished listing the owner controls, **When** they choose Delete permanently and confirm, **Then** the listing and its template text are removed from public storage, the device link and saved token are cleared, the local template is unchanged, and the token no longer works.
12. **Given** the owner confirms permanent deletion, **When** the request fails, **Then** nothing is cleared locally and the owner can retry.

---

### User Story 4 - Report and take down unsuitable listings (Priority: P2)

A user sees a listing that is inappropriate or copied without permission and reports it. The owner can take down their own listings, and the operator can take down any listing.

**Why this priority**: Public sharing needs a lightweight safety valve, but it does not have to block the first useful slice.

**Independent Test**: Report a listing, confirm the report is recorded and the reporter sees a confirmation; take a listing down as owner and as operator and confirm it disappears from browse.

**Acceptance Scenarios**:

1. **Given** a listing detail view, **When** the user chooses Report and selects a reason, **Then** the report is recorded and they see a confirmation.
2. **Given** the owner takes down a listing, **When** the action completes, **Then** it no longer appears in browse, search or detail.
3. **Given** the operator takes down a listing through the admin control, **When** the action completes, **Then** the same happens without needing the owner token.
   - The owner cannot restore an operator-removed listing with the token; they see a plain-language message saying it was removed by the operator, and can publish the template again as a new listing.
   - An owner who unpublished their own listing can republish it to the same listing with the token.
4. **Given** the report action fails, **When** the user retries, **Then** no duplicate report is created for the same attempt.
5. **Given** a user has already reported a listing from this device, **When** they try to report it again, **Then** they are told it was already reported and no second report is recorded.
6. **Given** a device has sent the maximum number of reports allowed in a period, **When** it tries to send another, **Then** the user sees a plain-language "try again later" message and nothing is recorded.
7. **Given** several reports exist for one listing, **When** the operator reviews them, **Then** each report's reason and the total count per listing are visible.

---

### User Story 5 - Explains itself and stays discoverable-by-design (Priority: P3)

A first-time user finds plain-language help that says what publishing shares, how to unpublish, and that installed templates are independent local copies. Public pages follow the project's discovery rules.

**Why this priority**: Trust and governance matter, but they build on the flows above.

**Independent Test**: Open the help from the publish and install flows and check its content; run the discovery audit and confirm it passes with the new public surface registered.

**Acceptance Scenarios**:

1. **Given** the publish or install flow, **When** the user opens help, **Then** it explains what is shared, how to unpublish, and that installs are independent copies.
2. **Given** the directory now lists entity templates, **When** the discovery audit runs, **Then** it reports no errors and no new governed discovery route appears, because the feature adds no indexable discovery page.
3. **Given** an individual community listing page, **When** a search engine requests it, **Then** it is not offered for indexing.

---

### Edge Cases

- A creator tries to publish an empty template, a template with an over-long body, or metadata over the allowed limits: publishing is blocked with a plain-language explanation of what to fix. An empty body is not publishable because there is nothing to share.
- The genre/system label is a homebrew or unknown value: allowed as free text; keyword search still finds it.
- Two creators publish templates with the same name: both remain distinct, identified by listing identity.
- A listing is unpublished while someone is viewing or installing it: they see a recoverable "no longer available" message and nothing partial is saved.
- Network loss during browse, publish or install: local templates stay unchanged and the user can retry.
- A listing uses a newer package version than this app understands: install is refused with an "update the app" style message; older supported versions are migrated before saving.
- A listing's entity type is a custom category this vault does not have: the install still works and the template appears under that type, and the user is told the vault has no such category yet.
- Publishing the same template twice: the user is offered to update the existing listing rather than create a second one.
- A stat sheet listing is opened through an entity-template link or vice versa: the app shows the right kind or a clear "not found".
- The owner deletes a listing while someone is viewing or installing it: the viewer sees the recoverable "no longer available" message and nothing partial is saved.
- Someone else's listing is taken down by the operator while the owner tries to delete it: the owner sees that it was removed by the operator, and the operator keeps the record.
- The user's vault is read-only or a guest vault: browsing and preview work; install and publish are unavailable with an explanation.

## Requirements _(mandatory)_

### Functional Requirements

**Directory**

- **FR-001**: The template directory MUST let users switch between Entity templates and Stat sheet templates, and MUST leave existing stat sheet listing behaviour unchanged.
- **FR-002**: Entity template listings MUST be browsable with pagination and searchable by name, description, entity type and genre/system labels.
- **FR-003**: Users MUST be able to filter entity templates by entity type and by label (a genre or a system name), individually or together. The entity type filter MUST list the built-in types first, followed by any other entity types present in listings.
- **FR-003a**: A listing MAY use any entity type, including a custom category. Entity type values MUST be matched without regard to letter case so that "Faction" and "faction" do not appear as separate filters.
- **FR-004**: Listing cards MUST show enough public metadata to decide whether to open or install without downloading the full package.
- **FR-005**: The directory MUST provide clear loading, empty, unavailable and network-error states, and MUST skip malformed listings without blocking others.

**Listing content**

- **FR-006**: A listing MUST consist of the versioned Template Package defined in spec 167 plus listing metadata (description, genre/system labels, optional creator display name, timestamps). No second template format may be introduced.
- **FR-007**: The public listing MUST NOT contain vault entity content (notes), vault identifiers, private assets, or publish credentials. The template text itself is public by design and is shown in full in the publish preview.

**Install**

- **FR-008**: Users MUST be able to preview a listing as the note it would produce before installing it.
- **FR-009**: Installing MUST create an ordinary user template in the current vault, indistinguishable in behaviour from one the user created or imported by file.
- **FR-010**: Installing MUST NOT change any existing entity, MUST NOT change the vault's default template for any entity type, and MUST NOT silently overwrite an existing template.
- **FR-011**: Install MUST validate the complete package before saving and MUST be atomic: an invalid, unsupported or interrupted install leaves the vault unchanged. Supported older package versions are migrated first; unsupported versions are rejected clearly.
- **FR-012**: Name collisions MUST be resolved by explicit rename or cancel.
- **FR-013**: Installed templates MUST be independent copies; later changes to or removal of the listing MUST NOT alter them.
- **FR-014**: Installing and browsing MUST send no vault content to the directory or the publisher.

**Publish**

- **FR-015**: Users MUST be able to publish a user-created (or imported or installed) entity template from the Entity Templates list. Built-in and legacy file templates MUST be duplicated into a user template first.
- **FR-016**: Publishing MUST require a name, a non-empty body within the size limit, an entity type, a plain-language description, at least one genre/system label, and an explicit acknowledgment that the template will be public and that the creator has the right to share it and allows others to copy, use and adapt it.
- **FR-016a**: Published content MUST stay within these limits: template body up to 50,000 characters, name up to 80 characters, description up to 500 characters, and up to 8 genre/system labels of up to 30 characters each. The publish form MUST show live character and label counters and explain any limit that is exceeded before publishing is attempted.
- **FR-017**: Publishing MUST show a preview of exactly what will be shared, including the full template body, before it is confirmed.
- **FR-018**: Each listing MUST have its own listing identity and owner token, with copy/export controls and a recovery flow, following the stat sheet marketplace pattern. No account system is required. The listing identity and owner token MUST be remembered on the current device, linked to the vault template that was published, and MUST NOT be written into the template file, the exported Template Package, or the vault contents. Entering a saved token MUST restore owner controls and relink the matching local template.
- **FR-019**: Owners MUST be able to update metadata, replace the template text, and unpublish a listing without altering their local template. Updating MUST NOT create duplicates.
- **FR-020**: Unpublishing MUST remove the listing from new browse and search results within 60 seconds. An owner's own unpublish MUST be reversible: the owner can republish to the same listing with the owner token. An operator takedown MUST be final: the listing stays hidden and the owner token MUST NOT restore it, though the owner can still publish the template as a new listing.
- **FR-020a**: Owners MUST be able to permanently delete a listing with the owner token, whether it is active or unpublished. Delete MUST remove the listing and its template text from public storage, MUST be confirmed explicitly, and MUST NOT alter the local template. An operator-removed listing cannot be deleted by the owner; the operator keeps the record.

**Safety and governance**

- **FR-021**: The first release MUST provide user reporting, owner takedown and operator-authenticated admin takedown, with no mandatory pre-approval and no automated moderation workflow. It MUST NOT include ratings, comments, profiles or featured rankings.
- **FR-021a**: Reporting MUST be open to anyone without an account. A device is identified by its network address. Each device MUST be limited to one report per listing, at most 5 reports per minute and at most 20 reports per day, and the limits MUST still apply if the platform rate limiter is unavailable. The operator MUST be able to see each report's reason and a per-listing report count.
- **FR-022**: The feature MUST be opt-in: nothing is uploaded unless the user completes the publish flow.
- **FR-023**: Any new public, indexable page MUST have an entry in the discovery intent registry before it is built, and the discovery audit MUST pass. Individual community listing pages MUST NOT be offered for search-engine indexing.
- **FR-024**: The feature MUST include plain-language help explaining what is shared, how to unpublish, and that installed templates are local copies.
- **FR-025**: Publishing and installing MUST be unavailable, with an explanation, in guest and read-only vaults; browsing and previewing MUST remain available.

**Out of scope**

- Typed template fields and applying template changes to existing entities (tracked separately from #3445).
- Ratings, comments, popularity ranking, automatic updates to installed templates, and licence selection.

### Key Entities

- **Entity Template Listing**: A public record with a stable listing identity, template kind (entity), name, description, entity type, genre/system labels, optional creator display name, timestamps, and a reference to its Template Package.
- **Template Package**: The versioned, self-contained portable template from spec 167 (name, entity type, markdown body, format version). Shared as-is by listings and by file export/import.
- **Owner Token**: A per-listing secret that lets its holder update or unpublish that listing; never part of the public record, the template file or the vault. Stored on the device together with the listing identity and the local template it belongs to.
- **Listing Report**: A user's report of a listing with a reason, recorded for operator review.
- **Installed Template**: An ordinary vault user template created from a listing; independent of the listing afterwards.

## Assumptions

- Spec 167 (entity template management, including the versioned Template Package and import/export) is complete and is the source of truth for template shape and validation.
- The stat sheet marketplace (spec 150) provides the pattern for listing identity, owner tokens, reporting, takedown, pagination and public storage; this feature extends it rather than replacing it.
- Entity types are the vault's open-ended category set; genre/system labels are free text normalised for search.
- A first release can order results newest-updated first.
- Creator attribution is optional and is a display name only.
- Genre and system metadata is expressed as labels; there is no separate system field. Filters and search treat them the same.
- "Device" for reporting means network address, so people sharing one address share one report per listing.
- Publishing is a deliberate, one-way-visible action: anything in the template body becomes public, which is why the full body is shown in the preview.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can publish a valid template, including preview and acknowledgment, in under 2 minutes.
- **SC-002**: A user can find a matching entity template by browsing, filtering or searching in under 30 seconds in a directory of at least 1,000 listings.
- **SC-003**: A user can preview and install a listing in under 30 seconds after finding it.
- **SC-004**: 100% of rejected, unsupported or interrupted installs leave the vault's templates, defaults and entities unchanged.
- **SC-005**: 100% of installs leave the vault's default template for every entity type unchanged.
- **SC-006**: In acceptance tests, public listings never expose entity content, vault identifiers or publish credentials.
- **SC-007**: A template installed from a listing produces byte-identical starting text to the published body in 100% of tested cases.
- **SC-008**: Unpublishing, permanent deletion or takedown removes a listing from new browse and search results within 60 seconds while preserving the owner's local template.
- **SC-009**: At least 90% of first-time users can publish or install without opening separate documentation.
- **SC-010**: Existing stat sheet directory behaviour is unchanged in 100% of existing regression checks.
