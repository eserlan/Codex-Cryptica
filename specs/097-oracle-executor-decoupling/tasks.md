# Tasks: Oracle Executor Decoupling

## Phase 1: Infrastructure

- [x] T001 Define `OracleCommandExecutor` interface in `types.ts`
- [ ] T002 Register new `ORACLE:*` events in `events.ts`
- [ ] T003 Create `BaseExecutor` class for shared utility logic

## Phase 2: Simple Extraction

- [/] T004 Extract `DiceExecutor` (/roll)
- [ ] T005 Extract `MetaExecutor` (/help, /clear)
- [ ] T006 Unit test for `DiceExecutor`
- [ ] T007 Unit test for `MetaExecutor`

## Phase 3: Mutation Extraction

- [ ] T008 Extract `CreateExecutor` (/create)
- [ ] T009 Extract `ConnectExecutor` (/connect, /connect-ai)
- [ ] T010 Extract `MergeExecutor` (/merge, /merge-ai)
- [ ] T011 Extract `PlotExecutor` (/plot)
- [ ] T012 Add unit tests for all Phase 3 executors

## Phase 4: AI Orchestration

- [ ] T013 Extract `RegenerateExecutor`
- [ ] T014 Extract `ChatExecutor` (The big one)
- [ ] T015 Sub-extract Discovery logic into a dedicated reactor
- [ ] T016 Add comprehensive integration tests for the new composer

## Phase 5: Cleanup & Refinement

- [ ] T017 Finalize `OracleActionExecutor` as a thin dispatcher
- [ ] T018 Deprecate legacy "callback" fields in `OracleExecutionContext`
- [ ] T019 Final verification vs. Constitution guidelines
