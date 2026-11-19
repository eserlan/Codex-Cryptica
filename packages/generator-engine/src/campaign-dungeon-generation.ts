import {
  completeText,
  normalizeDungeonOutput,
  withGeneratorRequest,
} from "./campaign-generator-service-core";
import {
  describeCompletion,
  reportCompletion,
  useStagedRoute,
  type AIRouteContext,
  type CompleteResult,
} from "./campaign-ai-route-context";
import { buildCampaignDungeonPrompt } from "./campaign-generator-registry";
import {
  buildDungeonCoherencePrompt,
  buildDungeonRetryMessage,
  parseDungeonResponseDetailed,
} from "./public-dungeon";
import { generateDungeonStaged } from "./dungeon-staged";
import type {
  AIGeneratorCompleteResult,
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorRunRequest,
} from "./campaign-generator-types";

type DungeonPrompt = ReturnType<typeof buildCampaignDungeonPrompt>;
type ParsedDungeon = ReturnType<typeof parseDungeonResponseDetailed>;

function parseDungeon(raw: string, prompt: DungeonPrompt): ParsedDungeon {
  return parseDungeonResponseDetailed(
    raw,
    prompt.options,
    undefined,
    prompt.resolved,
  );
}

function buildInteraction(
  request: GeneratorRunRequest,
  prompt: string,
): GeneratorRunRequest["interaction"] {
  return request.interaction
    ? {
        ...request.interaction,
        input: withGeneratorRequest(request.interaction.input, prompt),
        replayPrompt: request.interaction.replayPrompt ?? prompt,
      }
    : undefined;
}

/**
 * Staged route (foundation, sectors, factions, coherence). Resolves `null`
 * when a stage is unusable so the one-pass route can run; staged calls do
 * not use the interaction thread or report prompt metrics.
 */
async function generateStaged(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  prompt: DungeonPrompt,
): Promise<GeneratedDraft | null> {
  try {
    const result = await generateDungeonStaged(
      prompt.resolved,
      prompt.options,
      {
        contextPrefix: prompt.contextPrefix,
        onStats: ctx.deps.onDungeonStagedStats,
        complete: async (instruction, message) =>
          completeText(await ctx.gateway.complete(message, instruction)),
      },
    );
    return result
      ? generator.mapOutputToDraft(
          normalizeDungeonOutput(result.output),
          request,
        )
      : null;
  } catch {
    return null;
  }
}

async function retryRejected(
  ctx: AIRouteContext,
  prompt: DungeonPrompt,
  first: ParsedDungeon,
) {
  const retry = await ctx.gateway.complete(
    buildDungeonRetryMessage(prompt.userMessage, first.problems),
    prompt.systemInstruction,
  );
  const second = parseDungeon(completeText(retry), prompt);
  return second.problems.length === 0 || !second.rejected ? second : null;
}

async function repairCoherence(
  ctx: AIRouteContext,
  prompt: DungeonPrompt,
  first: ParsedDungeon,
) {
  const coherence = buildDungeonCoherencePrompt(
    first.structured!,
    prompt.resolved,
  );
  const repair = await ctx.gateway.complete(
    coherence.userMessage,
    coherence.systemInstruction,
  );
  return parseDungeon(completeText(repair), prompt);
}

/** A retried or repaired dungeon no longer belongs to the first interaction. */
async function resolveResponse(
  ctx: AIRouteContext,
  prompt: DungeonPrompt,
  first: ParsedDungeon,
  result: CompleteResult,
): Promise<{
  output: ParsedDungeon["output"];
  interaction?: AIGeneratorCompleteResult;
}> {
  const initial = describeCompletion(result).interaction;
  if (first.rejected) {
    const retried = await retryRejected(ctx, prompt, first);
    return {
      output: retried?.output ?? first.output,
      interaction: retried ? undefined : initial,
    };
  }
  if (first.structured) {
    const repaired = await repairCoherence(ctx, prompt, first);
    const accepted = repaired && !repaired.rejected;
    return {
      output: accepted ? repaired.output : first.output,
      interaction: accepted ? undefined : initial,
    };
  }
  return { output: first.output, interaction: initial };
}

export async function generateDungeonWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
): Promise<GeneratedDraft | null> {
  const prompt = buildCampaignDungeonPrompt(request);
  // `options.staged === false` forces the one-pass route (baseline, tests).
  // A continuity thread stays on the one-pass route: staged calls cannot
  // carry it, so they would drop the thread and its follow-ups.
  const staged = useStagedRoute(request)
    ? await generateStaged(ctx, generator, request, prompt)
    : null;
  if (staged) return staged;
  const interaction = buildInteraction(request, prompt.userMessage);

  try {
    const result = await ctx.gateway.complete(
      prompt.userMessage,
      prompt.systemInstruction,
      { interaction },
    );
    const first = parseDungeon(completeText(result), prompt);
    const resolved = await resolveResponse(ctx, prompt, first, result);
    reportCompletion(ctx, {
      request,
      fullPrompt: prompt.userMessage,
      interaction,
      result,
      accepted: resolved.interaction,
    });
    return generator.mapOutputToDraft(
      normalizeDungeonOutput(resolved.output),
      request,
    );
  } catch {
    return null;
  }
}
