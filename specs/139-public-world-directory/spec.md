# Feature Specification: Public World Directory

**Feature Branch**: `139-public-world-directory`  
**Created**: 2026-06-30  
**Status**: Draft  
**Input**: User description: "Create a new spec for issue #1572: public world listing for opt-in shared guest vaults. Reference and depend on `specs/135-guest-vault-r2`; amend that existing spec only to clarify that guest snapshot publishing is unlisted by default and public gallery listing is a separate consent level."

## Assumptions

- This feature depends on the published guest snapshot capability defined in [`specs/135-guest-vault-r2/spec.md`](../135-guest-vault-r2/spec.md).
- A world must already have a valid, read-only guest snapshot before it can be listed publicly.
- "Sharing" and "listing" are separate consent levels: sharing creates a link-access guest view; listing makes that guest view discoverable in a public Codex Cryptica directory.
- Public listing is opt-in, reversible, and never enabled automatically when a guest snapshot is published or updated.
- All metadata exposed in a public listing must be safe for the public guest view and must use "labels" terminology for classification.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - List a Shared World Publicly (Priority: P1)

As a world owner, I want to explicitly list an already-published guest snapshot in a public Codex Cryptica directory so that people can discover my world without receiving a private link from me.

**Why this priority**: This is the core value of the feature. It creates discoverability while preserving the privacy boundary established by guest snapshot publishing.

**Independent Test**: Starting from a world with an active guest snapshot, the owner enables public listing, confirms the public preview, and the world appears in the public directory with only safe listing metadata.

**Acceptance Scenarios**:

1. **Given** a world has an active guest snapshot, **When** the owner enables public listing and confirms the preview, **Then** the world appears in the public directory.
2. **Given** a world has no active guest snapshot, **When** the owner tries to enable public listing, **Then** the system blocks listing and explains that a read-only guest snapshot is required first.
3. **Given** a world is listed publicly, **When** a directory visitor opens the listing, **Then** they are taken only to the read-only guest view and never to the editable world.

---

### User Story 2 - Preview Public Listing Metadata (Priority: P1)

As a world owner, I want to preview exactly how my world will appear in the public directory before listing it so that I understand what will become discoverable.

**Why this priority**: Listing is a privacy-sensitive action. Owners need clear consent and a concrete preview before making a world publicly discoverable.

**Independent Test**: The owner opens listing settings and sees a preview containing the exact title, description, labels, cover image, owner display name, and guest link behavior that directory visitors will see.

**Acceptance Scenarios**:

1. **Given** a world owner opens the public listing controls, **When** listing is not yet enabled, **Then** the system shows a preview of the listing metadata before any public listing is created.
2. **Given** the owner edits listing metadata, **When** the preview updates, **Then** the preview reflects the exact public card details that will be shown in the directory.
3. **Given** the owner confirms listing, **When** the confirmation is shown, **Then** the language clearly states that anyone can find the world in the public directory.

---

### User Story 3 - Discover Listed Worlds (Priority: P2)

As a visitor, I want to browse and search publicly listed worlds so that I can find examples and campaigns that match my interests.

**Why this priority**: Discovery is the visible user-facing outcome after owners opt in. A lightweight directory is enough for the first version.

**Independent Test**: A visitor opens the directory, searches by title or description, filters by genre/theme labels, and opens a result into the read-only guest view.

**Acceptance Scenarios**:

1. **Given** multiple worlds are publicly listed, **When** a visitor opens the directory, **Then** the directory shows a lightweight gallery of listed worlds.
2. **Given** the visitor enters a search term, **When** listed worlds match by title or description, **Then** matching worlds are shown and non-matching worlds are hidden.
3. **Given** the visitor selects one or more genre/theme labels, **When** listed worlds match those labels, **Then** the results narrow to matching listings.
4. **Given** the visitor opens a listed world, **When** navigation completes, **Then** the visitor lands in the read-only guest vault.

---

### User Story 4 - Delist a World (Priority: P2)

As a world owner, I want to remove my world from the public directory at any time so that I can reverse public discoverability without necessarily deleting the guest snapshot.

**Why this priority**: Reversibility is required for trust. Owners may want to keep a private group link active while removing public discovery.

**Independent Test**: The owner disables public listing and the world disappears from directory search and browse results while the guest snapshot remains available by direct link if guest sharing remains enabled.

**Acceptance Scenarios**:

1. **Given** a world is publicly listed, **When** the owner disables public listing, **Then** the world no longer appears in directory browsing or search results.
2. **Given** public listing is disabled but the guest snapshot remains published, **When** someone uses the existing guest link, **Then** the guest view still works.
3. **Given** the owner unpublishes the guest snapshot, **When** the snapshot is removed, **Then** any public listing for that world is automatically removed or made unavailable.

---

### User Story 5 - Protect Public Data Boundaries (Priority: P1)

As a world owner, I want public listings to expose only safe discovery metadata so that private notes, hidden entities, internal identifiers, and editor-only state never become discoverable through the directory.

**Why this priority**: Privacy is the critical risk. The feature is not acceptable if listing can reveal anything beyond explicitly public metadata and the existing guest-safe view.

**Independent Test**: A listed world with private content, hidden notes, internal identifiers, and editor-only state exposes none of those values in the listing card, directory search index, or listing preview.

**Acceptance Scenarios**:

1. **Given** a world contains private or editor-only content, **When** the public listing is created, **Then** listing metadata excludes all private/editor-only content.
2. **Given** a visitor searches the public directory, **When** private content exists in the owner's editable world, **Then** that private content cannot match or appear in search results.
3. **Given** a listing contains a cover image, **When** visitors view the directory, **Then** the image is one explicitly selected or approved for public guest viewing.

### Edge Cases

- A guest snapshot is published but public listing is never enabled: the world must remain absent from public directory browsing and search.
- Public listing is enabled and then the guest snapshot is unpublished: the listing must be removed or shown as unavailable without linking to a broken or editable destination.
- Listing metadata contains empty title, missing description, or no labels: the owner must receive a clear prompt to complete required public metadata before listing.
- A cover image is removed, made private, or fails to load: the directory must use a safe fallback and must not expose private asset paths.
- Owner display name is not configured: the listing must either omit owner attribution or show only an explicitly approved public display name.
- A listed world is updated: the listing must not automatically expand its public metadata beyond the owner's approved listing fields.
- A visitor opens a listed world after it has been delisted: the directory must stop linking to it, while direct guest links follow the underlying guest snapshot rules from `135-guest-vault-r2`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST treat public listing as a separate opt-in state from guest snapshot publishing.
- **FR-002**: The system MUST NOT automatically list a world when a guest snapshot is published, updated, or copied.
- **FR-003**: The system MUST require an active read-only guest snapshot before a world can be publicly listed.
- **FR-004**: The system MUST provide owner controls to enable public listing, update listing metadata, preview the public listing, and disable public listing.
- **FR-005**: The listing confirmation MUST use clear language stating that the world will be discoverable by anyone browsing the public directory.
- **FR-006**: The public listing preview MUST show the exact public title, description, genre/theme labels, cover image state, owner display name state, and guest view destination behavior.
- **FR-007**: Public listings MUST link only to the guest/read-only vault view defined by `135-guest-vault-r2`.
- **FR-008**: Public listings MUST NOT expose editable world URLs, write tokens, local vault IDs, internal entity IDs, editor-only state, private notes, hidden relationships, generation prompts, or private metadata.
- **FR-009**: Public directory search MUST operate only over approved listing metadata and MUST NOT index the underlying editable world or non-listed guest snapshots.
- **FR-010**: Visitors MUST be able to browse all currently listed worlds in a lightweight public directory.
- **FR-011**: Visitors MUST be able to search listed worlds by public title and public description.
- **FR-012**: Visitors MUST be able to filter listed worlds by public genre/theme labels.
- **FR-013**: The directory MUST provide a deterministic default ordering for listed worlds, such as recently updated first.
- **FR-014**: Owners MUST be able to delist a world without deleting the underlying guest snapshot.
- **FR-015**: If the underlying guest snapshot is unpublished or becomes unavailable, the system MUST remove, disable, or hide the corresponding public listing.
- **FR-016**: The system MUST store and display only owner-approved public owner attribution; if no public owner display name is approved, owner attribution MUST be omitted.
- **FR-017**: The system MUST allow an optional public cover image only when the owner has selected or approved an image that is safe for guest/public viewing.
- **FR-018**: Public listing metadata MUST use "labels" language for classification and MUST NOT introduce user-facing "tags" terminology.
- **FR-019**: The feature MUST define public listing as separate from search-engine indexing; search-engine indexing MAY be controlled by a later feature.
- **FR-020**: Moderation, reporting, featured listings, comments, ratings, and social networking behavior are out of scope for the first version.

### Key Entities _(include if feature involves data)_

- **Published Guest Snapshot**: The existing read-only guest artifact defined by `135-guest-vault-r2`; a public listing can point to it but does not replace it.
- **Public Listing**: A discoverable record for a world that contains only approved public metadata and a destination to the read-only guest view.
- **Listing Metadata**: The public title, short description, genre/theme labels, optional cover image, optional owner display name, visible entity count, and updated date shown in directory browsing and search.
- **Listing Preview**: The owner-facing representation of the exact public listing card and destination behavior before listing is enabled or updated.
- **Directory Result**: A public search/browse item shown to visitors; it must be derived only from Public Listing metadata.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of newly published guest snapshots remain absent from the public directory until the owner explicitly enables public listing.
- **SC-002**: Owners can enable public listing for an already-published guest snapshot in under 2 minutes after required metadata is available.
- **SC-003**: Owners can delist a world in under 30 seconds, and the world no longer appears in directory browse or search results.
- **SC-004**: Directory visitors can search or filter listed worlds and open a result into the read-only guest view without encountering editable controls.
- **SC-005**: Privacy validation confirms that public listing records contain 0 private notes, 0 editor-only fields, 0 write tokens, 0 local vault IDs, and 0 hidden relationship details.
- **SC-006**: At least 95% of test users correctly distinguish "share by link" from "list publicly" after reading the listing confirmation language.
