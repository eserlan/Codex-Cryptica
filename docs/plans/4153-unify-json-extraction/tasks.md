# Tasks: Shared AI JSON extraction (#4153)

**Input**: [plan.md](./plan.md)
**Status**: Planned; no implementation task has started.
**Scope**: One runtime helper, four duplicate implementations removed, five consumer modules updated. No separate spec.
**Tests**: Follow red-green-refactor. Cover both successful extraction and meaningful rejection/fallback behaviour. Planning documentation does not require application tests.

## Phase 1: Confirm boundaries and write the contract tests

- [x] T001 Create a dedicated implementation branch from current `origin/staging`. Re-read repository instructions, the constitution and this plan; confirm all `extractJsonObject` definitions/imports and existing runtime dependencies. Keep unrelated Hex Journey changes outside the branch.
- [x] T002 Run `bunx fallow guard` for the affected source files and `bunx fallow dead-code --type-aware --symbol-impact apps/web/src/lib/services/generators/ai-generator-gateway.ts:extractJsonObject` before removing that export. Record any consumers beyond hex discovery and gateway tests; keep additional parser contracts outside scope unless needed to remove this export safely.
- [x] T003 Add failing tests in `packages/runtime/tests/extract-json-object.test.ts`, importing through the runtime package index. Move the existing gateway helper cases here and add fences, prose, nesting, escapes, trailing braces, multiple objects, no JSON, malformed/truncated input, explicit array/string/scalar envelopes, unsupported fence labels and fenced-payload precedence. Assert exact candidate strings and downstream parsing/shape outcomes.

**Checkpoint**: Tests express the shared contract and the intentional differences from the gateway; they fail because the runtime export is not implemented yet.

## Phase 2: Implement the shared helper

- [x] T004 Implement `packages/runtime/src/extract-json-object.ts` using the gateway's balanced-brace/string/escape scanner, supported-fence priority and explicit array/string envelope preservation. Keep extraction pure and non-throwing for malformed model text; do not repair JSON or skip a malformed first object.
- [x] T005 Export the helper from `packages/runtime/src/index.ts` and update its module overview to describe the added responsibility. Run the focused runtime contract suite and verify the new helper reaches at least 80% coverage with its failure branches exercised.

**Checkpoint**: The runtime contract passes without a new package, dependency or persistence change.

## Phase 3: Migrate engine consumers with regression tests

- [x] T006 Add failing regressions in `packages/generator-engine/src/generator-refinement.test.ts`: wrapped/fenced object recovery, braces and escapes in content, supported-fence priority, rejection of array/string envelopes, malformed JSON and invalid proposal field types.
- [x] T007 Replace refinement's local helper in `packages/generator-engine/src/generator-refinement.ts` with the runtime import. Preserve its error categories and proposal validation; run the focused refinement suite.
- [x] T008 Add failing regressions in `packages/generator-engine/src/dungeon/delve-stocking-service.test.ts`: wrapped object plus trailing-brace recovery, malformed/schema-invalid/non-object replies, configured deterministic fallback and rejection/source-room preservation when `fallbackOnFailure` is false.
- [x] T009 Replace stocking's local helper in `packages/generator-engine/src/dungeon/delve-stocking-service.ts` with the runtime import. Retain validation and fallback policy; add only a focused non-object guard if the tests demonstrate it is required. Run the focused stocking suite.
- [x] T010 Update the completed-response helper location in the comment in `packages/generator-engine/src/streaming/incremental-json.ts`; leave the incremental algorithm unchanged.

**Checkpoint**: Both engine consumers share extraction while preserving their own validation and failure policies.

## Phase 4: Migrate web consumers with regression tests

- [x] T011 Add failing gateway integration cases in `apps/web/src/lib/services/generators/ai-generator-gateway.test.ts`: supported-fence priority, malformed/non-object candidate propagation and shared extraction on completed replies, including final streaming output. Keep interaction replay and streaming preview tests. Remove the relocated helper unit-test block and its app-local import.
- [x] T012 Import the runtime helper in `apps/web/src/lib/services/generators/ai-generator-gateway.ts` and remove its local implementation/export. Run the focused gateway suite.
- [x] T013 Add failing regressions in `apps/web/src/lib/services/delve-area-enhancement.test.ts`: fenced/prose-wrapped valid sectors with trailing braces, malformed/schema-invalid/non-object sectors, failure accounting and preservation of source data when the affected sector fails.
- [x] T014 Replace the helper in `apps/web/src/lib/services/delve-area-enhancement.ts` with the runtime import. Retain schema validation and population failure handling; run the focused enhancement suite.
- [x] T015 Extend `apps/web/src/lib/services/hex-discovery.test.ts` with wrapped-object recovery and no-save behaviour for malformed/non-object responses; keep cancellation and sanitisation regressions. Change `apps/web/src/lib/services/hex-discovery.ts` to import directly from runtime and run its focused suite.

**Checkpoint**: No consumer imports extraction from the gateway, and all five consumers use runtime. The larger web services receive only focused wiring changes unless a tested validation guard is necessary.

## Phase 5: Validate and prepare handoff

- [x] T016 Search definitions and imports again to confirm there is exactly one implementation, four local implementations are removed, and every known consumer uses it. Check for unintended manifest/lockfile changes and keep unrelated AI parsers and historical specs unchanged.
- [x] T017 Run focused helper/caller suites and `bun run test:changed`; explicitly include the runtime test file if discovery misses it. Run `bun run lint:changed` and affected-workspace type-checks. Confirm helper coverage; record commands/results below. Do not run repository-wide local checks.
- [x] T018 Run Fallow audit against the implementation base and the canonical `codex-review` specialist review. Resolve actionable findings; document the single responsibilities of the two touched web services over 500 lines and update this plan if implementation decisions changed.
- [ ] T019 Before any commit or push, run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and follow the repository's verdict/runtime-error policy. After all PR quality gates pass, commit the implementation and open a ready-for-review PR to `staging` with `Closes #4153`, the deliberate contract changes and validation evidence.

## Dependencies and execution order

- T001-T003 establish boundaries and failing contract tests; T004-T005 implement that contract.
- Engine and web consumer migrations depend on T005. Within each migration, write regressions before replacing the helper.
- Remove the gateway export and change the hex discovery import in the same implementation change so there is no broken intermediate handoff.
- T016-T019 depend on all migrations. Re-run relevant validation after any review fix that changes behaviour.

## Validation record

- `bun test --coverage tests/extract-json-object.test.ts` — 18 passed; helper coverage is 100% for functions and 88.24% for lines.
- `bun run test:changed` — passed: 45 web tests and 34 generator-engine tests, including the existing incremental JSON streaming tests. The runtime test ran directly because changed-file discovery omits untracked files.
- Focused runtime and generator-engine tests passed. `bun run lint:changed`, explicit ESLint for the new runtime files, Prettier checks and `git diff --check` passed.
- Runtime `bun run typecheck` and a source-only TypeScript check for the changed generator-engine modules passed. Web `svelte-check` passed with 0 errors and 83 warnings across 31 files.
- The broader generator-engine `tsc --noEmit --project tsconfig.json` reports errors in unchanged test files and `oracle-engine` `.svelte.ts` files; it reports no errors in the changed generator-engine source. The focused changed-source TypeScript check passed.
- Fallow audit against `origin/staging` passed with zero introduced findings. Its first run flagged scanner complexity; splitting the scanner resolved the finding.
- General and Codex-Cryptica specialist review found no actionable issues. The removed gateway export had one production consumer, `hex-discovery.ts`, now importing from runtime; the other reference was its relocated unit tests.
- No manifest or lockfile changes. No repository-wide tests, lint or type-check were run.

## Completion criteria

All tasks are checked, the shared extraction contract and caller success/failure paths pass, the helper meets its coverage goal, affected type-checks/lint have zero errors, specialist review passes, and the ready-for-review PR contains only this refactor. No new spec, user-facing workflow, dependency, storage format or changelog highlight is introduced.
