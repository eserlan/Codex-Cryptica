# ADR 007: Standardizing Dependency Injection (DI)

## Context and Problem Statement

The project is moving towards a "Library-First" architecture where core logic is extracted into standalone packages. Historically, some stores and services were implemented as tight singletons, making them difficult to unit test without complex module mocking.

We need a consistent way to manage dependencies that facilitates unit testing, decoupling, and flexibility across different environments (e.g., production vs. E2E tests).

## Decision

We will standardize on **Constructor-based Dependency Injection** for all new services and major refactors of existing ones.

1.  **Prefer Constructor Injection**: Services should receive their dependencies via the constructor.
2.  **Sensible Defaults**: To maintain developer productivity and a clean singleton pattern for production, constructors should provide default instances.
3.  **Export Class and Singleton**: Export both the class (for testing/subclassing) and a default instantiated singleton (for UI convenience).

### Implementation Pattern

```typescript
export class MyService {
  constructor(private dependency = otherServiceSingleton) {}

  doWork() {
    this.dependency.perform();
  }
}

export const myService = new MyService();
```

## Rationale

- **Testability**: Allows passing in mocks or specialized instances during unit tests without relying on global state or module-level mocks.
- **Explicit Dependencies**: Makes it clear what a service depends on by looking at its constructor signature.
- **Flexibility**: Simplifies swapping implementations for different tiers or experimental features.
- **Developer Experience**: Maintains the convenience of `import { myService } from "./my-service"` while allowing `new MyStore(mock)` in tests.

## Alternatives Considered

- **Inversion of Control (IoC) Containers**: Considered but rejected as too heavy for a client-side project. Constructor injection with defaults provides 90% of the benefit with zero overhead.
- **Setter Injection**: Rejected because it allows services to exist in a partially initialized state.

## Consequences

- Existing singletons should be refactored to this pattern when touched by new features.
- Tests should prefer creating fresh instances of services rather than relying on the exported global singleton.
- Refactoring existing code to this pattern may require minor updates to where those singletons are initialized.
