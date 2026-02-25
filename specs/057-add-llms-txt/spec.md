# Feature Specification: Implement llms.txt standard

**Feature Branch**: `057-add-llms-txt`  
**Created**: 2026-02-22  
**Status**: Draft  
**Input**: User description: "intro llms.txt https://github.com/eserlan/Codex-Cryptica/issues/229"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - AI Agent Context Ingestion (Priority: P1)

As an AI coding agent or search engine, I want to quickly understand the core purpose and architecture of Codex Cryptica by reading a specialized Markdown file at the root of the domain, so that I can provide accurate information or assistance without wasting tokens on irrelevant HTML or multiple requests.

**Why this priority**: High. Enables modern AI tools to interact efficiently with the project, reducing latency and cost for users of AI IDEs or search engines.

**Independent Test**: Can be fully tested by fetching `https://codexcryptica.com/llms.txt` and verifying it returns valid Markdown with the required sections and descriptions.

**Acceptance Scenarios**:

1. **Given** an AI agent visits the site root, **When** it requests `/llms.txt`, **Then** it receives a concise Markdown summary of the project with links to other documentation.
2. **Given** an AI agent reads `llms.txt`, **When** it sees the link to `llms-full.txt`, **Then** it can fetch the full documentation knowledge base in a single concatenated file.

---

### User Story 2 - Developer Onboarding via AI IDEs (Priority: P2)

As a developer using Cursor, Windsurf, or Bolt, I want to point my IDE to the Codex Cryptica URL to "add documentation," so that the IDE can automatically discover the `llms.txt` file and provide me with better code completions and architectural insights based on the curated technical content.

**Why this priority**: Medium. Improves the developer experience for contributors and users of the project who use AI-powered tools.

**Independent Test**: Can be tested by adding the site URL to a supported AI IDE and verifying it discovers the documentation metadata and uses the flattened file.

**Acceptance Scenarios**:

1. **Given** a developer points an AI IDE to the site, **When** the IDE looks for documentation, **Then** it finds the `<link rel="llms">` tag in the HTML head and follows it to `llms.txt`.

---

### Edge Cases

- **Broken Documentation Links**: What happens if a link in `llms.txt` points to a 404 page? (Acceptance: All links in `llms.txt` must be validated during build/manual update).
- **Inconsistent Content**: How do we ensure `llms-full.txt` doesn't contain duplicated or conflicting content from multiple sources? (Acceptance: Content must be flattened into a logical, readable order).
- **Search Engine Blocking**: What if `robots.txt` blocks the `.txt` extension? (Acceptance: `robots.txt` must explicitly allow `/llms.txt` and `/llms-full.txt`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a `/llms.txt` file at the domain root in Markdown format.
- **FR-002**: System MUST provide a `/llms-full.txt` file at the domain root containing a "flattened" version of the entire core documentation knowledge base.
- **FR-003**: `llms.txt` MUST include an H1 title, a blockquote summary of the project, and H2 sections categorizing important documentation/pages.
- **FR-004**: Each link in `llms.txt` MUST have a brief description to help AI agents decide which page to crawl.
- **FR-005**: System MUST update `robots.txt` to explicitly allow AI crawlers to access `/llms.txt` and `/llms-full.txt`.
- **FR-006**: The homepage HTML MUST include a `<link rel="llms" href="/llms.txt">` tag in the `<head>` for discoverability.
- **FR-007**: `llms-full.txt` content MUST include current architectural details, specifically: OPFS storage, Svelte 5 logic, local-first principles, and core entity schemas.
- **FR-008**: The implementation MUST be compatible with the static build process (`@sveltejs/adapter-static`).

### Key Entities _(include if feature involves data)_

- **llms.txt**: The "Map" file. Markdown format. Acts as the entry point.
- **llms-full.txt**: The "Knowledge Base" file. Single, concatenated Markdown. Contains flattened documentation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `/llms.txt` and `/llms-full.txt` return HTTP 200 status codes on the production domain.
- **SC-002**: `llms.txt` file size is under 10KB.
- **SC-003**: `llms-full.txt` includes at least README content, ADRs, and core schema definitions.
- **SC-004**: AI IDEs (e.g. Cursor) can successfully ingest site documentation using the provided standard.
