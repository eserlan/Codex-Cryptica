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
2. **Given** I have a generated link, **When** it is created, **Then** the system automatically copies it to my clipboard.
3. **Given** I have a generated link, **When** I manually copy it, **Then** it is ready to be pasted to another user.

### User Story 2 - Recipient Views Shared Campaign (Priority: P1)

A user receives a campaign link and wants to view the campaign contents.

**Why this priority**: The counterpart to sharing; without viewing, sharing has no value.

**Independent Test**: Can be tested by accessing a valid share link with a different user account.

**Acceptance Scenarios**:

1. **Given** I am a visitor with a share link, **When** I navigate to the link, **Then** I am prompted to enter a temporary username.
2. **Given** I have entered a username, **When** I submit, **Then** I see the campaign details in read-only mode.
3. **Given** I am viewing a shared campaign, **When** I try to edit a field, **Then** the UI prevents me (read-only mode).
4. **Given** I am connected as a guest, **When** the host views the session, **Then** my temporary display name and live status are visible in a small guest roster.

### User Story 3 - Owner Revokes Access (Priority: P2)

The owner decides to stop sharing the campaign.

**Why this priority**: Security and control feature.

**Independent Test**: Can be tested by revoking a link and trying to access it again.

**Acceptance Scenarios**:

1. **Given** a campaign is shared, **When** I click "Stop Sharing" or "Regenerate Link", **Then** the old link no longer works.
2. **Given** a revoked link, **When** a recipient tries to access it, **Then** they see an "Access Denied" or "Link Expired" message.

### edge Cases

- What happens when the owner deletes a shared campaign? (Link should 404/expire)
- What happens if the recipient is already the owner? (Should just open normally with edit rights)
- What happens if the link is malformed? (Error message)

## Permission Model

Guests (collaborators) operate under a "Player View" constraint to ensure both vault integrity and Lore privacy.

| Action Category     |    Host (Owner)     |                                      Guest (Collaborator)                                       |
| :------------------ | :-----------------: | :---------------------------------------------------------------------------------------------: |
| **Visibility**      |     Full Access     | **Restricted**: Only "Content" (Chronicle) is visible. "Lore" (GM Secrets) is strictly omitted. |
| **Fog of War**      |     Full Access     |      **Enforced**: Entities tagged as `hidden` are invisible in Graph, Search, and Oracle.      |
| **Persistence**     | Full (Disk + Cloud) |                 **None**: Changes are in-memory only and discarded on refresh.                  |
| **AI Intelligence** |      Advanced       |    **Tuned**: Oracle only uses player-facing content; AI reconciliation (recon) is bypassed.    |
| **Collaboration**   |    Full Control     |       **Read-Only**: Mutation-heavy actions (Delete, Merge, Connect) are hidden/disabled.       |

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow campaign owners to generate a unique, obscure shareable link for each campaign.
- **FR-002**: System MUST enforce read-only access for users accessing via the share link (unless they are the owner).
- **FR-003**: System MUST allow public access via link but REQUIRE visitors to provide a temporary username before viewing.
- **FR-004**: System MUST allow owners to invalidate or regenerate the share link, effectively revoking access for previous links.
- **FR-005**: System MUST visually distinguish shared campaigns from owned campaigns in the dashboard.
- **FR-006**: System MUST automatically copy a newly generated share link to the owner's clipboard.
- **FR-007**: System MUST show the host a lightweight active guest roster with each guest's temporary display name and current session status.
- **FR-008**: System MUST remove guests from the active roster when they disconnect.
- **FR-009**: System MUST prevent any modification (updates, creates, deletes) of campaign entities by share-link recipients.
- **FR-010**: System MUST strictly omit the `lore` field from entities sent to guests via the transport layer (P2P).
- **FR-011**: System MUST enforce Fog of War in the Oracle; hidden entities MUST be excluded from AI context lookups for guests.
- **FR-012**: System MUST bypass AI reconciliation (refined category/content merging) for guests to ensure speed and sandbox isolation.
- **FR-013**: System MUST hide mutation-heavy context menu options (Connect, Merge, Label, etc.) for guest users in Graph and Canvas views.
- **FR-014**: System MUST disable interactive canvas mutations (entity drops, edge drawing) for guest users.
- **FR-015**: System MUST hide the AI Assessment/Quality Control tool from guests.

### Key Entities

- **Campaign**: The core entity being shared. Needs a field/relation to store the active share token/link status.
- **ShareToken**: (Concept) A unique identifier linked to a campaign that authorizes read access.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Owners can generate a share link in fewer than 3 clicks from the campaign dashboard.
- **SC-002**: Shared campaign loads for recipient in under 2 seconds (comparable to owned campaigns).
- **SC-003**: 100% of write attempts by non-owners on shared routes are blocked by backend validation.
- **SC-004**: Revoking a link takes effect immediately (sub-second) for subsequent requests.
