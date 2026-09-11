# Feature Specification: Smart Multi-Format Copy

**Feature Branch**: `2815-smart-copy`  
**Created**: 2026-09-08  
**Status**: Draft  
**Input**: GitHub issue #2826 and child issues #2827, #2828, and #2829: standardise Copy for authored and generated content so one action offers canonical Markdown/plain text and safe rich text, while literal values remain plain text.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Paste content naturally anywhere (Priority: P1)

As a user copying authored or generated content, I can use the same Copy action and receive formatted prose in rich-text destinations or useful Markdown in plain-text destinations.

**Why this priority**: This is the central user value: one simple action produces a useful result without requiring the user to choose or predict the destination.

**Independent Test**: Copy a generated result containing headings, a list, emphasis, and a link, then paste it into one rich-text destination and one plain-text destination. Both pastes represent the same content in the form natural to that destination.

**Acceptance Scenarios**:

1. **Given** authored or generated Markdown content, **When** the user selects Copy and pastes into a rich-text destination, **Then** headings, lists, emphasis, links, and other supported structure remain formatted and readable.
2. **Given** the same content, **When** the user pastes into a plain-text or Markdown destination, **Then** the canonical Markdown/plain representation is pasted without being replaced by rendered HTML.
3. **Given** content containing unsafe markup or unsafe links, **When** the user copies it, **Then** the rich representation excludes unsafe content while the intended prose remains readable.

---

### User Story 2 - Copy despite limited clipboard support (Priority: P2)

As a user whose browser cannot write rich clipboard content, I can still copy the canonical Markdown/plain representation and receive accurate success or failure feedback.

**Why this priority**: Copy is a core escape hatch for generated content and must remain dependable across browser capabilities and permission states.

**Independent Test**: Simulate an unavailable or rejected rich clipboard operation, copy a Markdown document, and verify that the exact canonical Markdown is offered through the plain-text fallback without changing the content.

**Acceptance Scenarios**:

1. **Given** rich clipboard writing is unavailable or rejected, **When** the user copies document-like content, **Then** the system attempts to copy the canonical Markdown/plain representation through the available plain-text path.
2. **Given** the fallback succeeds, **When** the copy action completes, **Then** the existing success feedback is shown.
3. **Given** both rich and plain clipboard operations fail, **When** the copy action completes, **Then** the user receives failure feedback and the source content remains unchanged.

---

### User Story 3 - Consistent copies across content surfaces (Priority: P3)

As a user, I receive materially equivalent clipboard content whether I copy a current generator result, one generator section, a historical Session Hub result, an entity, or another document-like content surface.

**Why this priority**: Consistency prevents content from losing structure merely because it is copied from a different point in the workflow.

**Independent Test**: Copy the same generated material from the current result and its Session Hub history entry, then compare the canonical and rich representations for the title, main content, sections, and optional “At the Table” material.

**Acceptance Scenarios**:

1. **Given** a full generator result with optional supporting material, **When** it is copied, **Then** both representations include the same useful title, content, sections, and supporting material already included by the canonical copy contract.
2. **Given** one generator section, **When** it is copied, **Then** its source Markdown is canonical and its rich representation preserves the section’s supported structure.
3. **Given** a historical Session Hub result, **When** it is copied, **Then** its representations are materially consistent with the equivalent current generator result.
4. **Given** an existing content surface that already provides multi-format copying, **When** the shared contract is introduced, **Then** its supported content and optional image behaviour remain intact.

---

### User Story 4 - Copy literal values exactly (Priority: P4)

As a user copying a URL, secret, prompt, identifier, raw source, debug log, or other literal value, I receive exactly that plain value without rich formatting.

**Why this priority**: Literal values must remain exact and must not gain document semantics merely for API consistency.

**Independent Test**: Exercise each class of known literal-copy action and verify that the copied plain value is unchanged and no rich representation is introduced.

**Acceptance Scenarios**:

1. **Given** a literal-value Copy action, **When** the user selects Copy, **Then** the exact intended plain value is copied.
2. **Given** the clipboard audit, **When** a direct plain-text copy is classified as literal, **Then** it remains deliberately plain and its classification is recorded.

### Edge Cases

- Empty or whitespace-only authored content retains a deterministic canonical representation and never copies unsafe placeholder markup.
- Markdown containing tables, fenced code, nested lists, Unicode, or links remains useful in both supported representations.
- HTML sanitisation removes scripts, event handlers, and unsafe URL schemes without silently changing the canonical Markdown source.
- The rich clipboard interface may exist but reject a write because of permissions, browser policy, or an unsupported payload.
- Optional image conversion may fail while the text representations remain copyable.
- Historical records may omit optional title, summary, lore, or section data; copy includes the available content without emitting misleading headings.
- Repeated Copy actions preserve existing feedback reset and analytics behaviour.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide one shared smart-copy contract for document-like authored or generated content.
- **FR-002**: A smart-copy operation MUST offer a canonical `text/plain` representation and a corresponding sanitised `text/html` representation in a single user action when the environment supports multi-format clipboard writes.
- **FR-003**: When Markdown is the source format, the canonical plain representation MUST preserve useful Markdown rather than converting it to rendered prose or HTML.
- **FR-004**: The rich representation MUST preserve supported semantic structure, including headings, paragraphs, lists, emphasis, links, tables, and code blocks where present.
- **FR-005**: The rich representation MUST exclude executable markup, unsafe attributes, and unsafe URL schemes.
- **FR-006**: The rich representation MUST remain readable without Codex Cryptica theme styles.
- **FR-007**: If multi-format clipboard writing is unavailable or fails, the system MUST attempt to copy the exact canonical Markdown/plain representation through a plain-text fallback.
- **FR-008**: Each shared copy operation MUST return an unambiguous success or failure result so its caller can preserve existing user feedback.
- **FR-009**: Existing entity copy behaviour MUST remain available, including optional image content when image preparation succeeds.
- **FR-010**: Failure to prepare optional image content MUST NOT prevent copying the available text representations.
- **FR-011**: Existing content callers MUST remain compatible during migration, or be migrated in the same delivery without a user-visible regression.
- **FR-012**: Full public-generator Copy MUST use smart copy and include the same title, main content, sections, and optional “At the Table” material defined by its canonical Markdown contract.
- **FR-013**: Per-section generator Copy MUST use the section’s source Markdown as the canonical representation and offer equivalent sanitised rich content.
- **FR-014**: Session Hub historical-result Copy MUST use the shared smart-copy contract and remain materially consistent with copying the equivalent current result.
- **FR-015**: Existing Copy success/error feedback and public-generator analytics MUST remain functional for migrated generator and Session Hub actions.
- **FR-016**: The web application’s clipboard write call sites MUST be inventoried and classified as document-like content or literal/plain values.
- **FR-017**: Document-like content copy actions discovered in the audit MUST use the shared smart-copy contract unless a documented, user-meaningful exception applies.
- **FR-018**: Literal values, including URLs, recovery keys, secrets, prompts, raw source, debug logs, identifiers, and tokens, MUST retain exact plain-text semantics.
- **FR-019**: The product MUST NOT detect the destination application or ask the user to choose a destination format.
- **FR-020**: Developer guidance MUST state when to use smart multi-format copy and when to use plain copy.
- **FR-021**: Automated coverage MUST verify successful multi-format copy and at least one meaningful unsupported, rejected, or total-failure path for affected behaviour.

### Key Entities

- **Copy Content**: The document-like material selected by the user, consisting of one canonical Markdown/plain representation, one corresponding safe rich representation, and optionally an image.
- **Copy Classification**: The recorded intent of a clipboard action: either document-like content eligible for smart copy or a literal value requiring exact plain-text copy.
- **Copy Result**: The success or failure outcome consumed by the initiating surface for feedback and analytics.

### Assumptions

- The existing visible label remains “Copy” unless a surface already uses a more specific label whose wording is intentionally useful.
- This feature includes only the Copy portion of Session Hub issue #2824; refinement lineage remains owned by #2824 and its parent work.
- No new public route, discovery intent, account requirement, or remote storage is introduced.
- Clipboard content is prepared and written locally in the user’s browser.
- Current generator formatting determines the canonical content ordering; this feature standardises representations rather than redefining generated documents.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of representative document-copy cases provide both a canonical plain representation and a sanitised rich representation when multi-format copying is supported.
- **SC-002**: Representative content containing headings, lists, emphasis, links, tables, and code blocks pastes with readable structure in rich-text destinations and useful Markdown in plain-text destinations.
- **SC-003**: In all tested unavailable or rejected rich-copy cases, the exact canonical Markdown/plain representation is attempted through the fallback; when both paths fail, the operation reports failure without changing source content.
- **SC-004**: Current and historical copies of the same generator result contain 100% of the same user-visible title, main content, sections, and optional supporting material required by the canonical copy contract.
- **SC-005**: 100% of inventoried literal-value Copy actions remain plain-text operations with their value unchanged.
- **SC-006**: All affected Copy controls retain observable success and failure feedback, and all existing copy analytics events continue to be emitted with their established source distinctions.
