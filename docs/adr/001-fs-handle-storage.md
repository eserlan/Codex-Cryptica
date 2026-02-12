# ADR 001: Local-First Storage Strategy

- **Status:** Superseded by OPFS-first architecture
- **Date:** 2026-02-11

---

## Original Problem Statement (Pre-OPFS)

This ADR originally addressed a conflict between Svelte 5's Proxy-based reactivity and the brand checks performed by the File System Access API (FSA). The initial decision was to store FSA handles in private, non-reactive class fields to prevent them from being proxied.

### Limitations of the Original Solution

While storing handles non-reactively solved the Svelte Proxy issue on desktop, it did not resolve a more fundamental problem on mobile devices (Chrome on Android) and in sandboxed environments. FSA handles on these platforms can have their write permissions silently revoked by the OS, leading to a `NoModificationAllowedError` that is difficult to recover from without a fresh user gesture (re-picking the folder). This made the application unreliable for mobile users.

---

## New Architecture: OPFS-First with FSA for Export

- **Status:** Active
- **Date:** 2026-02-11

## Context and Problem Statement

The application requires a robust, local-first storage solution that works reliably across desktop and mobile, without requiring constant permission prompts. The `NoModificationAllowedError` with the File System Access API on mobile makes it unsuitable for primary "working" storage.

## Decision

We have adopted a hybrid storage architecture:

1.  **Primary Storage (Working Memory):** The **Origin Private File System (OPFS)** is now the primary storage location for the vault.
    -   **Pros:**
        -   **High-Performance:** Optimized for frequent read/write operations.
        -   **No Prompts:** Once initialized, it does not require user permission prompts for access.
        -   **Reliable:** Not subject to the same silent permission revocation as FSA handles on mobile.
        -   **Solves Brand-Check:** As it's a separate file system managed by the browser, the handle management is simpler and not exposed to the same Svelte reactivity issues.
    -   **Cons:**
        -   **Opaque to User:** The file system is a black box managed by the browser. Users cannot easily access or manipulate their files with external editors.

2.  **User-Directed Sync (Long-Term Storage):** The **File System Access API (FSA)** is retained for a user-initiated "Sync to Local Folder" feature.
    -   **Pros:**
        -   **User Sovereignty:** Provides a mechanism for users to export their entire vault to a visible, durable location on their disk. This serves as a backup and allows for external editing.
    -   **Cons:**
        -   Subject to the permission issues that make it unsuitable for primary storage, but acceptable for a manual, user-triggered export process.

## Decision Outcome

This hybrid approach provides the best of both worlds: the reliability and performance of OPFS for the core application experience, and the user control and data portability of FSA for backups and external access. All core application logic now exclusively targets OPFS.

### Implementation Details

1.  **`VaultStore` Refactor:** The store was refactored to use OPFS handles for all file operations.
2.  **`Sync to Local` Feature:** A new UI control was added to allow users to trigger a full sync from OPFS to a user-selected local directory.
3.  **Migration Path:** A one-time, automatic migration was created to move existing FSA-based vaults into the OPFS on first launch.
