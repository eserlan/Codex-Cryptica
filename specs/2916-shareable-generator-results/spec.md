# Feature Specification: Shareable Generator Results

**Feature Branch**: `2916-shareable-generator-results`  
**Created**: 2026-09-10  
**Status**: Draft  
**Input**: User description: "GitHub issue #2916: Add shareable generator results with public snapshots and remix flow."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Share a completed generated entity (Priority: P1)

As a generator user, I can explicitly publish one completed generated entity and receive a stable link so I can share that exact result outside Codex Cryptica.

**Why this priority**: A stable, opt-in share link is the core referral loop and provides value even without remixing.

**Independent Test**: Generate an entity, choose Share, and open the returned link in a separate browser context; it displays the same title, content, and supported metadata after the local entity changes.

**Acceptance Scenarios**:

1. **Given** a completed generator result, **When** the user chooses Share and confirms the privacy notice, **Then** the system creates a public immutable entity snapshot and presents its stable link.
2. **Given** a generated entity that later changes through refinement, editing, or a new generation, **When** a visitor opens its existing share link, **Then** they see the originally shared content.
3. **Given** a device that supports native sharing, **When** the user shares a completed snapshot, **Then** the device share sheet is offered; otherwise the user can copy the link.
4. **Given** an entity that exceeds the sharing limit or cannot be stored, **When** the user tries to share it, **Then** no public link is created and the user receives a clear explanation.

---

### User Story 2 - Share a generated entity from every generator surface (Priority: P2)

As a generator user, I can share an eligible entity from the current public generator result, the in-app generator's Session Hub, or its saved vault entity, including after I have moved on to another result.

**Why this priority**: A generated entity is useful after it is saved, not only while its generator session is open. Every generator surface should use the same explicit share flow.

**Independent Test**: Generate an entity, save it to a vault, share it from the entity detail view, and verify the shared page displays that saved entity. Repeat from Session Hub without saving first.

**Acceptance Scenarios**:

1. **Given** an eligible current result or Session Hub entity, **When** the user chooses Share, **Then** the same opt-in sharing flow and immutable public result are available.
2. **Given** an entity saved in a local vault, **When** the user chooses Share from its detail view, **Then** the same opt-in sharing flow creates an immutable public result without publishing the vault, its relationships, images, or other entities.
3. **Given** a shareable entity that is later removed or changed locally, **When** a visitor opens its existing share link, **Then** the public snapshot remains available and unchanged until its creator revokes it.

---

### User Story 3 - Visit and reuse a shared result (Priority: P2)

As a visitor who receives a share link, I can read the result, understand its origin, and start a related generation without being sent to an unrelated page.

**Why this priority**: This is the conversion path that makes shared results useful for discovery without turning generated pages into an indexable content farm.

**Independent Test**: Open a shared link without a local account or vault and verify that it shows readable content, attribution, a generator-specific action, and noindex metadata.

**Acceptance Scenarios**:

1. **Given** a valid public link, **When** a visitor opens it, **Then** they can read the snapshot's title, content, generator information, and attribution.
2. **Given** a shared result with a supported originating generator, **When** the visitor selects Remix this, **Then** the relevant generator opens with the shared result available as a starting point for refinement or inspiration.
3. **Given** a shared result without a supported remix path, **When** the visitor selects the primary action, **Then** they are taken directly to the relevant generator to make a new result.
4. **Given** a shared result page, **When** a social crawler reads it, **Then** it receives an informative title and description and the page requests not to be indexed by search engines.

---

### User Story 4 - Revoke a shared entity (Priority: P2)

As the anonymous creator of a shared entity, I can permanently revoke it from the device on which I made the share without exposing a credential in the public URL.

**Why this priority**: Explicit remote sharing must remain reversible, including for people without accounts.

**Independent Test**: Create a share, revoke it using the creation browser, and verify that subsequent public requests report that the snapshot is unavailable.

**Acceptance Scenarios**:

1. **Given** a share created on this browser, **When** its creator chooses Revoke and confirms, **Then** the public snapshot becomes unavailable and the local management credential is removed.
2. **Given** a visitor with only the public URL, **When** they attempt to revoke the snapshot, **Then** they cannot do so.

### Edge Cases

- A malformed, unknown, removed, or revoked link must not disclose stored content or management data.
- A share request with a non-text payload, invalid fields, or a body larger than 64 KB must be rejected before a snapshot is made public.
- A temporary network failure, rate limit, or unavailable sharing API must leave the local entity intact and offer a clear retry or copy-link outcome where a link exists.
- A repeated Share action for the same local entity may create a new immutable snapshot; it must never overwrite an existing one.
- The public page must render untrusted generated text safely and must not rely on browser-only data for crawler-visible metadata.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose Share for completed public-generator results, in-app current and Session Hub entities, and entities saved from a generator in a local vault.
- **FR-002**: The system MUST require an explicit, informed user action before any entity content is sent outside the browser. The consent surface MUST state that the shared text becomes publicly readable at the link, is stored by Codex Cryptica's hosting provider, remains until revoked, and can be revoked from this browser.
- **FR-003**: The system MUST create a distinct, stable public URL for every successfully shared snapshot.
- **FR-004**: The system MUST preserve a shared snapshot exactly as it was at creation; later local edits, refinements, deletion, and session expiry MUST NOT change it.
- **FR-005**: The system MUST only accept a normalised text/JSON representation of a generator result and MUST reject unsupported or binary payloads and snapshots larger than 64 KB.
- **FR-006**: The system MUST protect snapshot creation against abusive request volume and return a clear retry message when creation is rate-limited.
- **FR-007**: The system MUST create a private management credential for an anonymous share, retain it only in the creator's local browser storage, and never put it in the public URL or public response.
- **FR-008**: The system MUST let a creator revoke a snapshot using its private management credential and MUST make the revoked snapshot unavailable to public readers.
- **FR-009**: The public shared-result page MUST show the snapshot content safely, identify the originating generator where available, include restrained Codex Cryptica attribution, and offer a generator-specific primary action.
- **FR-010**: The system MUST offer Remix this for generator types that can accept the shared entity as an initial refinement source; all other supported results MUST offer Generate your own for their originating generator.
- **FR-011**: The public shared-result page MUST request exclusion from search indexing while remaining directly accessible through its URL.
- **FR-012**: The public shared-result page MUST provide an informative social title and description derived from the snapshot without storing a separate image for every share.
- **FR-013**: The sharing flow MUST use the operating system's native sharing capability when it is available and provide an accessible Copy link fallback on other devices.
- **FR-014**: The system MUST record creation, copied-link, opened-link, remix-clicked, and generate-clicked events with the originating generator type when known.
- **FR-015**: The system MUST provide user-facing help that explains what sharing publishes, how to revoke a link, and that local content remains the authoritative copy.

### Key Entities

- **Share snapshot**: An immutable, public, text-only representation of one generated entity, with a public identifier, originating generator information when known, title, content, supported metadata, and creation time.
- **Management credential**: A secret associated with one share snapshot that is retained only by its anonymous creator's browser and authorises revocation.
- **Shared result view**: The public read-only presentation of a share snapshot, including the relevant generator action and social metadata.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user with a completed eligible result can create and copy or send a share link in no more than three deliberate interactions after selecting Share.
- **SC-002**: Opening a valid share link displays its title and readable result content within 3 seconds on a typical broadband connection.
- **SC-003**: In automated verification, 100% of accepted snapshots remain unchanged after their original local draft is modified or deleted.
- **SC-004**: In automated verification, 100% of revoked snapshots are unavailable through their public URLs.
- **SC-005**: Every public shared-result page provides a generator-specific action and requests exclusion from search indexing.

## Assumptions

- Sharing is available without an account and stores only the selected generated entity and its small display metadata; it does not publish a vault, account profile, session history, relationships, images, or source prompt unless that data is explicitly part of the displayed result.
- Public snapshots persist until the creator revokes them or an authorised abuse-removal process removes them; age alone does not remove a share.
- The v1 primary action can use the existing refinement path with the shared document as its initial source where that path is supported; recreating every original generator control is outside this scope.
- Snapshot pages are public application views, not curated or indexable discovery pages; discovery intent registration is therefore not required.
