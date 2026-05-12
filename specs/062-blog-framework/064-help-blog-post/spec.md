# Feature Specification: Comprehensive Help Guide Blog Post

**Feature Branch**: `064-help-blog-post`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Comprehensive help blog post https://github.com/eserlan/Codex-Cryptica/issues/310"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Onboarding New Users (Priority: P1)

As a new user landing on Codex Cryptica, I want to read a single, comprehensive guide that explains all the core features (Vaults, Sync, Canvas, Oracle) so that I can set up my campaign without getting lost in separate documents.

**Why this priority**: High impact on user retention and initial experience.

**Independent Test**: Verify that a user can access `/blog/comprehensive-help-guide` and see a complete overview of the system's core features.

**Acceptance Scenarios**:

1. **Given** I am a new user on the blog index, **When** I click the "Comprehensive Help Guide" article, **Then** I should see a structured guide covering Vaults, Sync, Canvas, and Oracle.
2. **Given** I am reading the guide, **When** I follow the steps to "Sync with Google Drive", **Then** the instructions should match the actual UI flow.

---

### User Story 2 - Feature Reference for Power Users (Priority: P2)

As an experienced user, I want to quickly jump to specific sections of the comprehensive guide (like Oracle commands) so that I can use it as a reference while working in my vault.

**Why this priority**: Enhances long-term utility of the post.

**Independent Test**: Verify that anchor links within the post (e.g., `#oracle-commands`) navigate to the correct sections.

**Acceptance Scenarios**:

1. **Given** I am on the comprehensive guide, **When** I click on a section in the Table of Contents (if present), **Then** I should be scrolled to that specific section.

---

### Edge Cases

- **Mobile View**: Does the comprehensive guide (which might be long) render correctly and remain readable on small screens?
- **Sync Method Updates**: How does the guide handle users who only use local sync vs. those who use Google Drive? (Expected: Both paths should be clearly delineated).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a new blog article at the slug `comprehensive-help-guide` with the title "Comprehensive Help Guide".
- **FR-002**: The article MUST be written in Markdown and placed in `apps/web/src/lib/content/blog/`.
- **FR-003**: The content MUST provide a comprehensive user journey that synthesizes all existing help articles (from `apps/web/src/lib/content/help/`) and all features (from `FEATURE_HINTS` in `apps/web/src/lib/config/help-content.ts`). The journey MUST cover:
  - **Phase 1: Getting Started**: Welcome, Vault creation, Sync setup (Local & GDrive).
  - **Phase 2: Building Your World**: Creating entities, writing chronicles/lore, and organizing with categories/themes.
  - **Phase 3: Visualizing & Connecting**: Using the Knowledge Graph, Map Mode, and the Spatial Canvas to link and hide secrets (Fog of War).
  - **Phase 4: Advanced Mastery**: Using the Lore Oracle (Slash commands, image generation, node merging, and connection proposals).
  - **Phase 5: Privacy & Best Practices**: Data sovereignty, offline use, and Obsidian integration.
- **FR-004**: The article MUST include a Table of Contents for easy navigation of long content.
- **FR-005**: The article MUST include SEO metadata (title, description) appropriate for a "Getting Started" or "Help" guide.
- **FR-006**: The article MUST use descriptive placeholders for visual content (e.g., `![Vault Setup Screen Placeholder]`) where a screenshot or GIF would be beneficial.
- **FR-007**: Every feature listed in the Features page MUST be explained with its practical "normal use" application (specifically focusing on **Campaign Preparation** for Game Masters and **Active Session Management** during play).

### Key Entities _(include if feature involves data)_

- **Blog Article**: An instance of the `BlogArticle` entity with ID `comprehensive-help-guide`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The article covers 100% of the core modules mentioned in issue #310.
- **SC-002**: The article achieves a Lighthouse Accessibility score of 95+ (consistent with other blog posts).
- **SC-003**: 100% of internal links to other blog posts (e.g., `spatial-intelligence`) are functional.
- **SC-004**: The article is listed on the main blog index page (`/blog`).
- **SC-005**: The guide achieves a Flesch-Kincaid Readability Grade Level of 8-10, ensuring it is accessible to a broad audience while remaining technically accurate.
