# Feature Specification: Campaign/World/Vault Front Page

**Feature Branch**: `077-vault-front-page`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "campaign/world/vault front page https://github.com/eserlan/Codex-Cryptica/issues/533"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Campaign Overview (Priority: P1)

As a GM or player, I want to see a clear summary of the campaign when I open a vault, so I can immediately understand the context and scope of the world I am entering.

**Why this priority**: This is the primary entry point for any campaign. Without a front page, the user is dropped directly into complex views (graph or files) without initial orientation.

**Independent Test**: Can be fully tested by opening a vault and verifying that a summary page is displayed with the campaign's title and description.

**Acceptance Scenarios**:

1. **Given** a vault with a defined name and description, **When** the vault is opened, **Then** the user is presented with a "Front Page" showing the name and description prominently.
2. **Given** a new vault without a description, **When** the front page is viewed, **Then** it should show a placeholder or prompt to add a campaign description.

---

### User Story 2 - Customizable Front Page via Tag (Priority: P1)

As a GM, I want to designate a specific markdown entity as my campaign's front page by using the "frontpage" tag, so I can use the full formatting power of the editor to create a unique landing experience.

**Why this priority**: Allows for maximum flexibility. Users can curate exactly what information is shown (maps, links, lore) using existing system features like tags and markdown.

**Independent Test**: Can be tested by tagging an entity with "frontpage" and verifying that its content is rendered as the main body of the Front Page view.

**Acceptance Scenarios**:

1. **Given** an entity with the tag "frontpage", **When** the vault is loaded, **Then** the content of that entity is displayed as the primary information on the Front Page.
2. **Given** multiple entities with the "frontpage" tag, **When** the Front Page is rendered, **Then** the system uses the most recently modified one and provides a way to manage/view others.

---

### User Story 3 - Cohesive Entity Visualization (Priority: P2)

As a user, I want my recently modified entities to be displayed as visually pleasing "cards" on the front page, so I can quickly identify and access my recent work through a clear, modern interface.

**Why this priority**: Visual hierarchy and modern UI patterns significantly improve the user's perception of "polish" and ease of use. Cards provide a structured way to digest information at a glance.

**Independent Test**: Can be tested by viewing the Front Page and verifying that entities are displayed in a grid of uniform, styled cards rather than a simple text list.

**Acceptance Scenarios**:

1. **Given** a list of recent entities, **When** the Front Page is rendered, **Then** each entity is shown in a card containing its title, a short excerpt, and relevant tags.
2. **Given** a screen resize, **When** the Front Page is viewed, **Then** the entity card grid adjusts responsively (e.g., from 3 columns to 1 column).

---

### User Story 4 - Navigation to Core Views (Priority: P2)

As a user, I want to quickly jump from the campaign summary to specific working views (Graph, Files, Oracle), so I can start my session efficiently.

**Why this priority**: The front page serves as a hub. Its value is maximized by acting as a gateway to the rest of the application's features.

**Independent Test**: Can be tested by clicking navigation elements on the front page and verifying they lead to the correct application states.

**Acceptance Scenarios**:

1. **Given** I am on the front page, **When** I click the "Explore World" action, **Then** the application switches to the Graph view.
2. **Given** I am on the front page, **When** I click the "Browse Vault" action, **Then** the application switches to the File Explorer view.

---

### User Story 5 - Visual World Identity (Priority: P2)

As a GM, I want to set a representative image for my campaign, either by uploading my own, linking to a URL, or having the Lore Oracle generate one for me, so the campaign has a strong visual identity.

**Why this priority**: Enhances immersion and provides an immediate emotional connection to the setting.

**Independent Test**: Can be tested by setting an image via each method (Upload, URL, Oracle Generate) and verifying it displays correctly on the front page.

**Acceptance Scenarios**:

1. **Given** a campaign description, **When** I trigger "Generate Image", **Then** the Oracle produces a relevant piece of cover art and sets it as the campaign image.
2. **Given** a local image file, **When** I upload it as the campaign image, **Then** it is saved to the vault and displayed on the front page.

---

### User Story 6 - AI-Powered Campaign Summary (Priority: P2)

As a GM, I want the Lore Oracle to generate or refine my campaign description based on the existing entities in my vault, so I can have a professional-sounding overview without writing it from scratch.

**Why this priority**: Lowers the barrier to entry for campaign world-building and ensures the front page stays relevant as the world evolves.

**Independent Test**: Can be tested by clicking "Generate Summary" on the front page and verifying the Oracle produces a description based on vault content.

**Acceptance Scenarios**:

1. **Given** a vault with several character and location entities, **When** I request an AI summary, **Then** the Oracle produces a cohesive campaign description referencing those key elements.
2. **Given** an existing description, **When** I request a refinement, **Then** the Oracle provides an improved version while preserving core details.

---

### Edge Cases

- **Empty Vault**: How does the front page look when there are no entities yet? (Should show a "Get Started" guide).
- **Large Descriptions**: How does the UI handle campaign descriptions that are several paragraphs long? (Should use appropriate scrolling or truncation with a "Read More" option).
- **Missing Metadata**: What happens if the vault configuration file is corrupted or missing title/description? (Should fall back to the folder name as the title).
- **Tag Conflict**: Multiple entities tagged "frontpage" (Resolution: use most recent).
- **Missing Card Content**: What if an entity has no text excerpt? (Should show a placeholder or just the title/tags).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a dedicated "Front Page" as the default view when a vault is loaded.
- **FR-002**: System MUST show the Vault Name and Campaign Description on the Front Page.
- **FR-003**: System MUST provide clear navigation buttons/links to:
  - World Map / Graph View
  - File Explorer / Vault View
  - Lore Oracle / AI Assistant
- **FR-004**: System MUST display a "Recent Entities" section using a cohesive card-based layout.
- **FR-005**: Entity Cards MUST include:
  - Entity Title
  - Brief excerpt (first ~150 characters)
  - Metadata tags (if applicable)
  - Last modified relative time (e.g., "2 hours ago")
- **FR-006**: System MUST allow users to edit the Campaign Description directly from the Front Page (or via a clear "Edit" link).
- **FR-007**: System MUST support Markdown rendering for the Campaign Description and the "frontpage" entity content.
- **FR-008**: System MUST allow the user to set a "Campaign Image" or "Cover Art". Options MUST include:
  - Local File upload (saved to the vault).
  - External URL reference.
  - AI Generation via the Lore Oracle.
- **FR-009**: Lore Oracle integration MUST allow for generating a relevant campaign image based on the current Campaign Description.
- **FR-010**: System MUST reserve the tag "frontpage" as a special system tag.
- **FR-011**: System MUST use the content of the entity tagged with "frontpage" as the main descriptive content of the Front Page view.
- **FR-012**: If no entity is tagged with "frontpage", the system MUST fall back to a default campaign summary derived from vault metadata.
- **FR-013**: If multiple entities are tagged with "frontpage", the system MUST prioritize the one with the most recent `lastModified` timestamp.
- **FR-014**: System MUST provide an "AI Generate/Refine" option for the Campaign Description using the Lore Oracle.

### Key Entities _(include if feature involves data)_

- **Vault Metadata**: Represents the high-level information about the campaign (Title, Description, Cover Image Reference, Created Date).
- **Recent Activity Log**: A collection of references to recently modified entities, used to populate the "Recent" list.
- **Front Page Entity**: A standard Markdown entity that contains the "frontpage" tag and provides the rich content for the landing view.
- **Entity Card**: A UI component that encapsulates an entity's summary information for grid display.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can access the Graph view from the landing page in a single click.
- **SC-002**: The Front Page loads and renders all metadata in under 500ms after the vault is initialized.
- **SC-003**: 100% of newly created vaults correctly display the default "Front Page" template.
- **SC-004**: AI Image Generation produces a set image reference in the vault within 10 seconds of request.
- **SC-005**: Users report that the "Recent Entities" cards accurately reflect their most recent edits 100% of the time.
- **SC-006**: Tagging any entity with "frontpage" instantly updates the Front Page view upon the next load or manual refresh.
- **SC-007**: Entity card grid is fully responsive, adjusting layout seamlessly between mobile and desktop viewports.
- **SC-008**: AI Description generation produces a cohesive ~100-word summary in under 15 seconds.
