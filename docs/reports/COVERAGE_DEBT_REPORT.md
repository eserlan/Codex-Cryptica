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

## 3. Current Coverage Baselines (2026-03-20)

### 🟢 Healthy Components (Target > 70%)

| Component                    | Coverage   | Status      |
| :--------------------------- | :--------- | :---------- |
| `@codex/canvas-engine`        | **100.00%**| Target Met. |
| `search.worker.ts`           | **100.00%**| Target Met. |
| `markdown.ts`                | **97.36%** | Target Met. |
| `@codex/chronology-engine`    | **95.83%** | Target Met. |
| `@codex/importer`             | **90.42%** | Target Met. |
| `@codex/graph-engine`         | **89.22%** | Target Met. |
| `idb.ts`                     | **88.52%** | Target Met. |
| `vault/entities.ts`          | **84.55%** | Target Met. |
| `vault/io.ts`                | **84.54%** | Target Met. |
| `@codex/oracle-engine`       | **82.58%** | Target Met. |
| `@codex/proposer`            | **81.94%** | Target Met. |
| `opfs.ts`                    | **75.38%** | Target Met. |
| `@codex/sync-engine`         | **74.56%** | Target Met. |
| `app-init.ts`                | **72.41%** | Target Met. |
| `cache.svelte.ts`            | **68.25%** | Target Met. |

### 🟡 Remaining Debt (Moderate Risk 30% - 60%)

| Component                    | Coverage   | Issues                                          |
| :--------------------------- | :--------- | :---------------------------------------------- |
| `dice-history.svelte.ts`     | **31.57%** | Secondary feature, low priority.                |
| `vault/adapters.svelte.ts`   | **33.33%** | Wrapper logic, low risk.                        |

---

## 4. Improvement Roadmap

### ✅ Phase 1-3: Foundational Reliability
- [x] Eliminate 0% coverage in shared utilities (`image-processing`, `relationships`).
- [x] Secure the AI and Sync infrastructure (`oracle-engine`, `sync-engine`).
- [x] Reach **70%** floor for `graph-engine` and `canvas-engine`.

### ✅ Phase 4: Infrastructure Stabilization
**Goal**: Reach the **70% floor** for core persistence and discovery layers.

- [x] Reach **70%** floor for `search.worker.ts` (Priority 1) (**Actual: 100%**).
- [x] Reach **70%** floor for `idb.ts` (Priority 2) (**Actual: 88.52%**).
- [x] Reach **70%** floor for `markdown.ts` (Priority 3) (**Actual: 97.36%**).

## 5. Best Practices for Improvement

1.  **Surgical PRs**: When touching a 🔴 file for a feature, add at least **3 tests** for existing logic.
2.  **No New Debt**: New logic/files MUST meet the **Constitutional Goal (70%+)** upon creation.
3.  **Mocking First**: Use the established `vi.mock` patterns in `vault.test.ts` to isolate logic.

---

**Last Updated**: 2026-03-20
**Data Source**: `npm run test:coverage`
