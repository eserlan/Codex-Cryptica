# Test Coverage Debt & Improvement Roadmap

This report establishes the baseline coverage for Codex Cryptica as of March 19, 2026. It serves as a living document to track our progress toward the **70-80% Constitutional Coverage Goal**.

## 1. Executive Summary

We use a two-tier system: **Constitutional Goals** (where we want to be) and **Enforced Floors** (where we are now, enforced to prevent regression).

| Category             | Average Coverage | Constitutional Goal | Enforced Floor  | Status        |
| :------------------- | :--------------- | :------------------ | :-------------- | :------------ |
| **Core Engines**     | ~79.93%          | 70%                 | 70-90%          | ✅ TARGET MET |
| **Shared Utilities** | ~81.99%          | 80%                 | 80%             | ✅ TARGET MET |
| **State Stores**     | ~71.16%          | 50%                 | 50%             | ✅ TARGET MET |
| **AI Services**      | ~74.20%          | 70%                 | 50% (App level) | ✅ TARGET MET |

---

## 2. Coverage Heatmap (Clear!)

All high-priority targets from Phase 1, 2, and 3 have been successfully addressed. There are currently no components under 30% in critical infrastructure.

### ✅ Components Meeting Goals (> 65%)

| Component                    | Coverage   | Status      |
| :--------------------------- | :--------- | :---------- |
| `image-processing.ts`        | **100%**   | Target Met. |
| `vault/relationships.ts`     | **100%**   | Target Met. |
| `map-registry.svelte.ts`     | **100%**   | Target Met. |
| `SyncRegistry.ts`            | **100%**   | Target Met. |
| `LocalSyncService.ts`        | **100%**   | Target Met. |
| `text-generation.service.ts` | **98.82%** | Target Met. |
| `node-merge.service.ts`      | **96.47%** | Target Met. |
| `map-engine/src`             | **95.34%** | Target Met. |
| `vault/crud.ts`              | **92.00%** | Target Met. |
| `vault/lifecycle.ts`         | **85.08%** | Target Met. |
| `vault/entities.ts`          | **84.55%** | Target Met. |
| `vault/io.ts`                | **84.54%** | Target Met. |
| `@codex/oracle-engine`       | **82.58%** | Target Met. |
| `opfs.ts`                    | **75.38%** | Target Met. |
| `@codex/sync-engine`         | **74.56%** | Target Met. |
| `cache.svelte.ts`            | **68.25%** | Target Met. |

### 🟡 Remaining Debt (Moderate Risk 30% - 60%)

| Component                  | Coverage   | Issues                                          |
| :------------------------- | :--------- | :---------------------------------------------- |
| `dice-history.svelte.ts`   | **31.57%** | Secondary feature, low priority.                |
| `vault/adapters.svelte.ts` | **33.33%** | Wrapper logic, low risk.                        |
| `@codex/graph-engine`      | **54.45%** | Layout and Renderer logic is difficult to test. |

---

## 3. Improvement Roadmap

### Phase 1: Foundational Reliability (Sprint 1-2)

**Goal**: Eliminate 0% coverage files in shared utilities.

- [x] Implement unit tests for `image-processing.ts` (**Actual: 100%**).
- [x] Add tests for `vault/relationships.ts` connection logic (**Actual: 100%**).
- [x] Increase `app-init.ts` coverage (**Actual: 65%**).

### Phase 2: Strengthening the "Brain" (Sprint 3-4)

**Goal**: Secure the AI and Sync infrastructure.

- [x] Incremental test suite for `sync-engine` (**Actual: 74.56%**).
- [x] Add mocks for Gemini API to test `text-generation.service.ts` (**Actual: 98.82%**).
- [x] Implement unit tests for `node-merge.service.ts` (**Actual: 96.47%**).
- [x] Achieve coverage for `map-registry.svelte.ts` (**Actual: 100%**).
- [x] Increase `oracle-engine` floor to **55%** (**Actual: 82.58%**).

### Phase 3: The Constitutional Push (Sprint 5+)

**Goal**: Reach the 70% monorepo floor.

- [x] Implement unit tests for `vault/crud.ts` (**Actual: 92.00%**).
- [x] Implement unit tests for `vault/io.ts` (**Actual: 84.54%**).
- [x] Implement unit tests for `vault/entities.ts` (**Actual: 84.55%**).
- [x] Implement unit tests for `vault/migration.ts` (**Actual: 77.77%**).
- [x] Implement unit tests for `vault/lifecycle.ts` (**Actual: 85.08%**).
- [x] Implement unit tests for `map-engine` (**Actual: 95.34%**).
- [x] Improve `opfs.ts` coverage (**Actual: 75.38%**).
- [x] Improve `cache.svelte.ts` coverage (**Actual: 68.25%**).
- [ ] Reach **70%** floor for `graph-engine` and `canvas-engine`.

## 4. Best Practices for Improvement

1.  **Surgical PRs**: When touching a 🔴 file for a feature, add at least **3 tests** for existing logic in that file.
2.  **No New Debt**: New logic/files MUST meet the **Constitutional Goal (70%+)** upon creation.
3.  **Mocking First**: Use the established `vi.mock` patterns in `vault.test.ts` to isolate logic from OPFS/DB.

---

**Last Updated**: 2026-03-20
**Data Source**: `npm run test:coverage` (Infrastructure Cleanup Complete).
