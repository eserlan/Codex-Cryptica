# Research Findings: Vault Load/Save Confidence

## Decision 1: Silent Directory Permission Check on Startup

- **Decision**: Query folder permission silently on startup using `handle.queryPermission({ mode: "readwrite" })`. If permission is not `"granted"`, immediately set the status to `"needs-permission"` and skip local directory sync/pull, loading ONLY from local cached data (OPFS).
- **Rationale**: The File System Access API prohibits calling `requestPermission()` or `showDirectoryPicker()` without a user gesture (e.g. click). If called during app boot or automatic vault switch, the browser throws a `SecurityError`. Querying the permission, however, does NOT require a user gesture and is safe. By catching `"prompt"` or `"denied"` early and skipping the sync, we load the cached vault data cleanly without errors.
- **Alternatives considered**:
  - _Automatic prompting on startup_: Rejected because it crashes with browser `SecurityError` exceptions due to missing user activation.
  - _No sync-on-load at all_: Rejected because we want the vault to automatically stay up-to-date with local folders when permissions _are_ already granted (e.g., within the same browser session).

## Decision 2: Distinct "needs-permission" Status and "GRANT ACCESS" button

- **Decision**: Add `"needs-permission"` to `SyncStore`'s status state. When this state is active, render a dedicated amber `"GRANT ACCESS"` button in `VaultControls` and a lock icon in the vault switcher. Clicking this button triggers `saveToFolder()` or a manual pull, prompting the user for permission inside a valid click gesture context.
- **Rationale**: By treating permission expiration as a normal, non-error state, we can guide the user to resolve it cleanly without displaying scary error labels. The click context ensures the browser allows the permission dialog to appear.
- **Alternatives considered**:
  - _Showing the general "Error" status_: Rejected because missing permission is a standard browser security policy behavior, not an unexpected system failure.
  - _Prompting directory picker immediately_: Rejected because re-prompting the user to select the folder again when the handle is already saved is repetitive and confusing.

## Decision 3: 5-Second Save-Drain Timeout during Vault Switch

- **Decision**: Wrap the `flushPendingSaves()` call in `VaultLifecycleManager.switchVault()` inside a `Promise.race` with a 5000ms timeout.
- **Rationale**: Before switching to a new vault, the app drains any pending debounced writes. If a write hangs (e.g. due to locked resources or browser storage issues), the vault switch will block forever. A 5-second timeout ensures the app recovers and proceeds with the switch, preserving UI responsiveness.
- **Alternatives considered**:
  - _No save drain on switch_: Rejected because we should try to save any unsaved work before cleaning up the active repository state.
  - _Infinite wait_: Rejected because a hanging write would lock the entire app and force a manual page refresh.

## Decision 4: Transient "saved" Status State

- **Decision**: Introduce a `"saved"` status value in `SyncStore`. Upon successful manual save, set status to `"saved"` and trigger a 3-second `setTimeout` to revert it back to `"idle"`.
- **Rationale**: Displays a clear "SAVED" message with a checkmark in the toolbar, satisfying the user value of observable operations.
- **Alternatives considered**:
  - _Browser alerts/toasts_: Rejected because they are intrusive and disrupt the layout.
