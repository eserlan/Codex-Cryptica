<!-- SYNC IMPACT REPORT
Version: 1.1.0 (Codex Arcana Ratification)
Modified Principles: Replaced generic Node.js principles with Codex Arcana specific laws (Local-First, Relational-First, Performance, Modularity, System-Agnostic, PWA Integrity).
Added Sections: Mantra, Forbidden Patterns (The "Anti-Spec").
Removed Sections: Technical Constraints (merged into principles or implied).
Templates Requiring Updates: tasks-template.md (add "Offline Functionality Verification" to checklist).
Follow-up: None.
-->

# Codex Arcana Constitution

> [!NOTE]
> **Mantra**: Sovereign data. Interconnected lore. Zero latency.

---

## Core Architectural Principles

### I. Local-First Sovereignty
*   **The Law**: Data must reside in the user's Origin Private File System (OPFS) or local directory.
*   **Constraint**: No feature shall require a centralized database or external account for core functionality.
*   **Format**: All lore must be persisted as Markdown files with YAML frontmatter to ensure human readability and interoperability with other tools (e.g., Obsidian).

### II. Relational-First Navigation
*   **The Law**: The Cytoscape Knowledge Graph is the primary interface.
*   **Constraint**: No entity shall exist in isolation. Every `/implement` task must ensure new entities are correctly "wired" into the graph.
*   **Automation**: Text-to-Graph synchronization is mandatory. Brackets `[[Link]]` in the editor must automatically generate edges in the graph engine.

### III. The Sub-100ms Performance Mandate
*   **The Law**: The interface must move at the speed of thought.
*   **Constraint**: Any UI component or graph layout algorithm that exceeds a 100ms execution time on a mobile browser is a constitutional violation.
*   **Efficiency**: Use **Svelte Stores** for lightweight state and **Web Workers** for heavy graph calculations to keep the main thread free.

---

## Development & Implementation Standards

### IV. Atomic Worldbuilding (Modularity)
*   **Constraint**: Every feature (Dice Roller, Audio Scribe, Map Engine) must be built as a standalone, pluggable module.
*   **Reuse**: The AI agent must favor reusing existing components over generating duplicate implementation logic.

### V. System-Agnostic Core
*   **The Law**: The engine is the stage, not the play.
*   **Constraint**: Game-specific logic (e.g., D&D 5e, Pathfinder) must be isolated in **JSON Schema adapters**. The core editor and graph must never be hardcoded to a specific TTRPG system.

### VI. Pure Functional Core
*   **The Law**: Logic is math; UI is a side effect.
*   **Constraint**: All business logic (graph parsing, schema validation, dice math) must be implemented as **pure, deterministic functions**.
*   **Isolation**: Keep the "messy" side effects (DOM updates, storage I/O, network requests) isolated at the edges of the system. This ensures the core engine is portable and trivially testable.

### VII. Verifiable Reality (Testing Rigor)
*   **The Law**: Unverified code is technical debt.
*   **Constraint**: No feature is complete without a corresponding test suite.
*   **Structure**: 
    1.  **Unit Tests**: Mandatory for all pure functions in the core packages.
    2.  **Integration Tests**: Mandated for cross-package communication and storage layers.
    3.  **End-to-End (E2E)**: Mandatory for critical user paths (e.g., "Note creation to Graph visualization"). If it doesn't work in a headless browser, it doesn't work.

### VIII. Test-First PWA Integrity
*   **The Law**: If it doesn't work offline, it doesn't work.
*   **Constraint**: Every feature must include a Service Worker strategy for offline caching.
*   **Verification**: Acceptance criteria in every `/tasks` breakdown must include "Offline Functionality Verification."

---

## Forbidden Patterns (The "Anti-Spec")

> [WARNING]
>
> These patterns represent architectural rot and are strictly prohibited.

*   **No "Phone Home"**: Prohibit any telemetry or background sync that sends lore data to an external server.
*   **No Proprietary Binary Blobs**: Lore must never be stored in a format that cannot be opened in a standard text editor.
*   **No Blocking UI**: Never perform file system I/O or graph layout on the main thread.

---

## Governance

This Constitution supersedes all other development practices and guidelines. Any deviation must be explicitly justified and documented. Amendments require a Pull Request, team discussion, and formal approval. Compliance is verified during Code Review and CI checks.

---

**Version**: `1.2.0` | **Ratified**: `2026-01-23` | **Last Amended**: `2026-01-23`

