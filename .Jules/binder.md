## 2026-06-16 - Injecting Time and Crypto Dependencies

**Learning:** Global browser APIs (`crypto.getRandomValues`) and time sources (`Date.now()`) create hidden side effects and testability issues, often requiring awkward global `vi.spyOn` mocks and manipulation of a class's internal state to ensure test stability.
**Action:** Always wrap and inject `getRandomValues` and `now` as optional dependencies with production defaults. This simplifies tests by passing explicit mock dependencies when initializing the class, rather than mocking globals and reaching into encapsulated variables like `(engine as any).bufferIndex`.
## 2026-06-18 - Time injection needs to evaluate on demand
**Learning:** When injecting time dependencies (e.g., `Date.now()`), evaluating it once and storing it in a local variable before asynchronous operations (like `await`) will cause subsequent logic or events to use stale timestamps.
**Action:** Always use a helper method (e.g., `getNow()`) to fetch the injected time exactly at the moment it is needed.
