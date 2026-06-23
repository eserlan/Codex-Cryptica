# Feature Specification: Published Guest Vault Snapshots via Cloudflare R2

**Feature Branch**: `135-guest-vault-r2`  
**Created**: 2026-06-22  
**Status**: Draft  
**Input**: User description: "Published guest vault snapshots via Cloudflare R2. Allow a host to publish a read-only guest version of a vault as a hosted snapshot, so players and guests can browse the world even when the host is offline. The MVP should use Cloudflare Workers + Cloudflare R2 as the publish layer."

## Clarifications

### Session 2026-06-22

- Q: How should the exporter sanitize inline markdown links pointing to private entities? → A: Redact Entirely: Replace both the link text and wrapper with a `[Redacted]` placeholder.
- Q: What maximum file size limits should the Cloudflare Worker enforce on uploads? → A: Option A: Maximum 5MB per image/asset, and 10MB for the JSON bundle.
- Q: How should the exporter determine which maps/canvases are safe to include in the guest vault snapshot? → A: Option A: Explicit Map/Canvas Visibility Settings: Only maps/canvases explicitly marked "Player-Visible" are exported.
- Q: How should the guest viewer build the search index for browsing lore? → A: Option A: Dynamic Guest-Side Indexing: The guest browser builds the FlexSearch index in-memory upon loading the entities.
- Q: Should a local campaign/vault support multiple independent published guest snapshots, or is there a 1-to-1 mapping? → A: Option A: 1-to-1 Mapping (Overwrite Updates): A campaign maps to a single active guest snapshot.
- Q: When a host updates their snapshot, should the system delete orphaned assets from Cloudflare R2? → A: Option A: Automatic Cleanup (Delete Orphans): The system deletes assets no longer referenced in the new manifest.
- Q: If a GM unpublishes a snapshot, how should the guest viewer handle invalid snapshots in history? → A: Option A: Auto-Cleanup on Load Failure: The app automatically deletes the vault from the guest's local GuestHistory list upon receiving a 404/410.
- Q: How should the guest viewer decide which visual theme to render? → A: Option A: Host-Configured Campaign Theme: The guest viewer automatically applies the host's active campaign theme.
- Q: How should the host client handle the upload process UI? → A: Option B: Background Service Sync: The upload runs in the background using service workers or async tasks, allowing the user to immediately close the tab.
- Q: How should the unpublish action be confirmed by the GM? → A: Option A: Warning Confirmation Modal: Show a warning modal explaining that players will lose access before executing unpublish.
- Q: How should the guest session behave when a user navigates away from the initial guest URL to view entities or maps? → A: Option A: Persistent Session State: The guest vault and `isGuestMode` flag remain active in memory while navigating within the app. The session is explicitly terminated when navigating back to the root `/guest` landing page.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Publish Guest Snapshot (Priority: P1)

As a Vault host (Game Master), I want to export a read-only, player-safe snapshot of my local vault and publish it to a secure cloud hosting environment so that my players can explore the world lore independently, even when I am offline.

**Why this priority**: This is the core value proposition of the feature. Without the ability to compile, preview, and upload the snapshot, the guest viewer cannot function.

**Independent Test**: The host can trigger the publish action from a local campaign, view a summary of what will be exported, execute the publish, and receive a shareable public URL.

**Acceptance Scenarios**:

1. **Given** a local vault with mixed public/GM-only content, **When** the host clicks "Publish Guest Snapshot", **Then** the app compiles a filtered snapshot that excludes all GM-only and private entities.
2. **Given** a compiled snapshot, **When** the host is shown the publish confirmation modal, **Then** they see a clear numeric count of included elements (entities, relationships, assets) and excluded elements (private/GM-only entities, hidden relationships, drafts).
3. **Given** the host confirms publication, **When** the upload completes successfully, **Then** a secure guest link is shown with a "Copy Link" option, and the vault's publish status/ID is saved locally.

---

### User Story 2 - Browse Published Guest Vault (Priority: P1)

As a player/guest, I want to open a shared guest link in my browser and view the published lore of the campaign so that I can read player-visible entities, search, and navigate relationships without needing a local vault or editing rights.

**Why this priority**: The guest view is the consumption layer of this feature. Players must have a clean, read-only interface that works asynchronously.

**Independent Test**: Opening the guest URL loads a standalone, read-only Codex Cryptica guest interface displaying the published world content.

**Acceptance Scenarios**:

1. **Given** a valid guest publish ID, **When** a player visits the guest URL, **Then** the application downloads the published JSON bundle and assets, rendering a responsive guest shell displaying the vault title.
2. **Given** the guest viewer, **When** a player browses the interface, **Then** all editing features, buttons, AI generation actions, and admin settings are completely hidden or disabled.
3. **Given** the published bundle, **When** the player searches or navigates, **Then** the search runs entirely in-browser over the published entities, and clicking relationship links navigates seamlessly between entities.
4. **Given** an active guest session, **When** the player navigates to different entities or app views, **Then** the guest vault data remains loaded and the session remains in guest mode.
5. **Given** an active guest session, **When** the player navigates back to the `/guest` landing page, **Then** the guest session is terminated, the guest vault is cleared, and the app restores the host's local vault state and theme.

---

### User Story 3 - Unpublish Guest Snapshot (Priority: P2)

As a Vault host, I want to retract my published snapshot and delete it from the cloud hosting environment so that I have complete control over where my data is hosted and can remove it at any time.

**Why this priority**: Crucial for user trust, data privacy, and compliance with local-first values.

**Independent Test**: The host clicks "Unpublish" in the publishing settings, and the hosted files are deleted from Cloudflare R2, making the guest link invalid.

**Acceptance Scenarios**:

1. **Given** a vault that has been previously published, **When** the host views the publishing settings, **Then** they see the option to "Unpublish and Delete".
2. **Given** the host clicks "Unpublish and Delete", **When** they confirm the action, **Then** the client sends a deletion request to the server, removes the local publish settings/history, and informs the host.
3. **Given** a deleted publish ID, **When** a guest tries to access the guest URL, **Then** they see a friendly "Snapshot not found or unpublished" message.

---

### User Story 4 - Manage Published Snapshots Dashboard (Priority: P2)

As a Vault host, I want to view a centralized list of all vaults I have published, showing their details and statuses, so that I can easily copy URLs, trigger updates, or unpublish any of my shared vaults from one screen.

**Why this priority**: Managing multiple campaigns or tracking what has been published across the whole application is painful if the host has to open each individual campaign's settings page.

**Independent Test**: The host opens a "Published Vaults" dashboard in global settings and sees all previously published entries, with quick actions to copy links, publish updates, or unpublish.

**Acceptance Scenarios**:

1. **Given** multiple published vaults, **When** the host opens the Published Vaults settings dashboard, **Then** they see a list containing the title, public URL, published timestamp, and entity count for each vault.
2. **Given** the dashboard, **When** the host clicks "Copy Link" next to an entry, **Then** the public guest URL is copied to their clipboard.
3. **Given** the dashboard, **When** the host clicks "Unpublish" next to an entry, **Then** the deletion workflow is triggered and the entry is removed from the dashboard after successful server deletion.

---

### User Story 5 - Guest Vault History (Priority: P2)

As a guest browser (player), I want the app to remember guest vaults I have previously opened so that I can easily return to them from a history list on the landing page without having to bookmark or find the original link.

**Why this priority**: Players often access lore vaults repeatedly over a campaign. Manually finding or pasting URLs every session is a poor user experience.

**Independent Test**: The guest opens the guest landing page and sees a list of "Recent Guest Vaults" with names and last accessed times.

**Acceptance Scenarios**:

1. **Given** a guest opens a shared link `https://codexcryptica.com/guest/[vault-slug]-[publishId]` for the first time, **When** the bundle successfully loads, **Then** the app stores the `publishId`, `vaultTitle`, and current timestamp in the guest's local browser storage.
2. **Given** a guest visits the root guest URL or a landing page, **When** they have previous guest vault entries in local storage, **Then** the landing page displays a "Recent Shared Worlds" list.
3. **Given** the recent vaults list, **When** the guest clicks a vault, **Then** the app navigates them to that guest vault viewer immediately.

---

### Edge Cases

- **Large Assets (Images/Maps)**: If a vault has 50MB of images, uploading a single giant bundle will fail. The system must export text lore in a single metadata/lore bundle and upload/serve large assets separately.
- **Offline / Network Interruption during Upload**: If the upload is interrupted, the host must receive a clear error and be able to retry. The local vault state must remain intact and not corrupted.
- **Dangling Relationships**: If public Entity A links to private Entity B, exporting Entity A must not break the UI. The exporter MUST sanitize the inline markdown link to Entity B by replacing both the link text and its wrapper with a `[Redacted]` placeholder. The guest viewer must gracefully handle or omit references to excluded entities.
- **Orphan/Unpublished URL access**: When a guest requests an invalid or expired URL, the app must show a clean error page rather than a blank screen or a JavaScript crash, and automatically remove the dead link from the guest's local history.
- **Orphaned Assets in R2**: If a user updates their campaign, assets that are no longer referenced MUST be cleaned up automatically to avoid accumulating dangling files and leaks of recently restricted material.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a user-facing action named "Publish Guest Snapshot" in the vault/campaign settings.
- **FR-002**: The publishing interface MUST explicitly state that the published snapshot is a separate, read-only copy of the vault, and that the original vault remains local-first and private.
- **FR-003**: The system MUST generate a JSON snapshot bundle containing only entities marked `player-visible` or `public`. All `GM-only`, `private`, drafts, generation prompts, and hidden metadata MUST be physically excluded from the bundle.
- **FR-004**: The system MUST only export relationships where both endpoint entities are included in the export, and the relationship itself is not hidden or private.
- **FR-005**: Before upload, the system MUST show a "Publish Preview" summary listing the count of included entities, relationships, and assets vs. the count of excluded items.
- **FR-006**: The system MUST upload the bundle and any associated safe assets to Cloudflare R2 via a Cloudflare Worker proxy.
- **FR-007**: The system MUST generate a unique, non-guessable `publishId` (e.g., using secure cryptographically random UUID or similar) and a corresponding write token for the publisher to authorize updates and deletions.
- **FR-008**: The publisher's write token MUST be stored securely in the host's browser-local vault settings (e.g., IndexedDB) and MUST NOT be exposed to guests.
- **FR-009**: The guest viewer MUST load the published snapshot from the Cloudflare Worker proxy, providing a read-only shell with search, entity detail pages, and graph/map views.
- **FR-010**: The guest viewer MUST disable all actions that create, modify, or delete data (e.g., entity creation, edit buttons, import options, campaign settings).
- **FR-011**: The system MUST provide an "Unpublish" option for hosts, which sends a signed deletion request (using the write token) to delete the bundle and assets from Cloudflare R2.
- **FR-012**: The host interface MUST include a central "Published Snapshots" management panel under Settings, displaying all published vaults from `PublishRegistry`, allowing hosts to copy links, trigger updates, or delete snapshots.
- **FR-013**: The guest shell MUST track visited vaults in browser `localStorage` (storing `publishId`, `vaultTitle`, and a timestamp) and display a "Recent Shared Worlds" navigation list to guests visiting the landing page.
- **FR-014**: The exporter MUST replace any inline markdown links referencing private or excluded entities with a `[Redacted]` placeholder in the exported text.
- **FR-015**: The Cloudflare Worker MUST reject JSON bundle uploads exceeding 10MB and individual asset uploads exceeding 5MB, returning a 413 Payload Too Large error.
- **FR-016**: The exporter MUST only include map/canvas configurations in the bundle if they are explicitly marked as "Player-Visible" in the campaign configuration.
- **FR-017**: The guest viewer MUST compile its search index dynamically in-browser upon fetching the snapshot bundle.
- **FR-018**: A local campaign MUST map to at most one active published guest snapshot. Publishing updates to an already-published campaign MUST overwrite the existing snapshot on the server.
- **FR-019**: During snapshot updates, the system MUST identify and delete any previously uploaded assets that are no longer referenced in the updated snapshot's asset manifest.
- **FR-020**: The guest viewer MUST automatically remove a snapshot entry from the local GuestHistory list if attempting to fetch the bundle returns a 404 Not Found or 410 Gone status.
- **FR-021**: The exporter MUST include the campaign's active theme configuration in the snapshot bundle, and the guest viewer MUST automatically apply this theme upon loading the snapshot.
- **FR-022**: The system MUST run the snapshot compilation and upload process in the background (using service workers or async tasks), allowing the user to continue using the application or close the tab without interrupting the upload, while showing a background progress notification in the UI.
- **FR-023**: The unpublish action MUST trigger a confirmation modal warning the host that the snapshot will be permanently deleted from the cloud and players will lose access before sending the delete request to the server.
- **FR-024**: The system MUST persist the active guest session (`isGuestMode` and guest vault data) in memory across navigations to other app routes (e.g., entity detail pages) so the guest can browse seamlessly.
- **FR-025**: The system MUST terminate the guest session, clear the in-memory guest vault data, and restore the local host vault state and theme when the user navigates back to the root `/guest` landing page.

### Key Entities _(include if feature involves data)_

- **PublishRegistry**: A local registry entry stored in the host's IndexedDB tracking published campaigns.
  - `vaultId`: Internal ID of the local vault (unique key).
  - `publishId`: The unique public identifier of the published snapshot.
  - `writeToken`: The secret key required to overwrite or delete this snapshot on Cloudflare R2.
  - `publishedAt`: Timestamp of the last successful publish.
  - `includedCounts`: Cached summary of what was published.

- **GuestHistory**: A registry entry stored in the guest client's `localStorage` tracking visited vaults.
  - `publishId`: The public ID of the visited guest vault.
  - `vaultTitle`: The title of the vault.
  - `lastAccessed`: Timestamp of the last visit.

- **GuestBundle**: The structured JSON payload uploaded to R2 and read by guests.
  - `schemaVersion`: Version of the guest bundle schema.
  - `publishId`: The public ID of the snapshot.
  - `vaultTitle`: The public-facing name of the vault.
  - `publishedAt`: ISO timestamp.
  - `publisherVersion`: App version that generated it.
  - `activeTheme`: The configuration of the campaign's active visual theme.
  - `entities`: Array of sanitized public entities.
  - `relationships`: Array of sanitized public relationships.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Hosts can publish a 500-entity text-only vault snapshot in under 5 seconds (excluding network transit time).
- **SC-002**: The generated guest bundle contains exactly 0% of private/GM-only entities and 0% of hidden relationship data.
- **SC-003**: The guest viewer page loads and renders a published vault in under 2 seconds on a standard mobile connection.
- **SC-004**: Guests can search, navigate, and view entities with 100% edit capability disabled.
