## 2026-06-16 - Injecting Time and Crypto Dependencies

**Learning:** Global browser APIs (`crypto.getRandomValues`) and time sources (`Date.now()`) create hidden side effects and testability issues, often requiring awkward global `vi.spyOn` mocks and manipulation of a class's internal state to ensure test stability.
**Action:** Always wrap and inject `getRandomValues` and `now` as optional dependencies with production defaults. This simplifies tests by passing explicit mock dependencies when initializing the class, rather than mocking globals and reaching into encapsulated variables like `(engine as any).bufferIndex`.

## 2026-06-18 - Time injection needs to evaluate on demand

**Learning:** When injecting time dependencies (e.g., `Date.now()`), evaluating it once and storing it in a local variable before asynchronous operations (like `await`) will cause subsequent logic or events to use stale timestamps.
**Action:** Always use a helper method (e.g., `getNow()`) to fetch the injected time exactly at the moment it is needed.

## 2024-05-18 - CloudSyncMetadataService Clock Injection

**Learning:** Hardcoded `Date.now()` inside business logic classes (like CloudSyncMetadataService) forces tests to use imprecise assertions like `toBeGreaterThanOrEqual` and relies on time-sensitive local variables.
**Action:** Inject `now: () => number = Date.now` as an optional constructor dependency for stateful services, allowing tests to pass a frozen time function (`() => 150000`) and assert exact outcomes deterministically without global monkey-patching.

## 2024-06-22 - Inject dependencies into createEncounterSession

**Learning:** The `apps/web` application defines ambient runtime dependencies (e.g., `systemIdGenerator`, `systemClock`, `IdGenerator`, `Clock`) in `src/lib/utils/runtime-deps.ts`. These can be used as default parameter values to inject ID generation and time into session creation logic without breaking existing call sites.
**Action:** When injecting time and id dependencies into `createEncounterSession`, add a `deps` parameter at the end to maintain backward compatibility with `id` and `name` positional arguments.

## 2025-02-23 - Inject systemClock and systemIdGenerator into UndoRedoService

**Learning:** `oracle-engine` uses a pattern of injecting `systemClock` and `systemIdGenerator` from `./runtime.ts` into constructors to allow faking time and randomness in tests.
**Action:** When working in `oracle-engine`, ensure `Date.now()` and `crypto.randomUUID()` calls are replaced with injected dependencies from `./runtime.ts` using this pattern.

## 2026-07-01 - Vitest vi.spyOn causes issues with timers

**Learning:** `vi.spyOn(Date, "now")` and `vi.useRealTimers()` in Vitest tests can cause cross-module test pollution, crash the test runner, or throw ReferenceErrors (e.g., `vi.useRealTimers is not a function`).
**Action:** For pure functions or standard exported functions relying on time, inject an explicit `Clock` interface (`{ now(): number }`) rather than mocking the global environment in Vitest.

## 2025-06-28 - [Inject time dependencies to improve test isolation]

**Learning:** Global monkey-patching of ambient runtime dependencies like `Date.now()` with `vi.spyOn(Date, "now")` can cause unexpected test suite crashes in some Vitest/Bun configurations, particularly when tests pollute each other across module boundaries or fail due to mismatched testing environments.
**Action:** Inject ambient dependencies like time (`now()`) or ID generators directly into functions or service constructors as optional defaults (e.g., `now: () => number = Date.now`). This allows fakes to be explicitly passed in tests, isolating state, avoiding global mocks, and preserving production behavior.

## 2026-06-29 - Update subclasses when injecting into BaseExecutor constructors

**Learning:** When injecting time dependencies (or any dependencies) into the constructor of an abstract base class (`BaseExecutor`), all concrete subclasses (e.g. `PlotExecutor`, `ChatExecutor`, `ReviseExecutor`) must be updated to also accept that dependency (often as an optional parameter) and pass it to `super(clock)`. Otherwise, the dependency cannot actually be injected when instantiating the concrete classes, defeating the purpose of the test seam.
**Action:** When modifying a base class constructor to inject dependencies, search for all occurrences of `extends BaseClass` and update their constructors accordingly.
