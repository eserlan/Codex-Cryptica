# Codex-Arcana Constitution

## Core Principles

### I. Library-First

Every major feature (Importer, Search, Graph Engine) MUST be implemented as a standalone package within the `packages/` workspace. The web application should act as a thin UI layer over these self-contained libraries.

### II. Test-Driven Development (TDD)

No code logic (features, bug fixes, or improvements) shall be committed without corresponding unit tests. We follow the Red-Green-Refactor cycle: define the interface, write failing tests, implement the logic, and refactor for elegance.

### III. Simplicity & YAGNI

Leverage established open-source libraries (e.g., `mammoth`, `pdfjs`, `cytoscape`) rather than writing custom solutions for solved problems. Do not over-engineer for future "potential" needs; focus on the current feature set.

### IV. AI-First Extraction

The Oracle (Gemini) is the primary engine for transforming unstructured data into the Codex. Systems should be designed to feed the Oracle clean text/data and handle its structured outputs (JSON/Markdown) with robust validation.

### V. Privacy & Client-Side Processing

Always prioritize client-side processing in the browser (OPFS, local library execution) to ensure user lore and data remain private and performant.

### VI. Clean Implementation (AI Guardrails)

To maintain build integrity and code quality, AI agents MUST:

1. Prefix unused variables/parameters with `_`.
2. Avoid stale state warnings in Svelte 5 by using `$derived` instead of `$state(prop)`.
3. Adhere to Tailwind 4 CSS syntax standards.
4. Ensure comprehensive type definitions (e.g. `node` types) in workspace packages.

### VII. User Documentation

Every major feature MUST include a corresponding user-facing help description or guide article within `apps/web/src/lib/config/help-content.ts`. Features with complex interactions SHOULD also include a `FeatureHint` to guide first-time usage.

### VIII. Dependency Injection (DI)

To ensure unit-testability and modularity, all services and stores MUST use constructor-based dependency injection. Constructors should provide sensible defaults for production while allowing mocks to be passed in during tests. Export both the class and a default singleton. (See ADR 007).

### IX. Natural Language

All user-facing text MUST use clear, approachable, and accessible language. Avoid unnecessary jargon, pretentious technical terms, or overly complex metaphors (e.g., prefer "Importer" over "Ingestion Terminal", "Break Down" over "Fragment"). Aim for a readability level that is easy to understand for non-technical users.

### X. Quality & Coverage Enforcement

To maintain long-term stability, every merge MUST maintain or improve test coverage.

- **Goals**: We aim for **80%** coverage for utilities, **70%** for engines, and **50%** for stores.
- **Enforcement**: CI enforces a "Floor" based on each component's current baseline. Dropping below the floor requires explicit justification.
- **New Code**: New packages and major logic extractions MUST meet the **70% Goal** upon introduction.

## Governance

This constitution is the ultimate arbiter of engineering quality. All implementation plans and code reviews must verify alignment with these principles.

**Version**: 1.0.9 | **Ratified**: 2026-03-19 | **Last Amended**: 2026-03-19
