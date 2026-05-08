# Task Breakdown: Offload AI Creation

## Phase 1: Core Worker & Bridge Implementation

- [x] **Task 1.1**: Create `apps/web/src/lib/workers/oracle.worker.ts`.
- [x] **Task 1.2**: Implement `OracleBridge` in `apps/web/src/lib/cloud-bridge/oracle-bridge.ts`.
- [x] **Task 1.3**: Refactor `capability-guard.ts` for worker safety.

## Phase 2: Engine & Protocol Updates

- [x] **Task 2.1**: Add `OracleWorkerEvent` types to `packages/oracle-engine/src/types.ts`.
- [x] **Task 2.2**: Add `addProposal` to `ChatHistoryService` in `packages/oracle-engine`.
- [x] **Task 2.3**: Implement merging logic in `OracleActionExecutor.executeChat`.

## Phase 3: Integration & Hybrid Events

- [x] **Task 3.1**: Update `OracleStore` to use `OracleBridge` and Comlink proxies.
- [x] **Task 3.2**: Implement `BroadcastChannel` emission in `OracleWorker`.
- [x] **Task 3.3**: Implement event handling in `OracleStore`.

## Phase 4: Validation & Quality

- [x] **Task 4.1**: Verify unit tests for AI services.
- [x] **Task 4.2**: Verify worker syntax and dependency resolution.
- [x] **Task 4.3**: Update documentation (Spec, ADR, GEMINI.md).

## Phase 5: Search Visibility (Issue #692)

- [x] **Task 5.1**: Update `ContextRetrievalService` to include drafts in context searches.
- [x] **Task 5.2**: Update `SearchStore` to include drafts in global search.
- [x] **Task 5.3**: Add "Draft" status indicator to `SearchModal` items.
