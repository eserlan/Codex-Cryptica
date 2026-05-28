# Feature Specification: Data Integrity At Trust Boundaries

**Feature Branch**: `122-data-integrity-boundaries`  
**Created**: 2026-05-28  
**Status**: Draft  
**Input**: User description: "Data Integrity At Trust Boundaries"

## Clarifications

### Session 2026-05-28

- Q: If taking a snapshot before a database migration fails (e.g., due to insufficient storage space), how should the system proceed? → A: Abort the migration, prevent the app from opening, and prompt the user to clear storage space (safest for data integrity).
- Q: How should the system handle a user attempting to import a malformed or 0-byte file during a bulk import? → A: Silently skip the invalid file, continue importing the rest of the valid files, and show a summary at the end (best UX for bulk operations).
- Q: How should the system manage the size of the migration log store over time? → A: Retain only the last 5 migrations and prune older entries (prevents bloat while keeping recent history).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Graceful degradation on corrupted local data (Priority: P1)

As a user loading my vault, if some records in my local browser database (IndexedDB) are corrupted, the application should quarantine those bad records and gracefully load the rest of my vault rather than failing completely or injecting `undefined` data into my graph.

**Why this priority**: Corrupted local data can crash the entire application on load, leading to data loss panics. Graceful degradation ensures the app remains usable.

**Independent Test**: Can be tested by manually injecting invalid records (e.g., missing ID or malformed labels) into IndexedDB and verifying the app loads successfully while logging the quarantined entities.

**Acceptance Scenarios**:

1. **Given** a vault with valid entities and one malformed entity in IndexedDB, **When** the vault loads, **Then** the valid entities are loaded, the malformed entity is skipped/quarantined, and an error is logged.

---

### User Story 2 - Safe file import with strict validation (Priority: P2)

As a user importing Markdown files into my vault, I want the system to reject files with malformed or unsupported YAML frontmatter, so that bad data does not poison my vault state.

**Why this priority**: Importing external files is a primary vector for injecting untrusted or malformed data into the system.

**Independent Test**: Can be tested by attempting to import a `.md` file with intentionally invalid YAML frontmatter types (e.g., string instead of array for labels).

**Acceptance Scenarios**:

1. **Given** an import file with malformed YAML frontmatter, **When** the user attempts to import it, **Then** the parser rejects it with a clear error and the file is not added to the graph.
2. **Given** a file with an unsupported extension, **When** the user attempts to import it, **Then** the import settings UI rejects it before parsing.

---

### User Story 3 - Safe schema migrations with rollback path (Priority: P2)

As a user opening the application after an update, if a database schema migration occurs, the system should log the migration and ensure there is a rollback path, so that my data is protected against destructive schema bugs.

**Why this priority**: Schema migrations are destructive. Without logs and reversibility, a bad migration permanently breaks user data.

**Independent Test**: Can be tested by simulating a version bump, running the migration, and verifying the `migration_log` store captures the event and a snapshot.

**Acceptance Scenarios**:

1. **Given** a new database version, **When** the app initializes, **Then** a snapshot is created before migration, and a record is added to the `migration_log` store.

### Edge Cases

- **Snapshot Failure**: If a pre-migration snapshot fails due to storage limits, the application aborts the migration, displays an error preventing the app from fully loading, and instructs the user to clear storage space.
- **Malformed Bulk Imports**: If a 0-byte or malformed file is encountered during bulk import, it is skipped without aborting the batch, and logged in the post-import summary.
- **Log Pruning**: The `migration_log` store retains only the last 5 migration entries; older entries are pruned to prevent unbound growth over time.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST validate entity data read from local storage against a strict schema.
- **FR-002**: System MUST quarantine and log any local storage records that fail schema validation instead of propagating them to the graph or search index.
- **FR-003**: System MUST validate YAML frontmatter during import and reject invalid structures with a descriptive error.
- **FR-004**: System MUST perform explicit file-type and extension checks before parsing imports.
- **FR-005**: System MUST create a timestamped snapshot of vault metadata before upgrading the local database schema version.
- **FR-006**: System MUST maintain a migration log recording the version, timestamp, status, and rollback target for each migration.
- **FR-007**: System MUST include a reversibility test for all new schema migrations.

### Key Entities

- **Entity**: The core vault node, requiring strict validation upon read and parse.
- **MigrationLogEntry**: Records schema upgrades, storing version, timestamp, status, and rollback references.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of invalid entity records injected into local storage are caught and quarantined during load.
- **SC-002**: 100% of malformed YAML imports are rejected with a clear error message.
- **SC-003**: Schema migrations successfully write to the migration log and can be reversed in automated tests.
- **SC-004**: System explicitly rejects unsupported file extensions before any parsing attempts.
