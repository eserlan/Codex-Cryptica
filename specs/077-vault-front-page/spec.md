# Feature Specification: Vault Front Page

**Feature Branch**: `077-vault-front-page`  
**Created**: 2026-04-02  
**Status**: Implemented  
**Input**: User description: "campaign/world/vault front page https://github.com/eserlan/Codex-Cryptica/issues/533"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Vault Overview (Priority: P1)

As a GM or player, I want a clear landing page when I open a vault, so I can immediately understand the world and decide where to go next.

**Why this priority**: The front page is the first context a user sees. It should orient them before they dive into the graph or entity details.

**Independent Test**: Open a vault and verify that a front page renders with the vault title, tagline, and summary area.

**Acceptance Scenarios**:

1. **Given** a vault with saved metadata, **When** the vault opens, **Then** the front page shows the vault title and summary information prominently.
2. **Given** a vault without a saved summary, **When** the front page is viewed, **Then** it shows an editable placeholder and a generated tagline rather than a blank wall of text.

---

### User Story 2 - Front Page Marker (Priority: P1)

As a GM, I want to mark a markdown entity as the campaign's front page, so I can use the richer editor content as the vault landing summary.

**Why this priority**: Some vaults need a richer landing experience than a metadata-only summary. A tagged entity gives them that without new content types.

**Independent Test**: Tag an entity with `frontpage` and verify that its chronicle/body preview is surfaced on the front page.

**Acceptance Scenarios**:

1. **Given** an entity marked `frontpage`, **When** the vault loads, **Then** the front page uses that entity's content as the primary summary source.
2. **Given** multiple entities marked `frontpage`, **When** the front page is rendered, **Then** the most recently modified one is preferred and the others remain available in the relevant entities section.

---

### User Story 3 - Relevant Entities (Priority: P2)

As a user, I want the vault's most relevant recent entities displayed as attractive cards, so I can jump back into work quickly.

**Why this priority**: Recent work should be easy to scan. The cards act as a compact activity surface and entry point into the graph or Zen mode.

**Independent Test**: Edit multiple entities and verify that they render as a responsive card grid with pinned `frontpage` items first.

**Acceptance Scenarios**:

1. **Given** a list of recent entities, **When** the front page is rendered, **Then** each entity appears in a card with its title, category icon, relative time, and a short markdown excerpt.
2. **Given** a screen resize, **When** the front page is viewed, **Then** the card grid adapts responsively without losing the image or text hierarchy.
3. **Given** an entity card, **When** I click it, **Then** the entity opens in the graph and the front page dismisses; **When** I double-click it, **Then** Zen mode opens for that entity.

---

### User Story 4 - Cover Image Identity (Priority: P2)

As a GM, I want the front page to use a strong cover image, so the vault has a clear visual identity.

**Why this priority**: A cover image gives the front page atmosphere and helps the vault feel distinct at a glance.

**Independent Test**: Replace a cover image via drag-and-drop or generate one with the Oracle, then verify it appears as the front page hero art.

**Acceptance Scenarios**:

1. **Given** a current cover image, **When** I open the image lightbox, **Then** I can inspect the front page art in a larger view.
2. **Given** no cover image yet, **When** I drop a local image onto the cover area, **Then** it becomes the vault's cover art and is shown on the front page.
3. **Given** a campaign summary and theme, **When** I generate cover art, **Then** the Oracle produces a portrait-style image and saves it as the cover.

---

### User Story 5 - AI-Powered Summary and Tagline (Priority: P2)

As a GM, I want the Oracle to help me write the front page summary and tagline, so I can keep the landing page polished without writing everything from scratch.

**Why this priority**: The summary should stay short, readable, and thematically aligned with the world.

**Independent Test**: Click the generate action on the front page and verify that the summary or tagline updates from vault content and theme context.

**Acceptance Scenarios**:

1. **Given** a vault with existing content, **When** I generate a summary, **Then** the Oracle produces a concise overview that reflects the setting and its current theme.
2. **Given** an existing summary, **When** I regenerate it, **Then** the current draft is replaced only after a successful generation.

---

### User Story 6 - Front Page Dismissal and Restore (Priority: P2)

As a user, I want to dismiss the front page when I am ready to work, and restore it later from the header, so I can move between overview and graph without friction. I also want it to reappear automatically on a daily basis so it stays useful without feeling nagging.

**Why this priority**: The front page should be a landing layer, not a dead-end. Users need a predictable way to get back to it, and it should surface naturally at the start of each new working day without re-appearing on every reload.

**Independent Test**: Open the front page, dismiss it with the close control or backdrop, then use the header brand button to bring it back. Reload within 24 hours and verify the front page stays dismissed. Reload after 24 hours and verify it reappears.

**Acceptance Scenarios**:

1. **Given** the front page is open, **When** I click outside the content or use the close control, **Then** the graph view is revealed again.
2. **Given** the graph or an entity sidebar is open, **When** I click the header brand, **Then** the front page returns and the selection/sidebar state is cleared.
3. **Given** the front page was dismissed less than 24 hours ago, **When** the app reloads, **Then** the front page remains dismissed.
4. **Given** the front page was dismissed more than 24 hours ago (or never), **When** the app loads, **Then** the front page is shown again.

---

### Edge Cases

- **Empty Vault**: The front page should still show the vault title, a generated tagline, and clear prompts for summary and cover art.
- **Large Descriptions**: The summary area should remain editable without losing the draft, and the preview should stay readable.
- **Missing Metadata**: If the saved title or summary is absent, the UI should fall back to the vault display name and any `frontpage` entity content.
- **Tag Conflict**: If multiple entities are marked `frontpage`, the most recently modified one is the primary summary source and the cards stay pinned in recent entities.
- **Missing Card Content**: If an entity has no excerpt, the card should show a placeholder rather than breaking layout.
- **Missing Cover Image**: If no cover exists, the front page should show the drop zone and generate action instead of a broken hero.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a dedicated front page as the default landing view when a vault is loaded.
- **FR-002**: System MUST show the vault title, tagline, and summary on the front page.
- **FR-003**: System MUST support fallback content for the front page summary using the most recent entity marked `frontpage` when a saved summary is unavailable.
- **FR-004**: System MUST display a relevant-entities section using a cohesive card-based layout.
- **FR-005**: Entity cards MUST include the entity title, a category icon, a brief markdown-rendered excerpt, and last-modified relative time.
- **FR-006**: Entity cards MUST surface tags when available and MUST keep `frontpage`-marked items pinned above the rest.
- **FR-007**: Entity cards MUST support single-click graph selection and double-click Zen mode entry.
- **FR-008**: System MUST allow users to edit the campaign title, tagline, and summary directly from the front page.
- **FR-009**: System MUST support Markdown rendering for the campaign summary and the `frontpage` entity content.
- **FR-010**: System MUST allow the user to set a campaign cover image by replacing it with a local drag-and-drop image or by generating one through the Oracle.
- **FR-011**: Oracle cover generation MUST use the current summary, the active theme, and the theme's thematic description to guide the output.
- **FR-012**: System MUST reserve `frontpage` as a special marker and prioritize the most recently modified matching entity when more than one exists.
- **FR-013**: If no `frontpage` entity exists, the system MUST fall back to the saved front page summary; if no title exists, it MUST fall back to the readable vault name.
- **FR-014**: System MUST provide an AI generate/refine option for the campaign summary using the Oracle.
- **FR-015**: System MUST provide a close control and backdrop dismissal for the front page, and the header brand MUST restore the front page from elsewhere in the app.
- **FR-016**: System MUST persist the front page dismissal timestamp and suppress the front page for 24 hours after each dismissal; after 24 hours the front page MUST reappear on the next load.
- **FR-017**: When the user explicitly restores the front page via the header brand, the dismissal timestamp MUST be cleared so the front page shows again on the next load.

### Key Entities _(include if feature involves data)_

- **Vault Metadata**: Represents the high-level information about the campaign, including title, tagline, summary, cover image reference, and last modified time.
- **Recent Activity Log**: A collection of recently modified entities used to populate the relevant entities cards.
- **Front Page Entity**: A standard markdown entity marked with the `frontpage` marker that provides the richer landing-page summary.
- **Entity Card**: A UI component that encapsulates an entity's summary information for grid display and graph/Zen entry.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can dismiss the front page and return to the graph from a single click on the backdrop or close control.
- **SC-002**: The front page loads and renders the vault metadata in under 500ms after the vault is initialized.
- **SC-003**: Newly created vaults display a readable title, a generated tagline, and an empty-state summary prompt on first load.
- **SC-004**: AI image generation produces a saved cover image reference within 10 seconds of request.
- **SC-005**: Relevant entity cards accurately reflect recent edits, and `frontpage`-marked items stay pinned to the top of the list.
- **SC-006**: Tagging any entity with `frontpage` updates the front page summary source on the next load or manual refresh.
- **SC-007**: The entity card grid remains responsive between mobile and desktop viewports.
- **SC-008**: AI summary generation produces a concise, theme-aware summary or tagline within 15 seconds.
- **SC-009**: The front page does not reappear between reloads within the same working session (24-hour window), but does reappear automatically the next day.
