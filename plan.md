1. **Refactor `guest-history.ts` to use Dependency Injection for Storage:**
   - Update `apps/web/src/lib/services/publishing/guest-history.ts` to accept a `storage: StorageLike = browserStorage` parameter in its functions (`getGuestHistory`, `addGuestHistory`, `removeGuestHistory`, `clearGuestHistory`).
   - Remove the direct `localStorage` usage and the `typeof window === "undefined"` checks, as `browserStorage` already handles SSR safely.
   - This makes the storage boundary explicit, making testing simpler without relying on global browser APIs.

2. **Update Tests to Use Injected Storage:**
   - Modify `apps/web/src/lib/services/publishing/guest-history.test.ts` to instantiate a simple in-memory `StorageLike` object (e.g. using a `Record<string, string>`).
   - Pass this in-memory storage to the service functions in the tests.
   - Remove `localStorage.clear()` from test setup/teardown, as tests will now be perfectly isolated by their localized mock storage.
   - Ensure to verify unit tests for `guest-history` pass.

3. **Validate:**
   - Run the tests: `cd apps/web && bun run test:unit src/lib/services/publishing/guest-history.test.ts`
   - Run typecheck and linting: `cd apps/web && bun run check && bun run lint`

4. **Update Journal:**
   - Add an entry to `.Jules/binder.md` noting the pattern of injecting `StorageLike` and deferring SSR checks to `browserStorage` instead of hardcoding `typeof window !== 'undefined'` checks in services.

5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**

6. **Submit Pull Request:**
   - Use branch `binder/inject-storage-guest-history` and title `🧵 Binder: [inject storage dependency into guest history service]`.
