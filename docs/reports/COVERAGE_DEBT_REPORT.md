# Test Coverage Debt & Improvement Roadmap

This report establishes the baseline coverage for Codex Cryptica as of March 19, 2026. It serves as a living document to track our progress toward the **70-80% Constitutional Coverage Goal**.

## 1. Executive Summary

We use a two-tier system: **Constitutional Goals** (where we want to be) and **Enforced Floors** (where we are now, enforced to prevent regression).

| Category             | Average Coverage | Constitutional Goal | Enforced Floor  | Status        |
| :------------------- | :--------------- | :------------------ | :-------------- | :------------ |
| **Core Engines**     | 58.12%           | 70%                 | 20-90%          | 🟡 DEBT       |
| **Shared Utilities** | 53.86%           | 80%                 | 80% (New)       | 🔴 HIGH DEBT  |
| **State Stores**     | 55.90%           | 50%                 | 50%             | ✅ TARGET MET |
| **AI Services**      | 49.83%           | 70%                 | 50% (App level) | 🟡 IMPROVING  |

---

## 2. Coverage Heatmap (The "Debt" List)

The following areas are currently below their **Constitutional Goals**. The **Enforced Floor** is set to their current baseline to prevent further regression ("Stop the Bleed").

### 🔴 Critical Risk (< 30% Coverage)

| Component                    | Coverage   | Primary Owner | Issues                              |
| :--------------------------- | :--------- | :------------ | :---------------------------------- |
| `@codex/sync-engine`         | **23.44%** | Sync core     | Complex async logic untracked.      |
| `vault/relationships.ts`     | **0.00%**  | Vault Engine  | No tests for entity linking logic.  |
| `image-processing.ts`        | **0.00%**  | Web Utils     | Critical asset logic untested.      |
| `text-generation.service.ts` | **14.11%** | AI Services   | Oracle core logic lacks unit tests. |

### 🟡 Moderate Risk (30% - 60% Coverage)

| Component              | Coverage   | Issues                                          |
| :--------------------- | :--------- | :---------------------------------------------- |
| `@codex/oracle-engine` | **44.73%** | Executor and Generator coverage is thin.        |
| `@codex/graph-engine`  | **54.45%** | Layout and Renderer logic is difficult to test. |
| `app/init/app-init.ts` | **28.57%** | Only error listeners are currently tested.      |
| `cache.svelte.ts`      | **44.44%** | Persistence layer requires better mocking.      |

---

## 3. Improvement Roadmap

### Phase 1: Foundational Reliability (Sprint 1-2)

**Goal**: Eliminate 0% coverage files in shared utilities.

- [ ] Implement unit tests for `image-processing.ts` (Target: 80%).
- [ ] Add tests for `vault/relationships.ts` connection logic (Target: 70%).
- [ ] Increase `app-init.ts` coverage by testing boot sequences (Target: 60%).

### Phase 2: Strengthening the "Brain" (Sprint 3-4)

**Goal**: Secure the AI and Sync infrastructure.

- [ ] Incremental test suite for `sync-engine` (Target: 20% -> 45%).
- [ ] Add mocks for Gemini API to test `text-generation.service.ts` (Target: 14% -> 50%).
- [ ] Increase `oracle-engine` floor to **55%**.

### Phase 3: The Constitutional Push (Sprint 5+)

**Goal**: Reach the 70% monorepo floor.

- [ ] Systematic increase of floors in all `vitest.config.ts` files by +5% per sprint.
- [ ] Reach **70%** floor for `vault-engine`, `graph-engine`, and `canvas-engine`.

## 4. Best Practices for Improvement

1.  **Surgical PRs**: When touching a 🔴 file for a feature, add at least **3 tests** for existing logic in that file.
2.  **No New Debt**: New logic/files MUST meet the **Constitutional Goal (70%+)** upon creation.
3.  **Mocking First**: Use the established `vi.mock` patterns in `vault.test.ts` to isolate logic from OPFS/DB.

---

**Last Updated**: 2026-03-19
**Data Source**: `npm run test:coverage` baseline.
