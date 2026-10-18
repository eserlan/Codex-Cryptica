## 2025-05-18 - AdventureSessionRepository dependency boundaries

**Learning:** Replaced `generateId: () => string = () => crypto.randomUUID()` and `now: () => number = () => Date.now()` with explicit `IdGenerator` and `Clock` dependency objects (with defaults mapped to `systemIdGenerator` and `systemClock`). This standardizes the dependency pattern and makes instantiating mocks in test files cleaner by leveraging object shapes directly without needing positional arguments.

**Action:** Standardized constructor pattern to `deps: { idGenerator?: IdGenerator; clock?: Clock } = {}` within the web application service `AdventureSessionRepository`, ensuring `Date.now()` and `crypto.randomUUID()` usage are managed via the dedicated DI interface `@codex/runtime` provides.
