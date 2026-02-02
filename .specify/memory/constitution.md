# Codex-Arcana Constitution

## Core Principles

### I. Library-First
Every major feature (Importer, Search, Graph Engine) MUST be implemented as a standalone package within the `packages/` workspace. The web application should act as a thin UI layer over these self-contained libraries.

### II. Test-Driven Development (TDD)
No feature logic shall be committed without corresponding unit tests. We follow the Red-Green-Refactor cycle: define the interface, write failing tests, implement the logic, and refactor for elegance.

### III. Simplicity & YAGNI
Leverage established open-source libraries (e.g., `mammoth`, `pdfjs`, `cytoscape`) rather than writing custom solutions for solved problems. Do not over-engineer for future "potential" needs; focus on the current feature set.

### IV. AI-First Extraction
The Oracle (Gemini) is the primary engine for transforming unstructured data into the Codex. Systems should be designed to feed the Oracle clean text/data and handle its structured outputs (JSON/Markdown) with robust validation.

### V. Privacy & Client-Side Processing
Always prioritize client-side processing in the browser (OPFS, local library execution) to ensure user lore and data remain private and performant.

## Governance
This constitution is the ultimate arbiter of engineering quality. All implementation plans and code reviews must verify alignment with these principles.

**Version**: 1.0.0 | **Ratified**: 2026-02-01 | **Last Amended**: 2026-02-01
