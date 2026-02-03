# Feature Specification: Patreon Support Link

**Feature Branch**: `033-patreon-support-link`
**Created**: 2026-02-03
**Status**: Draft
**Issue**: [eserlan/Codex-Cryptica#75](https://github.com/eserlan/Codex-Cryptica/issues/75)
**Input**: User description: "id like to have a subtle link to support me on patreon in the footer"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Support Creator via Footer (Priority: P1)

As a user who enjoys the application, I want to see a link to support the creator on Patreon in the footer so that I can easily navigate to their Patreon page.

**Why this priority**: This is the core functionality requested. It allows users to support the project.

**Independent Test**: Can be fully tested by verifying the link exists in the footer and navigates to the correct URL.

**Acceptance Scenarios**:

1. **Given** I am on any page of the application (except popup/legal pages where footer might be hidden), **When** I scroll to the bottom, **Then** I see a "Support on Patreon" (or similar) link in the footer.
2. **Given** the Patreon link is visible, **When** I inspect the link style, **Then** it matches the existing "subtle" footer link styling (small mono font, uppercase).
3. **Given** the Patreon link is visible, **When** I click it, **Then** it opens the configured Patreon URL in a new tab.

---

### Edge Cases

- What happens when the Patreon URL is not configured? (Ideally, the link should be hidden or point to a default/placeholder).
- What happens on mobile layouts? (The link should stack or align correctly within the existing responsive footer).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application footer MUST include a link labeled "Support on Patreon" (or concise equivalent like "Patreon").
- **FR-002**: The link MUST open in a new tab (`target="_blank"`).
- **FR-003**: The link MUST use the same visual styling as existing footer links (e.g., Privacy Policy, Terms of Service) to ensure it is "subtle".
- **FR-004**: The URL for the link MUST be configurable (e.g., via a constant or environment variable) to allow for easy updates.

### Assumptions

- The footer exists in the main layout (`+layout.svelte`).
- There are existing footer links to match styling against.
- The user has a specific Patreon URL (placeholder `https://patreon.com/` will be used if not provided).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The "Support on Patreon" link appears in the footer on all standard pages.
- **SC-002**: Clicking the link opens the correct external URL in a new tab.
- **SC-003**: The link text is legible but unobtrusive (matches existing footer design).