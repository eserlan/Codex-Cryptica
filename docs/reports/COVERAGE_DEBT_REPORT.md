# Test Coverage Debt & Improvement Roadmap

This report establishes the baseline coverage for Codex Cryptica as of March 19, 2026. It serves as a living document to track our progress toward the **70-80% Constitutional Coverage Goal**.

## 1. Executive Summary

We use a two-tier system: **Constitutional Goals** (where we want to be) and **Enforced Floors** (where we are now, enforced to prevent regression).

| Category             | Average Coverage | Constitutional Goal | Enforced Floor  | Status        |
| :------------------- | :--------------- | :------------------ | :-------------- | :------------ |
| **Core Engines**     | ~88.40%          | 70%                 | 70-90%          | ✅ TARGET MET |
| **Shared Utilities** | ~75.12%          | 80%                 | 80% (New)       | 🟡 DEBT       |
| **State Stores**     | ~82.20%          | 50%                 | 50%             | ✅ TARGET MET |
| **AI Services**      | ~85.20%          | 70%                 | 50% (App level) | ✅ TARGET MET |

---

## 2. Coverage Heatmap (The "Debt" List)

The following areas are currently below their **Constitutional Goals**. The **Enforced Floor** is set to their current baseline to prevent further regression ("Stop the Bleed").

### 🔴 Critical Risk (< 30% Coverage)

| Component           | Coverage  | Primary Owner | Issues                      |
| :------------------ | :-------- | :------------ | :-------------------------- |
| `vault/adapters.ts` | **33.3%** | State Stores  | Low priority wrapper logic. |
| `opfs.ts`           | **43.8%** | Shared Utils  | Primitives need more tests. |

### 🟡 Moderate Risk (30% - 60% Coverage)

| Component             | Coverage   | Issues                                          |
| :-------------------- | :--------- | :---------------------------------------------- |
| `@codex/graph-engine` | **54.45%** | Layout and Renderer logic is difficult to test. |
| `cache.svelte.ts`     | **44.44%** | Persistence layer requires better mocking.      |

---

## 3. Improvement Roadmap

### Phase 1: Foundational Reliability (Sprint 1-2)

**Goal**: Eliminate 0% coverage files in shared utilities.

- [x] Implement unit tests for `image-processing.ts` (**Actual: 100%**).
- [x] Add tests for `vault/relationships.ts` connection logic (**Actual: 100%**).
- [x] Increase `app-init.ts` coverage by testing boot sequences (**Actual: 65%**).

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
- [ ] Systematic increase of floors in all `vitest.config.ts` files by +5% per sprint.
- [ ] Reach **70%** floor for `graph-engine` and `canvas-engine`.

## 4. Best Practices for Improvement

1.  **Surgical PRs**: When touching a 🔴 file for a feature, add at least **3 tests** for existing logic in that file.
2.  **No New Debt**: New logic/files MUST meet the **Constitutional Goal (70%+)** upon creation.
3.  **Mocking First**: Use the established `vi.mock` patterns in `vault.test.ts` to isolate logic from OPFS/DB.

---

**Last Updated**: 2026-03-19
**Data Source**: `npm run test:coverage` (Phase 1, 2 & 3 Core Completed).
