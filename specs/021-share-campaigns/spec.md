# Feature Specification: Campaign Sharing (Read-only)

**Feature Branch**: `021-share-campaigns`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "Other users need to access campaigns, we need a way to share campaigns (read only for now)"

## User Scenarios & Testing

### User Story 1 - Owner Shares Campaign via Link (Priority: P1)

A campaign owner wants to give another user read-only access to their campaign so they can view the content without making changes.

**Why this priority**: Core functionality to enable collaboration/sharing.

**Independent Test**: Can be tested by generating a link and verifying it exists.

**Acceptance Scenarios**:

1. **Given** I am the owner of a campaign, **When** I click "Share Campaign", **Then** the system generates a unique URL.
2. **Given** I have a generated link, **When** I copy it, **Then** it is ready to be pasted to another user.

### User Story 2 - Recipient Views Shared Campaign (Priority: P1)

A user receives a campaign link and wants to view the campaign contents.

**Why this priority**: The counterpart to sharing; without viewing, sharing has no value.

**Independent Test**: Can be tested by accessing a valid share link with a different user account.

**Acceptance Scenarios**:

1. **Given** I am a visitor with a share link, **When** I navigate to the link, **Then** I am prompted to enter a temporary username.
2. **Given** I have entered a username, **When** I submit, **Then** I see the campaign details in read-only mode.
3. **Given** I am viewing a shared campaign, **When** I try to edit a field, **Then** the UI prevents me (read-only mode).

### User Story 3 - Owner Revokes Access (Priority: P2)

The owner decides to stop sharing the campaign.

**Why this priority**: Security and control feature.

**Independent Test**: Can be tested by revoking a link and trying to access it again.

**Acceptance Scenarios**:

1. **Given** a campaign is shared, **When** I click "Stop Sharing" or "Regenerate Link", **Then** the old link no longer works.
2. **Given** a revoked link, **When** a recipient tries to access it, **Then** they see an "Access Denied" or "Link Expired" message.

### Edge Cases

- What happens when the owner deletes a shared campaign? (Link should 404/expire)
- What happens if the recipient is already the owner? (Should just open normally with edit rights)
- What happens if the link is malformed? (Error message)

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow campaign owners to generate a unique, obscure shareable link for each campaign.
- **FR-002**: System MUST enforce read-only access for users accessing via the share link (unless they are the owner).
- **FR-003**: System MUST allow public access via link but REQUIRE visitors to provide a temporary username before viewing.
- **FR-004**: System MUST allow owners to invalidate or regenerate the share link, effectively revoking access for previous links.
- **FR-005**: System MUST visually distinguish shared campaigns from owned campaigns in the dashboard (e.g., "Shared with me" filter or badge).
- **FR-006**: System MUST prevent any modification (updates, creates, deletes) of campaign entities by share-link recipients.

### Key Entities

- **Campaign**: The core entity being shared. Needs a field/relation to store the active share token/link status.
- **ShareToken**: (Concept) A unique identifier linked to a campaign that authorizes read access.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Owners can generate a share link in fewer than 3 clicks from the campaign dashboard.
- **SC-002**: Shared campaign loads for recipient in under 2 seconds (comparable to owned campaigns).
- **SC-003**: 100% of write attempts by non-owners on shared routes are blocked by backend validation.
- **SC-004**: Revoking a link takes effect immediately (sub-second) for subsequent requests.