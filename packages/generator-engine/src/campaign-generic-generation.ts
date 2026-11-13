import {
  buildGenericGeneratorPrompt,
  completeText,
  MAX_AI_ATTEMPTS,
} from "./campaign-generator-service-core";
import {
  describeCompletion,
  reportCompletion,
  type AIRouteContext,
} from "./campaign-ai-route-context";
import { parseGenericGeneratorOutput } from "./campaign-generator-output-parsing";
import {
  isTitleBanned,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { suggestName } from "./name-candidates";
import type {
  AIGeneratorGateway,
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorRunRequest,
} from "./campaign-generator-types";

type GenericInteraction = ReturnType<
  typeof buildGenericGeneratorPrompt
>["interaction"];

type Attempt =
  | { kind: "draft"; draft: GeneratedDraft }
  | { kind: "retry" }
  | { kind: "stop" };

/**
 * Runs the fast name-only pre-pass (see `name-candidates.ts`) and returns the
 * request to build the main prompt from. Falls back to the request unchanged
 * whenever no name is wanted or the pre-pass fails.
 */
export async function withNameSuggestion(
  gateway: AIGeneratorGateway,
  request: GeneratorRunRequest,
): Promise<GeneratorRunRequest> {
  const nameSuggestion = await suggestName(gateway, request);
  return nameSuggestion ? { ...request, nameSuggestion } : request;
}

async function runAttempt(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  fullPrompt: string,
  interaction: GenericInteraction,
  signal?: AbortSignal,
): Promise<Attempt> {
  try {
    const result = await ctx.gateway.complete(fullPrompt, SYSTEM_INSTRUCTION, {
      interaction,
      signal,
    });
    const output = parseGenericGeneratorOutput(
      completeText(result),
      request.generatorId,
    );
    if (!output) return { kind: "stop" };
    if (isTitleBanned(output.title, bannedNames)) return { kind: "retry" };
    reportCompletion(ctx, {
      request,
      fullPrompt,
      interaction,
      result,
      accepted: describeCompletion(result).interaction,
    });
    return {
      kind: "draft",
      draft: generator.mapOutputToDraft(output, request),
    };
  } catch {
    return { kind: "stop" };
  }
}

/** One-pass route: ask, parse, and ask again while the title is already taken. */
export async function generateGenericWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  signal?.throwIfAborted();
  const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
    generator,
    await withNameSuggestion(ctx.gateway, request),
  );
  signal?.throwIfAborted();
  for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
    signal?.throwIfAborted();
    const result = await runAttempt(
      ctx,
      generator,
      request,
      bannedNames,
      fullPrompt,
      interaction,
      signal,
    );
    if (result.kind === "draft") return result.draft;
    if (result.kind === "stop") return null;
  }
  return null;
}
