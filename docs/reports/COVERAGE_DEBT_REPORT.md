# Test Coverage Debt & Improvement Roadmap

This report establishes the baseline coverage for Codex Cryptica as of March 19, 2026. It serves as a living document to track our progress toward the **70-80% Constitutional Coverage Goal**.

## 1. Executive Summary

We use a two-tier system: **Constitutional Goals** (where we want to be) and **Enforced Floors** (where we are now, enforced to prevent regression).

| Category             | Average Coverage | Constitutional Goal | Enforced Floor  | Status        |
| :------------------- | :--------------- | :------------------ | :-------------- | :------------ |
| **Core Engines**     | ~75.42%          | 70%                 | 60-90%          | ✅ TARGET MET |
| **Shared Utilities** | ~72.15%          | 80%                 | 80% (New)       | 🟡 DEBT       |
| **State Stores**     | ~72.50%          | 50%                 | 50%             | ✅ TARGET MET |
| **AI Services**      | ~85.20%          | 70%                 | 50% (App level) | ✅ TARGET MET |

---

## 2. Coverage Heatmap (The "Debt" List)

The following areas are currently below their **Constitutional Goals**. The **Enforced Floor** is set to their current baseline to prevent further regression ("Stop the Bleed").

### 🔴 Critical Risk (< 30% Coverage)

| Component       | Coverage  | Primary Owner | Issues                    |
| :-------------- | :-------- | :------------ | :------------------------ |
| `vault/crud.ts` | **13.6%** | State Stores  | Core CRUD logic untested. |
| `vault/io.ts`   | **11.8%** | State Stores  | Disk I/O logic debt.      |

### 🟡 Moderate Risk (30% - 60% Coverage)

| Component              | Coverage   | Issues                                          |
| :--------------------- | :--------- | :---------------------------------------------- |
| `@codex/oracle-engine` | **44.73%** | Executor and Generator coverage is thin.        |
| `@codex/graph-engine`  | **54.45%** | Layout and Renderer logic is difficult to test. |
| `cache.svelte.ts`      | **44.44%** | Persistence layer requires better mocking.      |
| `opfs.ts`              | **43.84%** | Critical sync primitives need more validation.  |

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
- [ ] Increase `oracle-engine` floor to **55%**.

### Phase 3: The Constitutional Push (Sprint 5+)

**Goal**: Reach the 70% monorepo floor.

- [ ] Systematic increase of floors in all `vitest.config.ts` files by +5% per sprint.
- [ ] Reach **70%** floor for `vault-engine`, `graph-engine`, and `canvas-engine`.
- [ ] Tackle `vault/crud.ts` and `vault/io.ts` complexity (Target: 50%).

## 4. Best Practices for Improvement

1.  **Surgical PRs**: When touching a 🔴 file for a feature, add at least **3 tests** for existing logic in that file.
2.  **No New Debt**: New logic/files MUST meet the **Constitutional Goal (70%+)** upon creation.
3.  **Mocking First**: Use the established `vi.mock` patterns in `vault.test.ts` to isolate logic from OPFS/DB.

---

**Last Updated**: 2026-03-19
**Data Source**: `npm run test:coverage` (Post-Phase 1&2 completion).
