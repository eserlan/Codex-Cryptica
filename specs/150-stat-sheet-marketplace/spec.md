# Feature Specification: Community Stat Sheet Template Directory

**Feature Branch**: `150-stat-sheet-marketplace`
**Created**: 2026-07-31  
**Status**: Draft  
**Input**: GitHub issue #1947 — Public Directory / Marketplace for Community Stat Sheet Templates

## Clarifications

### Session 2026-07-31

- Q: How should publishing authorization work for a Stat Sheet template? → A: Each published template has its own listing identity and owner token; publishing does not require publishing an entire world.
- Q: How should template systems and entity categories be classified? → A: Entity categories use a controlled vocabulary; system names remain free-form searchable values.
- Q: How should the marketplace handle templates created with older or newer Stat Sheet field formats? → A: Packages are versioned and supported older versions are migrated during import; unsupported versions are rejected clearly.
- Q: What should the first release provide for inappropriate or infringing templates? → A: Basic reporting and owner/admin takedown controls, without mandatory pre-approval.
- Q: How should creator attribution work on public listings? → A: Creators may provide an optional public display name.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Publish a reusable template (Priority: P1)

As a GM or worldbuilder, I want to publish one of my saved Stat Sheet templates with clear descriptive information so that other Codex Cryptica users can discover and reuse it.

**Why this priority**: Publishing creates the supply that makes a community directory useful and gives template creators a direct path from a local template to a shareable resource.

**Independent Test**: Create a vault template, enter its public metadata, confirm the sharing acknowledgment, publish it, and verify that the template appears in the public directory without exposing any campaign entity data.

**Acceptance Scenarios**:

1. **Given** a saved local Stat Sheet template, **When** the creator opens its publish action, **Then** Codex Cryptica shows a preview containing only the template structure and public metadata fields.
2. **Given** a valid template with a name, description, system/category information, and creator acknowledgment, **When** the creator publishes it, **Then** the template receives a public directory entry and a success confirmation.
3. **Given** a template containing entity values, entity names, campaign notes, or private vault identifiers, **When** it is prepared for publication, **Then** those private values are excluded from the public package.
4. **Given** an already published template, **When** its creator edits the public metadata or replaces its layout, **Then** the directory entry updates without creating a duplicate listing.
5. **Given** an already published template, **When** its creator chooses to unpublish it, **Then** it is removed from browse and search results while remaining available in the creator's local vault.

---

### User Story 2 - Discover templates (Priority: P1)

As a GM looking for a starting point, I want to browse and search community templates by game system, entity category, and descriptive labels so that I can find a useful layout quickly.

**Why this priority**: Discovery is the core value for users who did not create the published templates themselves.

**Independent Test**: Seed the directory with templates from multiple systems and categories, browse the directory, search by keyword, apply filters, and verify that only matching public summaries are shown.

**Acceptance Scenarios**:

1. **Given** published templates exist, **When** a user opens the community directory, **Then** the user sees a paginated list of template cards with name, description, system, category, labels, creator display name when provided, and usage metadata available to the directory.
2. **Given** a user enters a search term, **When** the directory applies the search, **Then** results match the template name, description, system, category, or labels without requiring an exact phrase.
3. **Given** a user selects a system or entity-category filter, **When** the filter is applied, **Then** only templates matching the selected criteria remain visible.
4. **Given** the directory has no matching results, **When** the search or filters complete, **Then** the interface shows a clear empty state and preserves the user's active query and filters.
5. **Given** a directory entry is unavailable or malformed, **When** it is encountered during browsing, **Then** the directory skips it or shows a recoverable error without preventing other results from loading.

---

### User Story 3 - Import a community template (Priority: P1)

As a GM, I want to import a community template into my local vault with one clear action so that I can use it on my own entities without exposing my campaign data.

**Why this priority**: Importing turns discovery into a useful local workflow while preserving Codex Cryptica's local-first model.

**Independent Test**: Select a published template, import it into a test vault, apply it to an entity, and verify that the saved local template contains the expected structure and no remote-only metadata is treated as entity data.

**Acceptance Scenarios**:

1. **Given** a valid public template, **When** the user chooses **Import**, **Then** Codex Cryptica downloads only the template package and saves it as a vault-local template.
2. **Given** the local vault already contains a template with the same name, **When** the user imports another template, **Then** the user can choose a non-destructive name for the imported copy or cancel without changing the existing template.
3. **Given** an imported template is saved, **When** the user opens the Stat Sheet template picker, **Then** the imported template is available for application like any other local template.
4. **Given** a public template fails validation, has an unsupported field type, or cannot be downloaded, **When** the user selects **Import**, **Then** the import is rejected with a plain-language explanation and no partial local template is saved.
5. **Given** a user imports a template, **When** the import completes, **Then** no entity content, vault metadata, or private campaign information is sent to the publisher or directory.

## Edge Cases

- A creator attempts to publish an empty template, a template with no usable fields, or metadata exceeding the allowed limits.
- A creator loses access to the local publish controls after clearing browser data; the public listing remains available, and the creator can recover owner controls by re-entering the owner token saved/exported at publication time.
- Two creators publish templates with the same name; both remain distinct and are identified by their public listing identity.
- A template is unpublished while a user is viewing its detail or importing it; the user receives a recoverable unavailable message and no incomplete template is saved.
- A community template contains labels or text using disallowed private terminology or unsafe content; the package is rejected or sanitized according to the directory's validation rules without changing the creator's local template.
- Network loss occurs during publishing, browsing, or importing; local templates remain unchanged and the user can retry the operation.
- A template's original system or category is not known; the creator may use a clear custom value such as “Homebrew,” while the directory still supports keyword search.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to start publishing from a saved local Stat Sheet template.
- **FR-002**: The publishing flow MUST require a template name, a plain-language description, at least one free-form system name or controlled entity-category classification, and an explicit acknowledgment that the template will be publicly discoverable.
- **FR-003**: The publishing preview MUST show the creator exactly which layout fields and public metadata will be shared before publication.
- **FR-004**: The public package MUST contain only reusable template structure and intentionally provided public metadata; it MUST NOT contain entity values, entity content, campaign notes, vault identifiers, private asset data, or publish write credentials.
- **FR-005**: Creators MUST be able to update or unpublish templates they previously published using that template listing's owner controls, and those actions MUST NOT delete or alter the local template. The publish flow MUST let creators copy or export the owner token for recovery after browser data is cleared.
- **FR-006**: The directory MUST support browsing published templates with pagination.
- **FR-007**: The directory MUST support keyword search across public template name, description, system, category, and labels.
- **FR-008**: The directory MUST support free-form system search and filtering by controlled entity category, with labels available as an additional filter when present.
- **FR-009**: Directory results MUST display enough metadata for a user to decide whether to open or import a template without downloading the full package, including an optional creator display name when provided.
- **FR-010**: Users MUST be able to open a template detail view and choose to import it into the current local vault.
- **FR-011**: Imports MUST validate the complete, versioned template package before saving and MUST be atomic: an invalid, unsupported, or interrupted import MUST NOT leave a partial template.
- **FR-012**: Imports MUST preserve the original field order, labels, field types, dice expressions, counter bounds, and section structure supported by the local Stat Sheet model, migrating supported older package versions before saving.
- **FR-013**: Name collisions during import MUST be handled non-destructively through an explicit rename, replacement choice where supported, or cancellation.
- **FR-014**: The directory and import flow MUST provide clear loading, empty, unavailable, validation-error, and network-error states.
- **FR-015**: Public publishing and browsing MUST be opt-in and MUST NOT expose or upload a user's local campaign data.
- **FR-016**: The feature MUST use the existing public-directory distribution and owner-token pattern for each template listing, without requiring a separate user account system or a published world for the first release.
- **FR-017**: The first release MUST NOT include ratings, comments, social profiles, featured rankings, or automated moderation workflows; it MUST provide basic reporting, owner takedown, and operator-authenticated admin takedown controls.
- **FR-018**: The feature MUST include user-facing help explaining what is shared, how to unpublish a template, and how imported templates become local copies.

### Key Entities

- **Community Template Listing**: A public, creator-approved directory record containing a stable public identity, template name, description, system/category classification, labels, creator display name when provided, timestamps, and a reference to the reusable template package.
- **Public Template Package**: The validated, reusable Stat Sheet layout shared by a listing; it contains field structure only and no campaign-specific values.
- **Local Stat Sheet Template**: A vault-scoped template that can be edited, applied to entities, renamed, or deleted independently of its community listing.
- **Template Import**: A user-initiated operation that validates a public package and creates a local Stat Sheet Template copy.

## Assumptions

- Each published template receives an independent listing identity and owner control, so template publishing does not require a related public world listing.
- The existing Stat Sheet field model is the source of truth for which field types and structural values can be published or imported.
- Entity categories use the application's controlled category vocabulary; system names are creator-provided text that is normalized for search without preventing homebrew values.
- Public listings are metadata-first: users can decide whether to import from the listing details without loading campaign data.
- Creator attribution is optional; a creator may publish without exposing a public display name.
- A first release can use a simple newest/updated ordering; ratings and popularity ranking are intentionally deferred.
- Community safety uses lightweight reporting and takedown controls rather than mandatory pre-approval or automated moderation.
- Owner recovery is client-managed: publication shows the owner token with copy/export controls, and a recovery flow accepts that token after local browser data is cleared. The service does not infer ownership from a user account.
- Imported templates are independent local copies. Later changes by the original creator do not silently modify imported templates.
- Public template packages carry a format version; supported older versions have explicit migrations, while newer or unknown versions fail with an actionable import message.
- In the current Stat Sheet model, `heading` fields are the supported representation of section structure; imports preserve their order and labels.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A creator can publish a valid saved template, including preview and acknowledgment, in under 2 minutes.
- **SC-002**: A user can find a matching template using browse, keyword search, or filters in under 30 seconds on a directory containing at least 1,000 listings.
- **SC-003**: At least 95% of valid template imports complete in one user action after the user chooses the destination name.
- **SC-004**: 100% of rejected, interrupted, or unavailable imports leave the local template library unchanged.
- **SC-005**: Public directory results never expose campaign entity content, entity values, private vault identifiers, or publish credentials in acceptance tests.
- **SC-006**: At least 90% of first-time users can publish or import a template without opening a separate developer or system manual, using only the interface and linked help.
- **SC-007**: Unpublishing a template removes it from new browse and search results within 60 seconds while preserving the creator's local copy.
