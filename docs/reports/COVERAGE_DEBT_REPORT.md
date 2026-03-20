# Test Coverage Debt & Improvement Roadmap

This report establishes the baseline coverage for Codex Cryptica as of March 20, 2026. It serves as a living document to track our progress toward the **70-80% Constitutional Coverage Goal**.

## 1. Executive Summary

We use a two-tier system: **Constitutional Goals** (where we want to be) and **Enforced Floors** (where we are now, enforced to prevent regression).

| Category             | Average Coverage | Constitutional Goal | Enforced Floor  | Status        |
| :------------------- | :--------------- | :------------------ | :-------------- | :------------ |
| **Core Engines**     | ~85.21%          | 70%                 | 70-90%          | ✅ TARGET MET |
| **Shared Utilities** | ~88.23%          | 80%                 | 80%             | ✅ TARGET MET |
| **State Stores**     | ~86.09%          | 70%                 | 70%             | ✅ TARGET MET |
| **AI Services**      | ~86.64%          | 70%                 | 50% (App level) | ✅ TARGET MET |

---

## 2. Coverage Heatmap (Clear!)

All high-priority targets from Phase 1, 2, 3, 4, and 5 have been successfully addressed. All core infrastructure components now exceed the 70% constitutional goal.

## 3. Current Coverage Baselines (2026-03-20)

### 🟢 Healthy Components (Target > 70%)

| Component                  | Coverage    | Status      |
| :------------------------- | :---------- | :---------- |
| `@codex/canvas-engine`     | **100.00%** | Target Met. |
| `graph.svelte.ts`          | **100.00%** | Target Met. |
| `search.svelte.ts`         | **100.00%** | Target Met. |
| `dice-history.svelte.ts`   | **100.00%** | Target Met. |
| `vault/adapters.svelte.ts` | **100.00%** | Target Met. |
| `vault/crud.ts`            | **100.00%** | Target Met. |
| `vault/entities.ts`        | **100.00%** | Target Met. |
| `map-registry.svelte.ts`   | **100.00%** | Target Met. |
| `search.worker.ts`         | **100.00%** | Target Met. |
| `categories.svelte.ts`     | **97.05%**  | Target Met. |
| `markdown.ts`              | **97.36%**  | Target Met. |
| `@codex/chronology-engine` | **95.83%**  | Target Met. |
| `oracle.svelte.ts`         | **93.18%**  | Target Met. |
| `@codex/importer`          | **90.42%**  | Target Met. |
| `@codex/graph-engine`      | **89.22%**  | Target Met. |
| `idb.ts`                   | **88.52%**  | Target Met. |
| `vault/io.ts`              | **89.32%**  | Target Met. |
| `@codex/oracle-engine`     | **82.58%**  | Target Met. |
| `@codex/proposer`          | **81.94%**  | Target Met. |
| `ui.svelte.ts`             | **78.03%**  | Target Met. |
| `vault.svelte.ts`          | **77.14%**  | Target Met. |
| `vault-registry.svelte.ts` | **75.47%**  | Target Met. |
| `opfs.ts`                  | **81.03%**  | Target Met. |
| `app-init.ts`              | **72.41%**  | Target Met. |
| `client-adapter.ts` (P2P)  | **74.24%**  | Target Met. |

### 🟡 Remaining Debt (Moderate Risk 30% - 60%)

| Component                      | Coverage   | Issues                   |
| :----------------------------- | :--------- | :----------------------- |
| `guest-service.ts` (P2P)       | **61.53%** | Non-critical sync logic. |
| `host-service.svelte.ts` (P2P) | **61.87%** | Non-critical sync logic. |

---

## 4. Improvement Roadmap

### ✅ Phase 1-3: Foundational Reliability

- [x] Eliminate 0% coverage in shared utilities.
- [x] Secure the AI and Sync infrastructure.
- [x] Reach **70%** floor for all core engines.

### ✅ Phase 4: Infrastructure Stabilization

**Goal**: Reach the **70% floor** for core persistence and discovery layers.

- [x] Reach **70%** floor for `search.worker.ts` (**Actual: 100%**).
- [x] Reach **70%** floor for `idb.ts` (**Actual: 88%**).
- [x] Reach **70%** floor for `markdown.ts` (**Actual: 97%**).

### ✅ Phase 5: Core Store Hardening

**Goal**: Bring the main application state stores to the **70% goal**.

- [x] Bring `vault.svelte.ts` into the green (**Actual: 77%**).
- [x] Secure AI reliability: `oracle.svelte.ts` (**Actual: 93%**).
- [x] Secure UX orchestration: `ui.svelte.ts` (**Actual: 78%**).
- [x] Secure UX guidance: `help.svelte.ts` (**Actual: 92%**).
- [x] Secure Visual state: `graph.svelte.ts` (**Actual: 100%**).
- [x] Secure Search state: `search.svelte.ts` (**Actual: 100%**).
- [x] Secure Taxonomy: `categories.svelte.ts` (**Actual: 97%**).
- [x] Secure Session History: `dice-history.svelte.ts` (**Actual: 100%**).

## 5. Best Practices for Improvement

1.  **Surgical PRs**: When touching a 🔴 file for a feature, add at least **3 tests** for existing logic.
2.  **No New Debt**: New logic/files MUST meet the **Constitutional Goal (70%+)** upon creation.
3.  **Mocking First**: Use the established `vi.mock` patterns in `vault.test.ts` to isolate logic.

---

**Last Updated**: 2026-03-20
**Data Source**: `npm run test:coverage`
