# Feature Specification: Intelligent Oracle Data Separation

**Feature Branch**: `022-oracle-data-parsing`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: User description: "better oracle output interpretation. when the user creates info about a node, where we get both chronicle and lore data, id like the copy to node function to intelligently separate chronicle data (the short desc) and the rest, and place it appropriately in the model (and reflected in the ui) that way the user dont have to copy chronicle data from the lore gen into the chronicle section of the deails panel"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Intelligent "Copy to Node" (Priority: P1)

As a lore builder, when I generate content for a node using the Oracle, I want the system to automatically identify the short summary (Chronicle) and the detailed history (Lore) from the AI's output and update the node's corresponding fields in one click.

**Why this priority**: This is the core request. It eliminates the manual effort of "copy-pasting twice" and makes the Oracle workflow significantly smoother.

**Independent Test**: Can be tested by generating a response with clearly labeled sections and clicking "Copy to Node", then verifying both fields are populated correctly.

**Acceptance Scenarios**:

1. **Given** an Oracle response containing specific headers for "Chronicle" and "Lore", **When** I click "Copy to Node", **Then** the "Chronicle" field in the node details is updated with the summary content, and the "Lore" field is updated with the detailed content.
2. **Given** an Oracle response where both sections are detected, **When** I apply it to a node, **Then** the UI immediately reflects the new values in both the Chronicle and Lore sections of the details panel.

---

### User Story 2 - Heuristic Fallback for Unstructured Output (Priority: P2)

As a user, if the Oracle generates content without explicit "Chronicle" or "Lore" headers, I want the system to still attempt a reasonable separation so that I don't have a completely empty Chronicle field.

**Why this priority**: Enhances robustness. Not all AI models or prompts might produce perfectly formatted headers every time.

**Independent Test**: Generate a plain text response without headers and verify the system's logic for splitting (e.g., first paragraph to Chronicle).

**Acceptance Scenarios**:

1. **Given** an Oracle response with no explicit headers, **When** "Copy to Node" is clicked, **Then** the system uses a heuristic (e.g., first paragraph or first 200 characters) to populate the Chronicle field.
2. **Given** an Oracle response with no explicit headers, **When** "Copy to Node" is clicked, **Then** the remaining content (after the heuristic split) is placed in the Lore field.

---

### User Story 3 - Visual Confirmation of Separation (Priority: P3)

As a user, I want to see how the system intends to split the content before it overwrites my node data, so I can be sure nothing is lost.

**Why this priority**: Safety and user confidence. Prevents accidental loss of existing data if the AI output is unexpected.

**Independent Test**: Check for a preview or visual indicator in the Oracle UI showing which parts are identified as Chronicle vs Lore.

**Acceptance Scenarios**:

1. **Given** a generated Oracle response, **When** I hover over or look at the "Copy to Node" option, **Then** I see a brief indication of what content is destined for which field.

---

### Edge Cases

- **Existing Data**: How does the system handle nodes that already have a Chronicle or Lore? (Assumption: It overwrites existing data with the new generation, as is typical for the "apply" pattern).
- **Incomplete Output**: What if the Oracle only generates Lore? (Assumption: Chronicle is left as-is or cleared if the user explicitly requested a "re-generation").
- **Formatting Preservation**: Ensure Markdown formatting within the separated sections is preserved during the split.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST parse Oracle output for specific markers (e.g., `## Chronicle`, `**Chronicle:**`, `## Lore`, `**Lore:**`) to identify separate data segments.
- **FR-002**: System MUST support a heuristic fallback: if no markers are found, the first logical block (paragraph) is treated as Chronicle, and the rest as Lore.
- **FR-003**: The "Copy to Node" (or "Apply to Node") action MUST update multiple fields in the node's data model simultaneously.
- **FR-004**: The Node Details UI MUST automatically update to reflect changes to both Chronicle and Lore fields without requiring a page refresh.
- **FR-005**: System MUST strip the identification markers (e.g., the "Chronicle:" text itself) when populating the destination fields if they are purely labels.

### Key Entities

- **Oracle Response**: The raw text returned by the generative AI, containing mixed lore and metadata.
- **Node**: The target entity.
  - **Chronicle**: A short (1-2 sentence) summary or description.
  - **Lore**: A detailed markdown-supported history or description.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users spend 0 seconds manually copy-pasting text between Chronicle and Lore fields when using the Oracle "Copy to Node" function.
- **SC-002**: 100% of correctly formatted Oracle responses (containing standard headers) result in perfect field separation.
- **SC-003**: UI reflects node field updates in under 100ms after the "Copy to Node" action is triggered.
- **SC-004**: The heuristic fallback correctly identifies a summary paragraph in at least 90% of unstructured lore generations.