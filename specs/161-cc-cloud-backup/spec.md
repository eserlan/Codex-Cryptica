# Feature Specification: CC Cloud Backup

**Feature Branch**: `161-cc-cloud-backup`
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

### Edge Cases

- What happens if the user loses network connectivity mid-backup or mid-restore? (Status must show an error/incomplete state, not a false "synced"/"restored" success, and local data must remain intact.)
- What happens if the same vault is backed up from two different devices around the same time? (See the "Conflict handling" assumption below — a last-write-wins whole-vault snapshot is used.)
- What happens if a user disables cloud backup and then re-enables it later — does it resume from the prior remote backup or start fresh? (Default: it resumes, treating the existing remote backup as current, since the user never asked for deletion.)
- What happens if a user requests deletion while a backup or restore is in progress? (The in-flight operation should be stopped and no orphaned remote data should remain.)
- What happens when a vault exceeds a reasonable size (e.g., very large media libraries)? (User must see a clear message rather than a silent partial or failed backup.)
- What happens if consent was given, cloud backup is running, and the user later revokes browser-level permissions or clears local storage? (Cloud backup setting itself lives with the vault's own settings; the remote backup should remain until the user explicitly deletes it, and the local UI should reflect "unknown/needs reconnect" rather than assuming success.)
- What happens if a user loses their vault's ownership code (e.g., clears local storage without having copied it elsewhere first)? Since there is no account system to recover access through, that backup becomes permanently unreachable by the user — this MUST be disclosed plainly in the consent screen (FR-002) and the Settings view where the code is shown (FR-013), not discovered only after the fact.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST keep cloud backup off by default for every vault; it MUST NOT be enabled automatically, silently, or as a side effect of any other action.
- **FR-002**: The system MUST show an explicit consent screen before the first cloud backup of a vault occurs, stating what data is stored (entities, labels, notes, media), where it is stored (Codex Cryptica's own cloud storage), that the user can disable and delete it at any time, and that losing the vault's ownership code means permanently losing access to that backup (there being no account-based recovery).
- **FR-003**: The system MUST NOT transmit any vault data to cloud backup infrastructure until the user has explicitly confirmed the consent screen for that vault.
- **FR-004**: The system MUST NOT share, sell, forward, or expose backed-up vault data to any third-party vendor or external AI training pipeline.
- **FR-005**: Once enabled, the system MUST back up the vault's entities, labels, notes, and media to cloud storage and make the backup available for restore.
- **FR-006**: Users MUST be able to restore a vault from its cloud backup, reconstructing entities, labels, notes, and media.
- **FR-007**: The system MUST warn and require explicit confirmation before a restore overwrites existing local vault content.
- **FR-008**: Users MUST be able to view the current cloud backup status for a vault (idle, syncing, error) and the time of the last successful backup.
- **FR-009**: Users MUST be able to disable cloud backup for a vault at any time, which stops further automatic backups without deleting the existing remote copy.
- **FR-010**: Users MUST be able to request permanent deletion of a vault's remote backup, and the system MUST confirm once the deletion is complete and the data can no longer be restored.
- **FR-011**: The system MUST treat a failed or interrupted backup or restore as a visible error state, never as a silent success, and MUST leave local vault data uncorrupted after any such failure.
- **FR-012**: The system MUST scope cloud backup access to the vault's own owner via a per-vault ownership code generated when backup is first enabled; no other vault's code MUST be able to read, restore, or delete that backup.
- **FR-013**: Users MUST be able to view or copy their vault's ownership code from Settings at any time, so they can bring it to another device to restore.
- **FR-014**: The system MUST reject any restore, status, or delete request that does not present a valid ownership code for that vault's backup, without revealing whether a backup exists for an invalid code.

### Key Entities

- **Cloud Backup**: The remote copy of one vault's data held in Codex Cryptica's own cloud storage. Attributes: owning vault, ownership code (opaque, generated once at first enable, no linked user account), current status (idle/syncing/error), last successful backup time, size.
- **Consent Record**: The user's explicit opt-in decision for a given vault. Attributes: vault, whether granted, when granted, when (if ever) revoked.
- **Restore Operation**: A one-time action reconstructing a vault's local data from its Cloud Backup. Attributes: target vault, source backup, outcome (succeeded/failed/cancelled).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can go from "cloud backup off" to "first backup confirmed complete" in under 2 minutes, including reading the consent screen.
- **SC-002**: 100% of vaults with cloud backup left off show zero vault-data network activity to cloud backup infrastructure — privacy compliance is absolute, not statistical.
- **SC-003**: A user who restores a vault from cloud backup recovers all entities, labels, notes, and media that existed at the time of the last successful backup, with no data loss.
- **SC-004**: A user who requests deletion of their cloud backup can no longer restore that vault from the cloud within the same session, and independent verification confirms no vault content remains stored.
- **SC-005**: Backup and restore failures are correctly surfaced as errors (not false successes) in 100% of tested failure scenarios (network loss, storage error, interrupted operation).
- **SC-006**: At least 90% of users who enable cloud backup can correctly state, when asked, where their data is stored and how to delete it — evidence the consent screen communicates clearly rather than being a legal-formality checkbox.

## Assumptions

These decisions were not yet confirmed with a stakeholder; they are reasonable defaults chosen so the spec has no open [NEEDS CLARIFICATION] markers. Revisit before or during `/speckit-plan` if any is wrong:

- **Cross-device identity**: Codex Cryptica has no authenticated user-account concept, so ownership follows the pattern already used for the public template marketplace: enabling cloud backup generates an opaque ownership code for that vault, which is stored locally on the enabling device and required (as a bearer credential) for every later status/restore/disable/delete request. There is no separate login step. To restore on a second device, the user must bring that code with them (e.g., by copying it from Settings), the same way marketplace listing owners keep their listing's owner token to edit or unpublish it later.
- **Encryption/access model**: Vault data at rest is protected by server-side access control (scoped to the vault's ownership code above) plus standard transport security (TLS); no independent client-side/end-to-end encryption layer is assumed. If true zero-knowledge storage is required, this changes the technical design significantly and should be confirmed before planning.
- **Conflict handling**: When the same vault is backed up from two devices around the same time, the system uses a last-write-wins whole-vault snapshot — the most recent completed backup replaces the prior one, with no field-level merge. This mirrors how the existing Google Drive mirror sync already behaves, so it introduces no new mental model for users.
