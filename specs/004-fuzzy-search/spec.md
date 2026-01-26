# Feature Specification: Fuzzy Search

**Feature Branch**: `004-fuzzy-search`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "a fuzzy search feature"

## User Scenarios & Testing

### User Story 1 - Global Note Navigation (Priority: P1)

As a user, I want to quickly find and open notes by typing their name, even with typos, so I can navigate my vault efficiently without browsing folders.

**Why this priority**: Core functionality for a knowledge base; navigating by file tree is slow for large vaults.

**Independent Test**: Can be tested by opening the search modal, typing a partial or slightly misspelled name of an existing note, and verifying the correct note appears and can be opened.

**Acceptance Scenarios**:

1. **Given** a vault with a note named "Black Iron Tavern", **When** I open search and type "iron tavrn", **Then** "Black Iron Tavern" appears in the results.
2. **Given** search results are visible, **When** I press Enter on a result, **Then** the selected note opens in the editor and the search modal closes.
3. **Given** I am editing a note, **When** I press the search hotkey (e.g., Cmd/Ctrl+K), **Then** the search input field appears and gathers focus.

---

### User Story 2 - Search Within Content (Priority: P2)

As a user, I want to find notes that contain specific keywords in their body text, so I can retrieve information when I don't recall the note's title.

**Why this priority**: Enhances retrievability of information buried inside notes.

**Independent Test**: Create a note with unique content but unrelated title. Search for the unique content phrase.

**Acceptance Scenarios**:

1. **Given** a note "Meeting Notes" containing "Project Alpha deadline", **When** I search for "Alpha deadline", **Then** "Meeting Notes" appears in the results.
2. **Given** matches in both title and content, **When** I search, **Then** title matches appear ranked higher than content-only matches.

---

### User Story 3 - Keyboard Navigation (Priority: P2)

As a user, I want to navigate the search results using arrow keys, so I don't have to switch to the mouse during my workflow.

**Why this priority**: Critical for power user workflow and speed.

**Independent Test**: Open search, type a query, use Down Arrow to select second result, press Enter.

**Acceptance Scenarios**:

1. **Given** a list of search results, **When** I press the Down Arrow, **Then** the selection moves to the next item.
2. **Given** the last item is selected, **When** I press Down Arrow, **Then** the selection loops to the top.
3. **Given** a selected item, **When** I press Escape, **Then** the search modal closes without changing the active note.

### Edge Cases

- **No Matches**: When no notes match the query, the system MUST display a "No results found" message.
- **Empty Query**: When the search bar is opened but nothing is typed, the system SHOULD display recently opened notes.
- **Special Characters**: System MUST handle queries with special characters (e.g., "C++", "User's Guide") gracefully.
- **Large Vaults**: Search performance should remain acceptable (< 500ms) for vaults up to 10,000 notes.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a search modal/interface triggered by a global keyboard shortcut (defaulting to Cmd/Ctrl+K).
- **FR-002**: System MUST perform fuzzy matching on note titles, tolerating character swaps, missing characters, and phonetic similarities.
- **FR-003**: System MUST index note content and allow searching within body text.
- **FR-004**: System MUST return results ranked by relevance (Exact Title Match > Fuzzy Title Match > Exact Content Match > Fuzzy Content Match).
- **FR-005**: System MUST highlight the matching terms in the result display.
- **FR-006**: System MUST update the search index when notes are created, renamed, or deleted.
- **FR-007**: System MUST allow navigating the result list with Up/Down arrow keys and selecting with Enter.
- **FR-008**: The search interface MUST visually distinguish between matches in the title vs. matches in the content.
- **FR-009**: System MUST provide a persistent search bar in the application header as a primary input for global navigation and discovery.

### Key Entities

- **SearchIndex**: In-memory structure mapping tokens/ngrams to entity IDs.
- **SearchResult**: Contains `entityId`, `score`, `matchType` ('title'/'content'), and `highlights`.

### Assumptions & Dependencies

- **Assumption**: The entire vault index can fit in client-side memory.
- **Assumption**: Search runs locally in the browser/client (no server-side search API required).
- **Dependency**: Requires access to the file system or abstraction layer to read all notes for indexing.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Search results appear within 200ms of the last keystroke for a vault of up to 1000 notes.
- **SC-002**: Searching for a note title with up to 2 character errors (typos) still returns the correct note in the top 3 results.
- **SC-003**: A user can navigate from "not searching" to "note opened" in under 5 seconds using keyboard only.
- **SC-004**: Indexing a new note takes less than 500ms so it is immediately searchable.
