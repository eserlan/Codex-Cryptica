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

function parseJsonPayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function trimExcerpts(
  excerpts: ResolvedSourceExcerpt[],
  contentLimit: number,
  loreLimit: number,
): ResolvedSourceExcerpt[] {
  let contentRemaining = contentLimit;
  let loreRemaining = loreLimit;
  return excerpts.flatMap((excerpt) => {
    if (contentRemaining <= 0) return [];
    const content = trimText(excerpt.content, contentRemaining);
    contentRemaining -= content.length;
    const lore = excerpt.lore
      ? trimText(excerpt.lore, loreRemaining)
      : undefined;
    loreRemaining -= lore?.length ?? 0;
    return [{ ...excerpt, content, ...(lore && { lore }) }];
  });
}

export function allocatePromptBudget(
  input: PromptBudgetInput,
): PromptBudgetResult {
  if (input.state.length > MAX_SERIALIZED_STATE_CHARS) {
    throw new Error("state-budget-exceeded");
  }
  const result = {
    behavior: trimText(input.behavior, 16_000),
    state: input.state,
    anchors: trimExcerpts(input.anchors, 24_000, 8_000),
    relevant: trimExcerpts(input.relevant, 12_000, 6_000),
    transcript: trimText(input.transcript, 8_000),
  };
  const serialized = JSON.stringify({
    state: parseJsonPayload(result.state),
    anchors: result.anchors,
    relevant: result.relevant,
    transcript: parseJsonPayload(result.transcript),
    input: parseJsonPayload(trimText(input.input, 600)),
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
