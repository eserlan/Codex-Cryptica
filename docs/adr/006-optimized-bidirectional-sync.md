# ADR 006: Optimized Bidirectional Synchronization

- **Status:** accepted
- **Deciders:** Espen, Gemini CLI
- **Date:** 2026-03-08

## Context and Problem Statement

The initial implementation of the bidirectional synchronization between the Origin Private File System (OPFS) and the local filesystem (FSA) suffered from several critical issues:

1.  **Performance Bottlenecks:** Hashing every file in the OPFS on every sync pass was prohibitively expensive for large vaults (thousands of files), leading to long "silent" pauses.
2.  **Conflict "Explosions":** Metadata-only change detection frequently flagged files as conflicting due to millisecond-level timestamp discrepancies between OS filesystems, resulting in thousands of redundant `.conflict-` files.
3.  **Sequential I/O:** Scanning and executing sync actions sequentially failed to utilize available I/O throughput, making the process slow and unresponsive.

## Decision

We have implemented a highly optimized, robust synchronization architecture:

1.  **Persistent Fingerprint Cache:** Introduced an IndexedDB-backed cache for OPFS file hashes. Hashes are now only re-calculated if a file's size or `lastModified` timestamp changes. This makes subsequent scans near-instant.
2.  **"Last Version Wins" Strategy:** To prevent conflict loops and messy filename extensions, we adopted a deterministic overwrite policy. The version with the most recent timestamp is favored, while identical content detection (binary-safe) ensures no transfers occur for unchanged files.
3.  **Parallelized Execution:** Both the scanning phase and the action execution phase now utilize concurrent processing (Concurrency = 5 for execution). This maximizes I/O throughput and significantly reduces total sync time.
4.  **Strict Conflict File Exclusion:** The sync engine now hard-excludes any files containing `.conflict-` to prevent the propagation of legacy sync mess. A dedicated "Squash History" utility is provided for manual cleanup.

## Decision Outcome

These changes transform the synchronization engine into a production-grade system capable of handling large-scale campaign data efficiently.

### Pros:

- **Instant Scans:** Sync passes now take milliseconds instead of tens of seconds for unchanged vaults.
- **Clean Filesystem:** No more redundant conflict files; the "Last version wins" approach keeps the vault tidy.
- **Improved UX:** High-resolution logging and progress updates (heartbeat every 500 files) provide transparent feedback to the user.

### Cons:

- **Registry Dependency:** The system relies on the Sync Registry in IndexedDB being consistent. We mitigated this by adding self-cleaning logic to the cleanup utilities.
- **Timestamp Reliance:** While "Last version wins" is robust, it depends on reasonably accurate OS clocks. We added content verification as a safety gate to prevent unnecessary overwrites.
