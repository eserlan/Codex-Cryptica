# Testing & Coverage Guide

This project uses [Vitest](https://vitest.dev/) for unit and integration testing, and [Playwright](https://playwright.dev/) for end-to-end testing.

## Unit & Integration Tests

Unit tests are located alongside the source code they test, typically with `.test.ts` or `.spec.ts` extensions.

### Running Tests

To run all unit tests across the entire monorepo:

```bash
bun test
```

To run tests for a specific package:

```bash
bun run --filter @codex/vault-engine test
```

### Test Coverage

We use `@vitest/coverage-v8` to generate coverage reports.

To run tests with coverage:

```bash
bun run test:coverage
```

Coverage reports are generated in the `coverage/` directory of each package. You can view the HTML report by opening `coverage/index.html` in your browser.

## Minimal Coverage Requirements

To maintain long-term stability and prevent regressions, we use a two-tier coverage system:

1.  **Constitutional Goal**: The long-term target for high-quality, stable code.
2.  **Enforced Floor**: The current baseline, enforced by CI to prevent new regressions ("Stop the Bleed").

| Component Type       | Statements (Goal) | Statements (Floor) | Status                      |
| :------------------- | :---------------- | :----------------- | :-------------------------- |
| **Shared Utilities** | **80%**           | **80%**            | ✅ TARGET MET               |
| **Core Engines**     | **70%**           | **20-90%**         | 🟡 DEBT (Baseline Enforced) |
| **State Stores**     | **50%**           | **45-50%**         | ✅ TARGET MET               |

### Enforcement Policy

1.  **Stop the Bleed**: Enforced floors are set to each package's current baseline. Pull requests that drop coverage below these levels will fail CI.
2.  **New Features**: Any new package or utility MUST reach the **Constitutional Goal (70%+)** upon introduction.
3.  **Refactors**: When refactoring 🔴 debt areas (e.g. Sync Engine), the Enforced Floor should be surgically increased in `vitest.config.ts` to lock in the new tests.

## End-to-End (E2E) Tests

E2E tests are located in `apps/web/tests` and are managed by Playwright.

### Running E2E Tests

To run E2E tests:

```bash
bun run test:e2e
```

> [!IMPORTANT]
> **Playwright E2E Process Hanging**: Always run E2E tests with the `--reporter=list` flag (e.g. `bun run test:e2e -- --reporter=list` or configure it directly in Playwright CLI args) to prevent the test execution process from hanging in Linux and continuous integration environments.

## Continuous Integration (CI)

Our CI pipeline (GitHub Actions) runs linting, unit tests with coverage, and builds the application on every push and pull request.

Coverage reports are uploaded as artifacts in the GitHub Actions run summary, named `coverage-production` and `coverage-staging`.

## Testing Stateful & Risky Surfaces

To ensure the safety and predictability of high-risk, stateful systems, we utilize specialized testing strategies tailored to the complexity and risk profile of each component.

### 1. Mock-Driven Stateful Execution (Sync Engine)

When testing complex orchestrations (such as the `SyncActionExecutor`), we isolate behavior using mock backends, mock registry, and mock comparators. This enables deterministic testing of:

- **Action Scenarios**: Exact behaviors of actions like `MATCH_INITIAL` (verifying fast-paths), `EXPORT_TO_FS` / `IMPORT_TO_OPFS` (conditional uploads), conflict resolution rules (comparing modification times), and deletion propagates (`DELETE_FS` / `DELETE_OPFS`).
- **Abort & Error Propagation**: Validating that an aborted `AbortSignal` throws an `AbortError` immediately and halts all state writes.
- **Boundary Handling**: Verify that hash and size mismatches trigger the correct synchronization flow.

### 2. Full-Fidelity Serialization Round-Trips (Vault Engine)

To verify files are serialized and parsed with absolute fidelity, we employ round-trip integration tests rather than mocking the filesystem or parser.

- **Pattern**:
  1. Build a fully populated mock entity containing every field in the `EntitySchema` (nested complex dates, metadata coordinates, soundbites, labels, and aliases).
  2. Serialize using `stringifyEntity(entity)`.
  3. Re-parse using the real `parseMarkdown(text, path)`.
  4. Assert deep equality of the output with the input (accounting for expected normalizations, like default fields or auto-derived fields such as the `past` label).

### 3. Property-Based & Simulation Testing (Chronology Engine)

For calendar configurations where inputs are highly variable and error-prone (leap years, month/week configuration swaps mid-session), we utilize property-based testing and rapid randomized state mutations.

- **Validation Rules**: Ensure that linear timeline values (`getTimelineValue`) always increase monotonically, regardless of month list swaps.
- **Cache Coherency**: Validate that calendar cache entries do not collide or return stale values when switching between Gregorian and custom calendar structures.

### 4. Faux-DB Upgrade & Concurrency Testing (Proposer Service)

To test IndexedDB migrations and database concurrency issues in a node/vitest environment, we utilize `fake-indexeddb` with manual connection controls.

- **Blocked Upgrade Simulation**: Simulating multi-tab scenarios where a database upgrade is requested but blocked by an open connection, validating that the connection closes gracefully and allows the upgrade to proceed.
- **Migration Verification**: Creating an old version database, writing sample records, running the migration, and verifying that new schema indexes are successfully created and data remains uncorrupted.

## Best Practices

1.  **Write Testable Code**: Use dependency injection and modular components to make testing easier.
2.  **Coverage Goals**: Aim for high coverage in core logic packages (engines, services).
3.  **Mocking**: Use Vitest's mocking capabilities (`vi.mock`, `vi.fn`) to isolate the code under test.
4.  **E2E for Critical Paths**: Use Playwright to verify critical user journeys like vault creation, importing, and graph interaction.
