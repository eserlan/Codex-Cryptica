# Feature Specification: Import Progress Management

**Feature Branch**: `046-import-state-management`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/103. Features: Unique file identification via SHA-256 hashing, progress tracking in IndexedDB to skip processed chunks, 'Definition of Done' when AI returns JSON, and progress UI with resume capability and visual tracking."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Resuming a Large Import (Priority: P1)

As a lore keeper with massive world-building documents, I want the system to remember my import progress so that I don't lose time or AI tokens if I close the application or my connection is interrupted.

**Why this priority**: Large file imports are the most time-consuming and expensive part of the system. Ensuring they are resilient to interruption is critical for usability and cost-efficiency.

**Independent Test**: Can be fully tested by selecting a large file for import, allowing 50% to process, refreshing the application, and selecting the same file again. The system should immediately show 50% progress and begin processing from the first unhandled chunk.

**Acceptance Scenarios**:

1. **Given** a 10-chunk document that has processed 4 chunks, **When** I reload the application and select the same file, **Then** chunks 1-4 should be skipped and processing should start at chunk 5.
2. **Given** a resumed import, **When** the remaining chunks finish, **Then** all results (including those from the previous session) should be available for review.

---

### User Story 2 - Avoiding Redundant Processing (Priority: P2)

As a user who occasionally re-imports updated versions of my notes, I want the system to recognize content I've already processed so that I don't waste time reviewing duplicate proposals.

**Why this priority**: Users often refine their notes and re-import them. Without state management, they would be forced to re-verify every entity the AI discovers, even if nothing changed.

**Independent Test**: Can be tested by importing a file, completing the process, and then selecting the identical file again. The system should report that all chunks are already processed.

**Acceptance Scenarios**:

1. **Given** a file that was 100% processed in a previous session, **When** I select it for import again, **Then** the system should immediately show 100% completion and navigate to the review screen (if proposals exist) or notify me that no new content was found.

---

### User Story 3 - Visual Progress Tracking (Priority: P3)

As a user, I want to see a detailed progress indicator for my imports so that I understand how much work remains and can see which parts of my file are being analyzed.

**Why this priority**: Provides transparency and reduces perceived wait time during long-running tasks.

**Independent Test**: Can be tested by observing the import screen during a multi-chunk import and verifying the progress bar accurately reflects the "completed" chunks vs "in-progress" chunks.

**Acceptance Scenarios**:

1. **Given** an active import, **When** a chunk is sent to the Oracle, **Then** its segment in the progress UI should change to an "Active" state.
2. **Given** a chunk has returned valid JSON from the Oracle, **When** it is successfully saved to the registry, **Then** its segment should change to a "Completed" state.

---

### Edge Cases

- **File Modification**: If a user selects a file with the same name but different content (different hash), the system must treat it as a brand-new import and not attempt to resume using the old progress.
- **Empty Files**: How does the system handle files that result in zero chunks? (Assumption: Reported as immediate 100% completion with "No content found").
- **Corrupted Registry**: If the IndexedDB entry for a file is invalid, the system should fallback to starting the import from scratch.
- **Concurrent Imports**: The system MUST implement strict queueing for multiple file imports. Only one file signature is processed by the Oracle at a time to ensure stability and respect AI rate limits. New imports are added to a pending queue.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate a unique signature (hash) for every imported file to track its specific identity.
- **FR-002**: System MUST maintain a persistent registry of processed chunks for each file signature in local storage.
- **FR-003**: System MUST verify the file signature upon selection and automatically calculate the starting chunk index based on the registry.
- **FR-004**: System MUST mark a chunk as "Completed" immediately after receiving valid JSON output from the Oracle.
- **FR-005**: System MUST provide a user interface that displays segmented progress, distinguishing between skipped, completed, and pending chunks.
- **FR-006**: System MUST allow the user to manually "Restart" an import, ignoring any saved progress in the registry.
- **FR-007**: System MUST limit the size of the progress registry to a maximum of 10 unique file signatures, purging the oldest records to prevent excessive local storage growth.

### Key Entities

- **ImportRegistry**: Represents the persistent state of a specific file's import progress. Key: File Hash. Attributes: Total Chunks, Completed Chunk Bitmask/Array, Last Processed Timestamp.
- **ImportChunk**: A slice of the source document. Attributes: Index, Content Preview, Processing Status.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of previously completed chunks are skipped when re-importing an identical file.
- **SC-002**: The system identifies a resuming file and restores its state in under 500ms after selection.
- **SC-003**: The progress UI accurately reflects the real-time state of the background worker with less than 100ms latency.
- **SC-004**: System demonstrates a >90% reduction in redundant AI token consumption when re-importing identical files by skipping previously completed chunks.
