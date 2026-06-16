## 2024-06-16 - Injecting Time and Crypto Dependencies

**Learning:** Global browser APIs (`crypto.getRandomValues`) and time sources (`Date.now()`) create hidden side effects and testability issues, often requiring awkward global `vi.spyOn` mocks and manipulation of a class's internal state to ensure test stability.
**Action:** Always wrap and inject `getRandomValues` and `now` as optional dependencies with production defaults. This simplifies tests by passing explicit mock dependencies when initializing the class, rather than mocking globals and reaching into encapsulated variables like `(engine as any).bufferIndex`.
