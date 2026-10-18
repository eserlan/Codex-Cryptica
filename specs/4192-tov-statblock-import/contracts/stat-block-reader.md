# Contract: `@codex/stat-sheet-engine` stat block reader

New exports from `packages/stat-sheet-engine/src/stat-block-reader/index.ts`, re-exported from the package root. Framework-free. No app or AI imports. Types are in [data-model.md](../data-model.md).

```ts
export const STAT_BLOCK_SOURCE_LIMIT = 12_000;

/** Injected AI access. The web app adapts ProxyAIGeneratorGateway to this. */
export interface StatBlockReaderGateway {
  complete(
    prompt: string,
    systemInstruction: string,
    options: {
      generationConfig: Record<string, unknown>;
      signal?: AbortSignal;
    },
  ): Promise<string>;
}

/** Trims Foundry noise keys when the source is JSON; returns text unchanged otherwise. */
export function prepareStatBlockSource(raw: string): string;

/** Throws StatBlockSourceTooLongError when over the limit. */
export function assertSourceLength(source: string): void;

/** System instruction + user prompt for one read. Pure. */
export function buildStatBlockReadPrompt(request: ImportRequest): {
  systemInstruction: string;
  prompt: string;
};

/** Parses the AI response text into a ReadResult and runs the local checks (R2). Pure. */
export function parseStatBlockReadResponse(
  text: string,
  request: ImportRequest,
): ReadResult;

/** AI path: prompt → gateway → parse. */
export function readStatBlockWithAi(
  request: ImportRequest,
  gateway: StatBlockReaderGateway,
  options?: { signal?: AbortSignal },
): Promise<ReadResult>;

/** Rule-based path: importStatBlock → StatBlockIR → ReadResult. No network. */
export function readStatBlockWithRules(request: ImportRequest): ReadResult;

/** Pure. Applies a GM edit; marks it corrected and clears any check note on that path. */
export function applyReviewEdit(
  result: ReadResult,
  path: string,
  value: unknown,
): ReadResult;

/** Pure. Builds the merge plan against an existing sheet (or null for a new entity). */
export function planStatSheetMerge(
  result: ReadResult,
  existing: StatSheet | null,
): MergePlan;

/** Pure. FR-015a. */
export function canSaveReadResult(result: ReadResult, plan: MergePlan): boolean;

/** Pure. Applies plan.writes to the existing sheet, or returns the full new sheet. */
export function applyStatSheetMerge(
  plan: MergePlan,
  existing: StatSheet | null,
): StatSheet;
```

## Errors

| Error                         | When                                                                          | UI                                             |
| ----------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `StatBlockSourceTooLongError` | `assertSourceLength` over the limit                                           | "Paste just the stat block" (FR-005)           |
| `StatBlockReadError`          | Gateway threw, timed out after 30 s (R14), or the response had no JSON object | Retry / Use quick reader; source kept (FR-013) |

`parseStatBlockReadResponse` never throws for well-formed JSON that fails validation. Bad values become `check` notes (FR-011).

## Guarantees (tested)

1. No key in `ReadResult.values` is set unless it was in the AI response or the rule-based IR. No defaults (R1).
2. In `copy` mode, a numeric value whose digits are absent from `source`, or a short text value absent from the normalised `source`, always carries a `check` note (R2.2, R2.4).
3. In `convert-5e` mode, a numeric value absent from `source` with no `converted` note always carries a `check`/`unmarked-change` note (R2.5).
4. `planStatSheetMerge` never lists a field in `writes` whose source path is not found. It never touches field ids outside the template (R7).
5. `readStatBlockWithRules` makes no gateway call.
