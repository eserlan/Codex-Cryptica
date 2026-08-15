import {
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
} from "./schemas";
import type { ResolvedSourceExcerpt } from "./types";

export interface PromptBudgetInput {
  behavior: string;
  state: string;
  input: string;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  transcript: string;
}

export interface PromptBudgetResult {
  behavior: string;
  state: string;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  transcript: string;
  serialized: string;
  includedSourceIds: string[];
}

function trimText(value: string, limit: number): string {
  return value.length <= limit
    ? value
    : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function trimExcerpts(
  excerpts: ResolvedSourceExcerpt[],
  limit: number,
): ResolvedSourceExcerpt[] {
  let remaining = limit;
  return excerpts.flatMap((excerpt) => {
    if (remaining <= 0) return [];
    const content = trimText(excerpt.content, remaining);
    remaining -= content.length;
    return [{ ...excerpt, content }];
  });
}

export function allocatePromptBudget(
  input: PromptBudgetInput,
): PromptBudgetResult {
  if (
    input.state.length > 36_000 ||
    JSON.stringify(input.state).length > MAX_SERIALIZED_STATE_CHARS
  ) {
    throw new Error("state-budget-exceeded");
  }
  const result = {
    behavior: trimText(input.behavior, 16_000),
    state: input.state,
    anchors: trimExcerpts(input.anchors, 24_000),
    relevant: trimExcerpts(input.relevant, 12_000),
    transcript: trimText(input.transcript, 8_000),
  };
  const serialized = JSON.stringify({
    ...result,
    input: trimText(input.input, 600),
  });
  if (serialized.length > MAX_GENERATION_INPUT_CHARS)
    throw new Error("generation-budget-exceeded");
  return {
    ...result,
    serialized,
    includedSourceIds: [...result.anchors, ...result.relevant].map(
      (source) => source.recordId,
    ),
  };
}
