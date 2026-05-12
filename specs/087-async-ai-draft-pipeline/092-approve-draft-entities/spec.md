# Feature Specification: Approve / Reject Draft Entities

**Feature Branch**: `092-approve-draft-entities`  
**Created**: 2026-04-24  
**Status**: In Progress  
**Input**: https://github.com/eserlan/Codex-Cryptica/issues/706

## Clarifications

### Session 2026-04-24

- Q: Should there be a bulk "Approve All" action? → A: Out of Scope. AI-generated content should be reviewed individually.
- Q: Should rejecting a draft ask for confirmation? → A: No. Drafts are AI proposals — treat rejection as dismissing a suggestion, not deleting user work. Immediate delete, no dialog.
- Q: What does "approve" do to the data model? → A: Sets `status` from `"draft"` to `"active"`. Schema already supports this via `z.enum(["active", "draft"])`.
- Q: Should the entity panel close after approving? → A: No. The entity stays open, now showing as an active entity.
- Q: Should the entity panel close after rejecting? → A: Yes. The entity is deleted, so the panel must close.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Quick Approve/Reject from the Review List (Priority: P1)

As a vault maintainer, I want to approve or reject AI-generated draft entities directly from the Entity Explorer's Review tab, so I can process multiple proposals quickly without opening each one.

**Why this priority**: The primary workflow for batch-reviewing AI output. Speed is the key value here.

**Independent Test**: Open the Review tab in the Entity Explorer. Hover over a draft entity and click the checkmark button. Verify the entity disappears from the Review list and reappears in the main entity list with no draft status. Then create another draft and click the trash button — verify it is permanently deleted and no longer appears anywhere.

**Acceptance Scenarios**:

1. **Given** I am on the Review tab and hover over a draft entity, **When** I see the action buttons, **Then** a green checkmark button and a red trash button MUST be visible alongside the existing Zen Mode and Find-in-Graph buttons.
2. **Given** I click the checkmark button on a draft entity, **When** the action completes, **Then** the entity's status MUST be set to `"active"` and it MUST immediately disappear from the Review list.
3. **Given** I click the trash button on a draft entity, **When** the action completes, **Then** the entity MUST be permanently deleted with no confirmation dialog and MUST disappear from the Review list.

---

### User Story 2 — Approve/Reject from the Entity Detail Panel (Priority: P2)

As a vault maintainer, I want to approve or reject a draft after reading it in the sidebar panel, so I can make an informed decision based on the full generated content.

**Why this priority**: Ensures users who review content carefully have a clear call-to-action after reading.

**Independent Test**: Open a draft entity in the Entity Detail Panel (right sidebar). Verify a draft banner is visible at the top of the content area. Click Approve and confirm the banner disappears and the entity is now active. Open another draft, click Reject, and confirm the panel closes and the entity is gone.

**Acceptance Scenarios**:

1. **Given** the Entity Detail Panel is open for a draft entity, **When** I view the panel, **Then** a clearly styled "AI DRAFT — PENDING REVIEW" banner MUST appear at the top of the scrollable content area with Approve and Reject buttons.
2. **Given** I click Approve in the banner, **When** the action completes, **Then** the entity's status MUST be set to `"active"`, the banner MUST disappear, and the panel MUST remain open showing the now-active entity.
3. **Given** I click Reject in the banner, **When** the action completes, **Then** the entity MUST be permanently deleted and the panel MUST close immediately.
4. **Given** the entity does not have `status: "draft"`, **When** I view the panel, **Then** no draft banner MUST be shown.

---

### User Story 3 — Approve/Reject from Zen Mode (Priority: P2)

As a vault maintainer, I want to approve or reject a draft after reading it in Zen Mode, so that the full reading experience has a natural completion action.

**Why this priority**: Zen Mode is the primary reading surface; leaving no action there would create a dead end for users who open drafts from the list.

**Independent Test**: Open a draft entity in Zen Mode. Verify approve and reject buttons appear in the header. Click Approve and confirm the buttons disappear and the entity is active. Open another draft in Zen Mode, click Reject, and confirm Zen Mode closes and the entity is gone.

**Acceptance Scenarios**:

1. **Given** Zen Mode is open for a draft entity and I am not in edit mode, **When** I view the header, **Then** Approve and Reject buttons MUST be visible in the header action area.
2. **Given** I click Approve in Zen Mode, **When** the action completes, **Then** the entity's status MUST be set to `"active"` and the Approve/Reject buttons MUST disappear from the header.
3. **Given** I click Reject in Zen Mode, **When** the action completes, **Then** the entity MUST be permanently deleted and Zen Mode MUST close.
4. **Given** I am in edit mode for a draft entity, **When** I view the header, **Then** the Approve/Reject buttons MUST NOT be visible (edit mode controls take precedence).

---

### Out of Scope

- **Bulk Approval**: No "Approve All" button. Each draft must be actioned individually.
- **Rejection Confirmation**: No confirmation dialog on reject. Immediate delete.
- **Rejection Reason / Feedback**: No mechanism to log why a draft was rejected.
- **Schema Changes**: `status: z.enum(["active", "draft"])` already exists. No changes needed.
- **Draft Status for User-Created Entities**: This workflow is only surfaced in the Review tab and on entities where `status === "draft"`. Users cannot manually assign draft status through this UI.

### Edge Cases

- **Reject while panel is animating**: The delete must be idempotent; double-clicking reject should not throw.
- **Entity deleted externally while panel is open**: If the entity disappears from the store while the banner is visible, the panel should close gracefully (already handled by existing derived store logic).
- **Draft entity focused in graph**: After approval the graph node should update to reflect active status without a full reload.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When `explorerTab === "review"`, `EntityList` MUST render Approve and Reject icon buttons on each list item.
- **FR-002**: Clicking Approve in any surface MUST call `vault.updateEntity(id, { status: "active" })`.
- **FR-003**: Clicking Reject in any surface MUST call `vault.deleteEntity(id)` with no confirmation dialog.
- **FR-004**: After rejection in the Detail Panel or Zen Mode, the view MUST close automatically.
- **FR-005**: After approval in the Detail Panel or Zen Mode, the view MUST remain open showing the now-active entity.
- **FR-006**: The draft banner in the Detail Panel MUST only render when `entity.status === "draft"`.
- **FR-007**: Approve/Reject buttons in Zen Mode MUST be hidden while in edit mode.

### Key Entities

- **Entity**: `status` field transitions from `"draft"` → `"active"` on approval, or the entity is deleted on rejection.
- **EntityList**: Gains two optional callback props `onApproveDraft` and `onRejectDraft`.
- **EntityExplorer**: Passes those callbacks when `explorerTab === "review"`.
- **EntityDetailPanel**: Renders a draft banner conditionally.
- **ZenHeader**: Renders approve/reject buttons conditionally.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can approve a draft from the Review list in under 3 seconds (one hover + one click).
- **SC-002**: A user can reject a draft from any surface in under 3 seconds with no additional dialogs.
- **SC-003**: After approving a draft, the entity appears in the main entity list within one reactive render cycle — no manual refresh required.
- **SC-004**: After rejecting a draft, the entity is not recoverable and does not appear in any list or search result.
