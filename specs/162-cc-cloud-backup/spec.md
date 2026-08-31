# Feature Specification: CC Cloud Backup

**Feature Branch**: `162-cc-cloud-backup`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "Support opt-in cloud backup to Codex Cryptica Cloud via Cloudflare R2 with explicit user permission and zero third-party sharing (GitHub issue #2593)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Turn on cloud backup with informed consent (Priority: P1)

A vault owner who wants peace of mind against losing their lore (device loss, browser data clearing, accidental deletion) turns on cloud backup from Settings. Before anything is sent anywhere, they see a plain-language explanation of what will be stored, where ("Codex Cryptica Cloud," not a named third party), and how it can be turned off and erased. Only after they confirm does their vault start backing up.

**Why this priority**: This is the feature's reason to exist and its trust contract in one step. Without a real, unavoidable consent step, the feature violates the project's local-first/privacy principle and cannot ship at all. It is also the first thing every other story depends on — nothing else works if a vault was never opted in.

**Independent Test**: Can be fully tested by opening Settings, starting the enable flow, confirming the consent screen accurately describes storage location/scope/exit path, confirming it blocks on explicit confirmation, and confirming a vault backup exists afterward. Delivers value on its own: a user's vault is now durably backed up outside their device.

**Acceptance Scenarios**:

1. **Given** cloud backup has never been enabled for a vault, **When** the user opens the cloud backup setting, **Then** the system shows a consent screen naming what is stored (vault entities, labels, notes, media), where it is stored (Codex Cryptica's own cloud storage), and that it will never be shared with third parties, before offering an enable action.
2. **Given** the consent screen is showing, **When** the user closes it or declines without confirming, **Then** no vault data is sent anywhere and cloud backup remains off.
3. **Given** the user confirms consent, **When** confirmation completes, **Then** the system performs an initial backup of the vault and the user can see that backup succeeded (status and a last-synced time).
4. **Given** cloud backup is off, **When** the app runs normally (editing, browsing, generating lore), **Then** no vault data is transmitted to cloud backup infrastructure.
5. **Given** cloud backup is enabled, **When** the user makes and saves any subsequent change to the vault, **Then** that save also pushes the vault's current state to cloud storage, replacing the prior remote backup — the same directional, "local wins" push-on-save model already used for Google Drive mirror sync, with no background polling between saves.

---

### User Story 2 - Restore a vault from cloud backup (Priority: P2)

A user who lost local data (new device, cleared browser storage, corrupted local copy) or who wants to bring a previously-backed-up vault onto another device opens the restore flow, picks the backed-up vault, and gets their entities, labels, notes, and media back.

**Why this priority**: Backup without restore delivers no real recovery value — this is the payoff of Story 1. It is P2 rather than P1 because a first backup can be verified (status/timestamp) without a full restore, but the feature is incomplete without this.

**Independent Test**: Can be fully tested by backing up a vault (Story 1), simulating loss of the local copy, running restore, and confirming the restored vault's content matches what was backed up. Delivers value independently once a backup exists.

**Acceptance Scenarios**:

1. **Given** a vault has a cloud backup and the user has its ownership code (from the original device's Settings, or preserved locally), **When** the user enters that code and chooses to restore, **Then** the system retrieves the backup and reconstructs the vault's entities, labels, notes, and media locally.
2. **Given** a user does not have the vault's ownership code, **When** they attempt to restore, **Then** the system clearly explains that the code is required and does not restore or expose any backup content.
3. **Given** a restore is requested while the destination already has unsaved local vault content, **When** the user proceeds, **Then** the system requires explicit confirmation before the restore can overwrite that local content.
4. **Given** a restore fails partway (e.g., network interruption), **When** the failure occurs, **Then** the user sees a clear error and the local vault is left in a known, uncorrupted state.
5. **Given** a vault's cloud backup already exists and is newer than the local copy, **When** the user opens or continues using that vault without explicitly requesting a restore, **Then** the system does NOT auto-pull the newer cloud copy — restore only ever happens as a deliberate, explicit action, never silently on open, load, or vault switch.

---

### User Story 3 - See status and stay in control of cloud data (Priority: P3)

A user who has cloud backup on wants to check that it's working, and wants a straightforward way to turn it off and erase everything Codex Cryptica is holding for that vault, without contacting support.

**Why this priority**: This is the ongoing trust/control layer required by the project's privacy principle and by the acceptance criteria in the source issue. It builds on Stories 1–2 but is independently valuable and testable on its own once backup exists.

**Independent Test**: Can be fully tested by enabling backup, checking the status indicator reflects reality (idle/syncing/error/last-synced), disabling backup, requesting deletion, and confirming via a fresh backup attempt or support-side check that no vault data remains accessible.

**Acceptance Scenarios**:

1. **Given** cloud backup is enabled, **When** the user views the sync settings, **Then** they see the current state (idle, syncing, error) and the time of the last successful backup.
2. **Given** cloud backup is enabled, **When** the user disables it, **Then** no further automatic backups occur, and existing remote data is left untouched until the user separately requests deletion.
3. **Given** the user requests deletion of their cloud backup, **When** the deletion completes, **Then** the system confirms the remote copy is gone and it can no longer be restored.
4. **Given** a backup attempt fails (e.g., no network, storage error), **When** the failure occurs, **Then** the status clearly shows an error state rather than silently appearing up to date.

---

### User Story 4 - Support-assisted recovery for a lost ownership code (Priority: P4)

A user who lost their vault's ownership code contacts Codex Cryptica support. Support looks up that specific vault's backup by an identifying detail the user can supply (e.g., the vault's title) and helps the user regain access — without support ever browsing the full set of vault backups or seeing vault content.

**Why this priority**: Losing the ownership code is an expected consequence of having no account system (see Assumptions), and support-assisted recovery is the intended safety net for that gap. It is lowest priority because it's a fallback path used only when Stories 1–3's self-service tools fail the user, not something exercised on the golden path.

**Independent Test**: Can be fully tested by creating a backup, discarding the ownership code, then confirming that support can locate that one backup using its title and re-issue access to the user — while confirming a lookup with no matching title, or a request to list all backups, is refused.

**Acceptance Scenarios**:

1. **Given** a user has lost their ownership code but remembers their vault's title, **When** support performs a lookup using that title, **Then** the system returns at most the matching backup's metadata (title, size, last-backup time) — never its content, and never other vaults' metadata.
2. **Given** support has located a user's backup via lookup, **When** support completes identity-appropriate verification with the user, **Then** support can re-issue a fresh ownership code for that backup so the user can restore it themselves.
3. **Given** support has no identifying detail to search on (the user doesn't remember any identifying detail either), **When** support attempts a lookup, **Then** the system returns no results rather than exposing a list of unrelated vaults to search through.
4. **Given** an attempt is made to retrieve an unfiltered list of all vault backups, **When** that request is made, **Then** the system refuses it — only targeted, single-match lookups are supported, never open browsing.

### Edge Cases

- What happens if the user loses network connectivity mid-backup or mid-restore? (Status must show an error/incomplete state, not a false "synced"/"restored" success, and local data must remain intact.)
- What happens if the same vault is backed up from two different devices around the same time? (See the "Conflict handling" assumption below — a last-write-wins whole-vault snapshot is used.)
- What happens if a user disables cloud backup and then re-enables it later — does it resume from the prior remote backup or start fresh? (Default: it resumes, treating the existing remote backup as current, since the user never asked for deletion.)
- What happens if a user requests deletion while a backup or restore is in progress? (The in-flight operation should be stopped and no orphaned remote data should remain.)
- What happens when a vault exceeds a reasonable size (e.g., very large media libraries)? (User must see a clear message rather than a silent partial or failed backup.)
- What happens if consent was given, cloud backup is running, and the user later revokes browser-level permissions or clears local storage? (Cloud backup setting itself lives with the vault's own settings; the remote backup should remain until the user explicitly deletes it, and the local UI should reflect "unknown/needs reconnect" rather than assuming success.)
- What happens if a user loses their vault's ownership code (e.g., clears local storage without having copied it elsewhere first)? They are not left with no recourse: support can perform a targeted metadata lookup (Story 4) if the user can supply an identifying detail such as the vault title. This MUST be disclosed plainly in the consent screen (FR-002) and the Settings view where the code is shown (FR-013), alongside the fact that losing the code AND any identifying detail means the backup becomes permanently unreachable.
- What happens if two vaults happen to share the same title and a support lookup matches more than one? (The lookup MUST NOT auto-resolve to either one; it MUST require an additional distinguishing detail or fail closed rather than guess.)
- What happens if the push-on-save to cloud backup fails (e.g., offline) while the user keeps working and saving locally? (The local save MUST still succeed every time; a failed cloud push MUST surface as an error/stale status, not block or roll back the local save, and the next successful save's push MUST simply supersede the missed one — no queue of missed pushes to replay.)
- What happens if the user is offline for an extended period, making many local saves, then reconnects? (Only the vault's current state at the next successful save is pushed — intermediate history between pushes is never reconstructed or replayed, consistent with the whole-vault-snapshot model.)
- What happens on a fresh page load after cloud backup was previously enabled for a vault? (The enabled state and ownership code MUST be read back from local persistence automatically — the user should see backup already "on" with its real status, not a fresh consent prompt or an "off" default.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST keep cloud backup off by default for every vault; it MUST NOT be enabled automatically, silently, or as a side effect of any other action.
- **FR-002**: The system MUST show an explicit consent screen before the first cloud backup of a vault occurs, stating: what data is stored (entities, labels, notes, media); where it is stored (Codex Cryptica's own cloud storage, hosted on third-party infrastructure); that the backup is not end-to-end encrypted, so both Codex Cryptica and its hosting provider are technically able to read its contents; that the user can disable and delete it at any time; that losing the vault's ownership code (and any identifying detail such as the vault title) means permanently losing access to that backup; and that Codex Cryptica support staff can look up a vault's metadata (e.g., title, size, last-backup time — never content) to help a specific user recover a lost code.
- **FR-003**: The system MUST NOT transmit any vault data to cloud backup infrastructure until the user has explicitly confirmed the consent screen for that vault.
- **FR-004**: The system MUST NOT sell, forward, or expose backed-up vault data to any third party beyond the infrastructure provider disclosed in FR-002, and MUST NOT feed it into any AI training pipeline. Vault content MUST NOT be transmitted to any analytics, telemetry, or error-reporting destination.
- **FR-005**: Once enabled, the system MUST perform an initial backup of the vault's entities, labels, notes, and media to cloud storage and make the backup available for restore.
- **FR-006**: Users MUST be able to restore a vault from its cloud backup, reconstructing entities, labels, notes, and media. Restore MUST always be an explicit, user-initiated action — the system MUST NOT automatically pull from cloud storage on vault open, load, or switch, even when the cloud backup is newer than the local copy.
- **FR-006a**: Restore MUST create a **new local vault** by default, leaving any existing vault untouched. Restoring _into_ an existing vault MUST be a separate, explicitly chosen destination, and MUST be gated by the overwrite confirmation in FR-007. A restore MUST never silently replace the vault the user currently has open.
- **FR-007**: The system MUST warn and require explicit confirmation before a restore overwrites existing local vault content.
- **FR-008**: Users MUST be able to view the current cloud backup status for a vault (idle, syncing, error) and the time of the last successful backup.
- **FR-009**: Users MUST be able to disable cloud backup for a vault at any time, which stops further automatic backups without deleting the existing remote copy.
- **FR-010**: Users MUST be able to request permanent deletion of a vault's remote backup, and the system MUST confirm once the deletion is complete and the data can no longer be restored.
- **FR-011**: The system MUST treat a failed or interrupted backup or restore as a visible error state, never as a silent success, and MUST leave local vault data uncorrupted after any such failure.
- **FR-012**: The system MUST scope cloud backup access to the vault's own owner via a per-vault ownership code generated when backup is first enabled; no other vault's code MUST be able to read, restore, or delete that backup.
- **FR-013**: Users MUST be able to view or copy their vault's ownership code from Settings at any time, so they can bring it to another device to restore.
- **FR-014**: The system MUST reject any restore, status, or delete request that does not present a valid ownership code for that vault's backup, without revealing whether a backup exists for an invalid code.
- **FR-015**: The system MUST provide a support-only lookup that returns a vault backup's metadata (title, size, last-backup time) — never its content — when queried by an identifying detail such as the vault title, and MUST return no result if no single backup matches.
- **FR-016**: The system MUST NOT provide any way to list, browse, or enumerate vault backups in bulk; only single, targeted lookups by an identifying detail are permitted.
- **FR-017**: Support MUST be able to re-issue a fresh ownership code for a backup located via lookup, so a user who lost their code can regain self-service access without support ever handling the vault's content.
- **FR-018**: After the initial backup, every subsequent local save of that vault MUST also push its current state to cloud storage, replacing the prior remote backup (push-on-save), with no background polling or scheduled sync between saves — mirroring the existing Google Drive mirror sync model.
- **FR-019**: A push-on-save failure (e.g., no connectivity) MUST NOT block, delay, or roll back the local save; the vault's cloud backup status MUST simply reflect that the last push failed or is stale until the next successful save.
- **FR-020**: The system MUST persist, per vault, whether CC Cloud backup is enabled and its ownership code in local storage that survives page reloads and app restarts, so the user is never re-prompted for consent or re-asked to re-enable it after the first time — matching how the Google Drive folder association is already persisted in IndexedDB.

### Key Entities

- **Cloud Backup**: The remote copy of one vault's data held in Codex Cryptica's own cloud storage. Attributes: owning vault, ownership code (opaque, generated once at first enable, no linked user account), current status (idle/syncing/error), last successful backup time, size.
- **Consent Record**: The user's explicit opt-in decision for a given vault. Attributes: vault, whether granted, when granted, when (if ever) revoked.
- **Restore Operation**: A one-time action reconstructing a vault's local data from its Cloud Backup. Attributes: target vault, source backup, outcome (succeeded/failed/cancelled).
- **Support Lookup**: A single, targeted support query against Cloud Backup metadata by an identifying detail (e.g., vault title). Attributes: search detail used, matched backup (if exactly one), outcome (recovered/no match/ambiguous), whether a fresh ownership code was issued. Never carries vault content.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can go from "cloud backup off" to "first backup confirmed complete" in under 2 minutes, including reading the consent screen.
- **SC-002**: 100% of vaults with cloud backup left off show zero vault-data network activity to cloud backup infrastructure — privacy compliance is absolute, not statistical.
- **SC-003**: A user who restores a vault from cloud backup recovers all entities, labels, notes, and media that existed at the time of the last successful backup, with no data loss.
- **SC-004**: A user who requests deletion of their cloud backup can no longer restore that vault from the cloud within the same session, and independent verification confirms no vault content remains stored.
- **SC-005**: Backup and restore failures are correctly surfaced as errors (not false successes) in 100% of tested failure scenarios (network loss, storage error, interrupted operation).
- **SC-006**: At least 90% of users who enable cloud backup can correctly state, when asked, where their data is stored and how to delete it — evidence the consent screen communicates clearly rather than being a legal-formality checkbox.
- **SC-007**: A user who lost their ownership code but remembers their vault's title can regain self-service access to their vault through support within one support interaction, without support ever viewing that vault's content.
- **SC-008**: 100% of support lookup attempts that don't resolve to exactly one matching vault return no result — bulk browsing of vault backups is never possible, tested or otherwise.
- **SC-010**: A vault at or under the published size limit (50 MB total, including media) backs up successfully; one above it is refused with a clear, actionable message before any partial upload occurs.
- **SC-009**: A change saved locally to a vault with cloud backup enabled is reflected in the cloud backup (visible via status/last-backup time) within the same save operation, with no separate "sync now" step required.

## Assumptions

These decisions were not yet confirmed with a stakeholder; they are reasonable defaults chosen so the spec has no open [NEEDS CLARIFICATION] markers. Revisit before or during `/speckit-plan` if any is wrong:

- **Cross-device identity**: Codex Cryptica has no authenticated user-account concept, so ownership follows the pattern already used for the public template marketplace: enabling cloud backup generates an opaque ownership code for that vault, which is stored locally on the enabling device and required (as a bearer credential) for every later status/restore/disable/delete request. There is no separate login step. To restore on a second device, the user must bring that code with them (e.g., by copying it from Settings), the same way marketplace listing owners keep their listing's owner token to edit or unpublish it later.
- **Encryption/access model**: Vault data at rest is protected by server-side access control (scoped to the vault's ownership code above) plus standard transport security (TLS); no independent client-side/end-to-end encryption layer is assumed. If true zero-knowledge storage is required, this changes the technical design significantly and should be confirmed before planning.
- **Conflict handling**: When the same vault is backed up from two devices around the same time, the system uses a last-write-wins whole-vault snapshot — the most recent completed backup replaces the prior one, with no field-level merge. This mirrors how the existing Google Drive mirror sync already behaves, so it introduces no new mental model for users.
