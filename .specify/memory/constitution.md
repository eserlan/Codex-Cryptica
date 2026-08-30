<!--
Sync Impact Report
- Version change: 1.3.1 -> 1.4.0
- Modified principles: None
- Added sections: XIII. Discovery Intent Governance (new principle; minor bump)
- Removed sections: None
- Templates requiring updates:
  - ✅ Updated .specify/templates/plan-template.md; added a Discovery Intent Check to the Constitution Check gate.
  - ✅ Updated .specify/templates/tasks-template.md; registry task is now required for discovery-page features.
  - ✅ Verified .specify/templates/spec-template.md; no conflicting guidance.
  - ✅ Updated .github/pull_request_template.md; added the discovery intent checklist.
  - ✅ Wired `scripts/discovery-audit.mjs` into `apps/web` prebuild as the deterministic gate.
  - ✅ Updated AGENTS.md; discovery-page workflow now points at the registry.
- Follow-up TODOs: None
-->

# Codex-Arcana Constitution

## Core Principles

### I. Library-First

Every major feature (Importer, Search, Graph Engine) MUST be implemented as a standalone package within the `packages/` workspace. The web application should act as a thin UI layer over these self-contained libraries.

### II. Test-Driven Development (TDD)

No code logic (features, bug fixes, or improvements) shall be committed without corresponding unit tests. We follow the Red-Green-Refactor cycle: define the interface, write failing tests, implement the logic, and refactor for elegance.

### III. Simplicity & YAGNI

Leverage established open-source libraries (e.g., `mammoth`, `pdfjs`, `cytoscape`) rather than writing custom solutions for solved problems. Do not over-engineer for future "potential" needs; focus on the current feature set.

Before writing new logic, check whether the same logic already exists elsewhere in the codebase (the same package, a sibling package, or a shared `utils`). If it does, import and reuse it instead of reimplementing it. If a change would leave the same non-trivial logic duplicated in three or more places, extract it into a shared helper as part of that change rather than copy-pasting another instance. Place the extracted helper per Principle I: into the appropriate `packages/` workspace package if the logic isn't app-specific, or into a shared `utils` module within `apps/web` if it is.

### IV. AI-First Extraction

The Oracle (powered by OpenAI/Luna or a provider-neutral contract) is the primary engine for transforming unstructured data into the Codex. Systems should be designed to feed the Oracle clean text/data and handle its structured outputs (JSON/Markdown) with robust validation.

### V. Privacy & Client-Side Processing

Always prioritize client-side processing in the browser (OPFS, local library execution) to ensure user lore and data remain private and performant.

### VI. Clean Implementation (AI Guardrails)

To maintain build integrity and code quality, AI agents MUST:

1.  **Style Guide**: Adhere strictly to `@docs/STYLE_GUIDE.md` for all visual, behavioral, and architectural patterns (including Svelte 5 Runes, Tailwind 4 tokens, and Data Safety).
2.  **Implementation Hygiene**: Prefix unused variables/parameters with `_` and ensure comprehensive type definitions (e.g. `node` types) in workspace packages.
3.  **Validation**: Every code change MUST be verified with `bun run lint` and `bun run test` before considering the task complete.

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

### XI. Agent Operational Protocol (Karpathy Rules)

To ensure maximum efficiency and minimum disruption, AI agents MUST follow these operational rules:

1.  **Think First**: Before changing code, state the goal, assumptions, and any uncertainty. Do not silently guess when the request is ambiguous.
2.  **Simple Solutions**: Solve only the requested problem. Do not add extra features, abstractions, or "future-proofing" unless clearly needed (YAGNI).
3.  **Surgical Changes**: Touch only the files and code required. Do not refactor, reformat, or "clean up" unrelated code.
4.  **Verify Everything**: Define success criteria upfront. Run relevant tests, builds, and linting. Explicitly state what was and was not verified.

### XII. Terminology Unification: Labels Over Tags

To prevent user confusion and maintain conceptual clarity, the project converges entirely on the term "Labels" for all metadata categorization. We do not introduce or expose "Tags" to the user. Any automated categorization attributes (such as marking an entity as historical/deceased via an end date) MUST be stored, managed, and rendered as "Labels".

### XIII. Discovery Intent Governance

Any new or materially repositioned public, **indexable discovery page** MUST use and adhere to the discovery intent registry at `apps/web/src/lib/content/discovery/`.

1. **Register before implementing.** Before a discovery page is built, it MUST have a registered canonical path, primary intent, user job and unique-value rationale. "Targets another phrasing of the keyword" is not a unique value.
2. **Check existing ownership first.** Existing intent ownership MUST be checked before a new URL is created. Run `bun scripts/discovery-audit.mjs`, or look the phrasing up with `findIntentOwner`.
3. **Variants are aliases, not URLs.** Obvious synonyms, plurals and word-order variants MUST be recorded as aliases of the existing canonical intent rather than becoming separate pages.
4. **Overlap requires a different job.** Two pages may cover one subject only where they serve materially different user jobs (explain / create / show an example / adopt a workflow / evaluate / migrate). Deliberate overlap MUST be recorded with its reason.
5. **Not a keyword-page factory.** The registry exists to constrain the public surface, never to generate it. Pages MUST NOT be produced by enumerating keywords against a template.

This applies to public discovery surfaces — `/for`, `/answers`, `/examples`, generator and tool landing pages, `/solutions`, `/vs`, `/import`, evergreen reference blog posts and future equivalent families. It does NOT apply to ordinary application routes, legal pages or dated devlog posts, which are outside the governed set defined in `governed-routes.ts`.

Deterministic violations (duplicate ids, duplicate canonical paths, unowned intents, governed routes with no entry) are build failures. Judgement calls about semantic adjacency are reported for human review and MUST NOT be enforced by fuzzy matching.

See `docs/discovery-intent-registry.md` for the authoring workflow.

## Governance

This constitution is the ultimate arbiter of engineering quality. All implementation plans and code reviews must verify alignment with these principles.

**Version**: 1.4.0 | **Ratified**: 2026-05-23 | **Last Amended**: 2026-08-30
