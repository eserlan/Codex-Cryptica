# Feature Specification: Rich Text Formatting Controls

**Feature Branch**: `030-rich-text-formatting`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "better rich text formatting controls in edit mode, both detail panel and zen mode"

## User Scenarios & Testing

### User Story 1 - Apply Formatting in Detail Panel (Priority: P1)

As an editor, I want to format my text (bold, italic, lists) using visible controls in the Detail Panel so that I don't have to remember or type all Markdown syntax manually.

**Why this priority**: Core requirement for "better controls". Essential for non-technical users or for speed.

**Independent Test**: Can be fully tested by opening a node in the Detail Panel and using the toolbar to format text.

**Acceptance Scenarios**:

1. **Given** I am editing a node in the Detail Panel, **When** I select text and click the "Bold" button, **Then** the text is wrapped in Markdown bold syntax (`**text**`).
2. **Given** I am editing in the Detail Panel, **When** I click "Heading 1", **Then** the current line becomes a level 1 heading (`# text`).
3. **Given** I am in the Detail Panel, **When** I click "Unordered List", **Then** a bullet point is inserted or the line becomes a list item.

---

### User Story 2 - Apply Formatting in Zen Mode (Priority: P1)

As an editor, I want to have the same formatting controls available when writing in Zen Mode so that I can focus on writing without losing formatting capabilities.

**Why this priority**: Ensures consistency across editing modes, which is explicitly requested ("both detail panel and zen mode").

**Independent Test**: Can be fully tested by entering Zen Mode and using the toolbar.

**Acceptance Scenarios**:

1. **Given** I am in Zen Mode, **When** I look for formatting controls, **Then** a toolbar (fixed or floating) is visible and accessible.
2. **Given** I am in Zen Mode, **When** I use the controls to insert a link, **Then** the link syntax `[text](url)` is inserted correctly.

---

### User Story 3 - Keyboard Shortcuts (Priority: P2)

As a power user, I want standard keyboard shortcuts to work alongside visual controls so that I can format text without lifting my hands from the keyboard.

**Why this priority**: Improving the editing experience ("better controls") includes keyboard efficiency.

**Independent Test**: Can be tested by using keyboard combinations like Ctrl+B or Ctrl+I.

**Acceptance Scenarios**:

1. **Given** I have text selected, **When** I press Ctrl+B (or Cmd+B), **Then** the text is toggled to Bold.
2. **Given** I have text selected, **When** I press Ctrl+I (or Cmd+I), **Then** the text is toggled to Italic.

---

### Edge Cases

- What happens when a user applies multiple formats (e.g., Bold + Italic)? The system should nest them correctly.
- How does the system handle formatting when selection spans multiple paragraphs? (e.g., Bold across two paragraphs).
- What happens if the cursor is inside existing formatting when the button is clicked again? (It should toggle/remove the formatting).

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a visual toolbar containing buttons for common Markdown formatting operations.
- **FR-002**: The formatting toolbar MUST include at minimum: Bold, Italic, Heading 1, Heading 2, Heading 3, Unordered List, Ordered List, Link, Blockquote, and Code Block.
- **FR-003**: The toolbar MUST be visible and functional in the Detail Panel edit view.
- **FR-004**: The toolbar MUST be visible and functional in the Zen Mode edit view.
- **FR-005**: Clicking a formatting button MUST insert the correct Markdown syntax around the selected text or at the cursor position.
- **FR-006**: The system MUST support standard keyboard shortcuts (Ctrl+B/Cmd+B for Bold, Ctrl+I/Cmd+I for Italic) in both edit modes.
- **FR-007**: The system MUST maintain focus on the editor text area after a formatting button is clicked to allow continued typing.

### Key Entities

- **Editor State**: Captures current selection range and content to apply formatting.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can apply basic formatting (Bold, Italic, Lists) using only the mouse/touch interface.
- **SC-002**: Formatting controls are present in 100% of edit sessions in both Detail Panel and Zen Mode.
- **SC-003**: Text selection is preserved (or logically updated) after a formatting action is triggered.
