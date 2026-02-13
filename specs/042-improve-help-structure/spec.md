# Feature Specification: Improve Help Structure

**Feature Branch**: `042-improve-help-structure`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "make it easier to create and manage help articles by writing them in Markdown (md) format and then rendering them directly within the help section"

## User Scenarios & Testing

### User Story 1 - Markdown Content Management (Priority: P1)

As a developer or content creator, I want to write help articles as individual Markdown files so that I can manage documentation versioning and structure more effectively than a large JSON object.

**Why this priority**: This is the core requirement to improve the developer experience and maintainability of the help system.

**Independent Test**: Can be tested by adding a new `.md` file to the content directory and verifying it is loaded by the application.

**Acceptance Scenarios**:

1. **Given** a new file `test-article.md` is added to `apps/web/src/lib/content/help/`, **When** the application loads, **Then** the article is available in the help store.
2. **Given** an article with frontmatter `title: "My Guide"`, **When** parsed, **Then** the title is correctly extracted.

---

### User Story 2 - Help Article Rendering (Priority: P2)

As a user, I want to view the help articles in the Help section so that I can read the documentation with proper formatting.

**Why this priority**: Users need to see the content.

**Independent Test**: Can be tested by navigating to the Help tab in Settings and opening an article.

**Acceptance Scenarios**:

1. **Given** a help article with Markdown syntax (headers, lists, bold), **When** viewed in the Help tab, **Then** it renders with correct HTML formatting.
2. **Given** the Help tab is open, **When** the list of articles is displayed, **Then** it shows the titles defined in the Markdown frontmatter.

---

### User Story 3 - Search Integration (Priority: P3)

As a user, I want to search for these new articles so that I can find specific information quickly.

**Why this priority**: Discoverability is key for help content.

**Independent Test**: Can be tested by typing a keyword from a Markdown file into the search bar.

**Acceptance Scenarios**:

1. **Given** a help article contains the word "Flux Capacitor", **When** searching for "Flux", **Then** the article appears in the search results.

---

### Edge Cases

- **Missing Frontmatter**: If a file lacks frontmatter, it should be skipped and a warning logged to the console.
- **Duplicate IDs**: If two files specify the same `id` in frontmatter, the system MUST log a warning and use the last loaded file (based on glob order).
- **Invalid Markdown**: The renderer should handle malformed markdown gracefully without crashing.

## Requirements

### Functional Requirements

- **FR-001**: System MUST load help articles from `apps/web/src/lib/content/help/*.md` (or similar path) at build/runtime.
- **FR-002**: System MUST parse YAML frontmatter to extract metadata: `id`, `title`, `tags`, `rank` (optional).
- **FR-003**: System MUST expose the parsed articles via a store or service compatible with the existing `HelpArticle` interface.
- **FR-004**: The existing `HELP_ARTICLES` constant in `help-content.ts` MUST be replaced or populated by this file loader.
- **FR-005**: Articles MUST be sorted by `rank` (ascending) if present, then by title.

### Key Entities

- **HelpArticle**: Existing entity, now populated from files.
  - `id`: string (from frontmatter)
  - `title`: string (from frontmatter)
  - `tags`: string[] (from frontmatter)
  - `content`: string (markdown body)
  - `rank`: number (optional, for sorting)

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of existing hardcoded help articles are migrated to individual Markdown files.
- **SC-002**: Adding a new file requires NO code changes to `help-content.ts` or other logic files for it to appear in the app.
