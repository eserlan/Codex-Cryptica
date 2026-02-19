# E2E Test Failure Report

**Date:** 2026-01-26
**Branch:** fix/e2e-repair

## Summary
Executed the full E2E test suite and encountered 37 failures, exceeding the threshold of 10. As per instructions, the process was halted to report systemic issues.

## key Findings

1.  **Service Worker Registration Failure**
    -   Error: `TypeError: Failed to register a ServiceWorker ... ServiceWorker script evaluation failed`
    -   Occurs in both `dev` and `preview` modes.
    -   Likely due to an issue with `$service-worker` virtual module imports or a runtime exception in `service-worker.js`.
    -   This impacts offline capabilities and may cause initialization delays/errors in tests.

2.  **Missing Environment Variables**
    -   `VITE_GOOGLE_CLIENT_ID` is missing, affecting Google Drive integration tests.

3.  **Timeouts**
    -   Many tests timed out (30s) waiting for UI elements, likely due to blocked initialization or the Service Worker error cascading.

## Recommendations
-   Investigate `apps/web/src/service-worker.ts` and its build output.
-   Ensure `$service-worker` imports are correctly handled in the test environment.
-   Consider disabling Service Worker in test configuration if not explicitly testing offline features.
