# Implementation plan: Shared AI JSON extraction

**Issue**: [#4153](https://github.com/eserlan/Codex-Cryptica/issues/4153)
**Date**: 2026-10-18
**Status**: Implemented; [PR #4185](https://github.com/eserlan/Codex-Cryptica/pull/4185) is open.
**Delivery artifacts**: This plan and [tasks.md](./tasks.md). No separate specification.

## Outcome and scope

Use one shared `extractJsonObject(raw: string): string` helper for completed AI replies across generator refinement, Delve stocking, Delve area enhancement, the generator gateway and hex discovery. Valid object replies should survive Markdown fences, surrounding prose and stray trailing braces, while malformed replies continue through each caller's existing error or fallback path.

Implement the helper in `packages/runtime`, which both `generator-engine` and the web app already depend on. Add no package, third-party dependency, persistence change or remote operation.

The scope excludes incremental streaming extraction, JSON repair, retry policy changes, schema changes and consolidation of differently named parsers elsewhere in the repository. In particular, `extractJsonFromModelResponse` in `packages/ai-engine` has a different return/error contract and remains outside this change.

## Current implementation and integration seams

The issue lists three implementations; repository exploration found a fourth.

| Location                                                          | Current behaviour                                                                                       | Planned change                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/generator-engine/src/generator-refinement.ts`           | Prefers the first fenced block; otherwise slices from the first opening brace to the last closing brace | Import the runtime helper; retain proposal validation and error handling                                   |
| `packages/generator-engine/src/dungeon/delve-stocking-service.ts` | Strips surrounding fences, then takes the outermost braces                                              | Import the runtime helper; retain stocking validation and configured fallback behaviour                    |
| `apps/web/src/lib/services/delve-area-enhancement.ts`             | A fourth implementation, matching the stocking approach                                                 | Import the runtime helper; retain `EnhancedSectorSchema` and population failure handling                   |
| `apps/web/src/lib/services/generators/ai-generator-gateway.ts`    | Finds the first balanced object, respecting string literals and escapes; exports the helper             | Move the scanner into runtime and use a direct import; remove the app-local export                         |
| `apps/web/src/lib/services/hex-discovery.ts`                      | Imports the gateway helper                                                                              | Import directly from runtime; retain image sanitisation, validation, cancellation and save behaviour       |
| `packages/generator-engine/src/streaming/incremental-json.ts`     | Scans growing buffers for transient previews                                                            | Keep its algorithm unchanged; update only the comment identifying the completed-response helper's location |

Known imports of the app-local export are hex discovery and the gateway test file. Confirm consumers again before deleting the export.

## Shared contract

The balanced-brace scanner from the gateway is the starting point. Extraction remains a pure string operation; callers own `JSON.parse`, schema validation and product-specific errors.

1. Trim surrounding whitespace.
2. Prefer the first complete supported Markdown code block labelled `json` (case-insensitive) or unlabelled, wherever it appears in the reply. Use its body as the candidate. Otherwise use the trimmed reply, tolerating surrounding JSON fences as the current gateway does. Do not treat another language's code block as an unlabelled JSON fence.
3. If the selected candidate starts with `[` or `"`, return the whole candidate unchanged. This preserves explicit array/string envelopes for caller validation, including malformed envelopes; do not extract an object from inside them. Other scalar values naturally pass through when there is no opening brace.
4. Otherwise locate the first opening brace and scan forward, tracking object depth, quoted strings and backslash escapes. Return the first balanced object. Nested arrays inside that object require no separate extraction mode; braces inside their string values still obey the same string rules.
5. If there is no opening brace, return the trimmed candidate. If the object never closes, return the candidate from its opening brace to the end. Do not invent closing delimiters or swallow a caller's parse failure.
6. Do not skip a malformed first object to find a later valid one. A balanced span is a candidate, not proof of valid JSON. Never combine separate objects.

This is an object extractor with bounded recovery from surrounding text, not a general parser for arbitrary prose. Prose containing an earlier brace pair can determine the candidate when there is no supported fence.

### Deliberate compatibility decisions

Behaviour probes confirmed differences that need explicit regression tests:

| Reply                                              | Existing behaviour                                                         | Shared behaviour                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| One object followed by extra closing braces        | Gateway succeeds; the outermost-brace variants fail                        | Extract the first balanced object                      |
| Two objects without a fence                        | Gateway selects the first; other variants combine them and fail            | Select the first object; caller validates it           |
| An example object in prose followed by fenced JSON | Refinement chooses the fence; gateway chooses the earlier object           | Prefer the supported fence                             |
| A fenced array containing one object               | Refinement rejects its shape; gateway and Delve variants unwrap the object | Preserve the array envelope for caller validation      |
| No JSON or an unclosed object                      | Callers fail parsing or enter their configured fallback                    | Return the unsuccessful candidate without repairing it |

Fence priority and explicit array/string envelope preservation intentionally tighten the gateway's current behaviour. They protect refinement's existing validation boundary and make selection consistent across callers. Keep existing caller validation code; add a narrowly scoped object-shape guard only if regression tests demonstrate an existing caller would otherwise accept a non-object envelope.

## File layout

```text
packages/runtime/
  src/extract-json-object.ts                 # New pure helper
  src/index.ts                               # Package export and updated module overview
  tests/extract-json-object.test.ts           # Shared extraction contract

packages/generator-engine/src/
  generator-refinement.ts                    # Shared import
  generator-refinement.test.ts               # Recovery and rejection regressions
  dungeon/delve-stocking-service.ts          # Shared import
  dungeon/delve-stocking-service.test.ts     # Recovery, rejection and fallback regressions
  streaming/incremental-json.ts              # Comment reference only

apps/web/src/lib/services/
  generators/ai-generator-gateway.ts         # Shared import; remove local implementation/export
  generators/ai-generator-gateway.test.ts    # Keep gateway integration tests; move helper unit tests
  delve-area-enhancement.ts                  # Shared import
  delve-area-enhancement.test.ts             # Recovery and failed population regressions
  hex-discovery.ts                           # Direct runtime import
  hex-discovery.test.ts                      # Recovery and no-save failure regressions
```

No dependency manifest or lockfile edit is expected. Historical Hex Crawl spec and research documents describe the original implementation and do not need rewriting.

## Test strategy

Write failing contract tests before implementation. Move the gateway's existing extraction cases into the runtime suite, retaining their expectations where consistent with the decisions above.

The shared matrix covers clean objects, whitespace, labelled/unlabelled fences, case-insensitive JSON labels, leading/trailing prose, nested objects and arrays, braces inside strings, escaped quotes, escaped backslashes, stray trailing braces, multiple objects and fence precedence. Negative cases cover empty/whitespace-only input, no JSON, malformed balanced JSON, unclosed objects and strings, explicit array/string/scalar envelopes and unsupported fence labels. Assert the returned string as well as downstream parse success or failure where appropriate.

Caller tests must prove a supported wrapped-object success path and a meaningful malformed/invalid-shape failure path. Specifically:

- Refinement rejects invalid field types and array/string envelopes, retaining its existing error categories.
- Stocking uses deterministic fallback when configured and rejects without changing the source room when fallback is disabled.
- Area enhancement rejects malformed or schema-invalid sector data without counting the affected sector as successfully populated; verify existing failure accounting and source-data preservation.
- Gateway completion and completed streaming replies use shared extraction, while interaction replay and streaming preview behaviour remain covered by their existing tests.
- Hex discovery accepts a wrapped valid result and saves no draft after malformed output or cancellation; retain sanitisation coverage.

Do not add an end-to-end suite for this deterministic helper refactor. Meet the constitution's utility coverage goal of at least 80% for the new helper, including its failure branches.

## Constitution check

- **I / III, Library-first and reuse**: one framework-free helper in an existing shared package; four implementations removed; no additional dependency or speculative parser framework.
- **II / X, TDD and coverage**: shared success/negative tests precede implementation; caller regressions preserve validation and fallback boundaries.
- **IV / VI, Extraction and validation**: recover only the text envelope; parsing, schemas and product-specific failures remain with callers. Use impacted-only local validation.
- **V / VIII, Privacy and DI**: the helper has no I/O, ambient dependency, service or state; existing constructor injection and AI permissions remain unchanged.
- **VII / IX / XII, Documentation and language**: this internal refactor adds no user-facing workflow, terminology or high-impact release highlight; no Help article or changelog entry is required.
- **XI, Surgical changes**: limit edits to the helper, its export, known callers, related tests and the stale streaming comment.
- **XIII, Discovery governance**: no public discovery surface changes; discovery audit is not applicable.
- **XIV, Bounded responsibility**: `delve-area-enhancement.ts` (587 lines at exploration) and `hex-discovery.ts` (551 lines) exceed the review trigger. Their changes only replace extraction with an import; they retain sector enhancement orchestration and hex discovery orchestration respectively. Add no unrelated behaviour to either module.

## Delivery and validation

Implement on a dedicated branch from current `origin/staging`, separate from the Hex Journey work. Refresh the consumer inventory and line counts before editing. Use `bunx fallow guard` on affected source files and the repository's symbol-impact command before removing the exported gateway helper.

Run focused tests in `packages/runtime`, `packages/generator-engine` and `apps/web`, then `bun run lint:changed` and `bun run test:changed`. Explicitly run the new runtime test file if changed-file discovery does not include it. Check types with:

- `bun run typecheck` in `packages/runtime`.
- `bunx tsc --noEmit --project tsconfig.json` in `packages/generator-engine`.
- `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`.

Measure coverage for the new helper only. Run Fallow audit against the implementation base and the canonical `codex-review` specialist review before PR handoff. Before any commit or push, run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and apply the repository's verdict/runtime-error policy. No repository-wide local test, lint or type-check commands.

Success means there is one implementation used by all five consumer modules, contract and caller regression tests pass, affected types/lint pass with zero errors, and specialist review passes. Record actual commands, results and any justified deviations in [tasks.md](./tasks.md).
