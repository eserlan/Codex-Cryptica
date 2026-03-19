# Testing & Coverage Guide

This project uses [Vitest](https://vitest.dev/) for unit and integration testing, and [Playwright](https://playwright.dev/) for end-to-end testing.

## Unit & Integration Tests

Unit tests are located alongside the source code they test, typically with `.test.ts` or `.spec.ts` extensions.

### Running Tests

To run all unit tests across the entire monorepo:

```bash
npm test
```

To run tests for a specific package:

```bash
npm test --workspace=@codex/vault-engine
```

### Test Coverage

We use `@vitest/coverage-v8` to generate coverage reports.

To run tests with coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory of each package. You can view the HTML report by opening `coverage/index.html` in your browser.

## End-to-End (E2E) Tests

E2E tests are located in `apps/web/tests` and are managed by Playwright.

### Running E2E Tests

```bash
npm run test:e2e
```

## Continuous Integration (CI)

Our CI pipeline (GitHub Actions) runs linting, unit tests with coverage, and builds the application on every push and pull request.

Coverage reports are uploaded as artifacts in the GitHub Actions run summary, named `coverage-production` and `coverage-staging`.

## Best Practices

1.  **Write Testable Code**: Use dependency injection and modular components to make testing easier.
2.  **Coverage Goals**: Aim for high coverage in core logic packages (engines, services).
3.  **Mocking**: Use Vitest's mocking capabilities (`vi.mock`, `vi.fn`) to isolate the code under test.
4.  **E2E for Critical Paths**: Use Playwright to verify critical user journeys like vault creation, importing, and graph interaction.
