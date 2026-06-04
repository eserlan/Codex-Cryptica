# Feature Specification: Regen Instruction Modal

**Feature Branch**: `1079-regen-instruction-modal`  
**Created**: 2026-06-01  
**Status**: Approved  
**Input**: User description: "When we click regen in entity sidebar or zen modes, we should get a modal popup to give instruction that provide highest priority input to ai for regen/recon"

## User Scenarios & Testing

### User Story 1 - Optional Instruction on Regenerating (Priority: P1)

As a GM/player, when I click the "Regenerate Content" / "AI Regenerate Description" button in the entity detail panel or Zen Mode toolbar, I want a modal to pop up asking for optional high-priority instructions or corrections for the AI, so that I can guide the AI content generation.

**Why this priority**: Core value of the feature; allows targeted corrections instead of blind regeneration.

**Independent Test**:

- Open an entity in the detail sidebar.
- Click the "Regenerate Description" button.
- Verify a modal dialog appears titled "Regenerate Description".
- Type custom instructions (e.g. "Focus on their secret alliance with the Ironhold faction") and click "Generate".
- Verify the AI processes this instruction, showing the generation progress, and that the resulting draft reflects the instruction.
- If "Cancel" is clicked, verify the modal closes and no regeneration starts.

**Acceptance Scenarios**:

1. **Given** a vault with an entity selected, **When** I click the regeneration button, **Then** a modal opens with a text area and action buttons.
2. **Given** the modal is open, **When** I fill in instructions and click "Generate", **Then** the modal closes and regeneration starts using the instructions.
3. **Given** the modal is open, **When** I click "Cancel", **Then** the modal closes and no regeneration starts.
4. **Given** the modal is open, **When** I leave the textarea empty and click "Generate", **Then** the modal closes and regeneration starts with standard defaults.

---

### User Story 2 - Keyboard Accessibility and Escape Handling (Priority: P2)

As a user navigating the application via keyboard, I want the modal to be fully keyboard accessible (focus trap, Escape to cancel, Enter / Ctrl+Enter to submit), so that it follows accessibility guidelines.

**Why this priority**: Ensures standard accessibility and fits the project's quality guidelines.

**Independent Test**:

- Open the regeneration modal.
- Verify focus is automatically placed inside the text area.
- Verify pressing `Escape` closes the modal.
- Verify pressing `Ctrl + Enter` inside the text area submits the form and starts regeneration.

**Acceptance Scenarios**:

1. **Given** the regeneration modal is open, **When** I press Escape, **Then** the modal closes.
2. **Given** the regeneration modal is open, **When** I press Ctrl+Enter inside the text area, **Then** the modal submits and closes.

---

## Requirements

### Functional Requirements

- **FR-001**: Clicking the AI regeneration button in the entity detail sidebar or Zen Mode toolbar MUST open the "Regenerate Description" modal rather than starting regeneration immediately.
- **FR-002**: The modal MUST display a text area for entering optional custom instructions/corrections.
- **FR-003**: The modal MUST provide two primary actions: "Generate" (submits the form and starts regeneration) and "Cancel" (closes the modal without action).
- **FR-004**: If instructions are provided, they MUST be injected into the regeneration prompt as the highest-priority directive for the AI model.
- **FR-005**: If no instructions are provided (empty textarea), the system MUST perform the standard regeneration.
- **FR-006**: The modal UI MUST adopt the app chrome styling (neutral grays, high contrast) and not inherit genre-specific world themes.
- **FR-007**: Pressing `Escape` or clicking the backdrop MUST close the modal.
- **FR-008**: Pressing `Ctrl + Enter` (or `Cmd + Enter` on macOS) inside the textarea MUST trigger generation.

### Key Entities

- **RegenerationDraft**: The transient draft representing the generated content (content & lore) before user approval, updated to store the user instructions if helpful for tracking.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of regeneration requests initiated via the entity detail sidebar or Zen Mode toolbar prompt the user with the instruction modal first.
- **SC-002**: The modal loads instantly (under 50ms) upon button click.
- **SC-003**: The custom instructions are successfully passed to the underlying AI generator prompt and influence the output.
