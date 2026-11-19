import { promptMetrics } from "./campaign-generator-service-core";
import {
  stagedComplete,
  useStagedRoute,
  type AIRouteContext,
} from "./campaign-ai-route-context";
import { generateGenericWithAI } from "./campaign-generic-generation";
import {
  buildCampaignAdventurePrompt,
  buildCampaignHeistPrompt,
  buildCampaignTomePrompt,
  buildCampaignVillainPrompt,
  isTitleBanned,
  pointCrawlOptions,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { completeText } from "./campaign-generator-service-core";
import { generateAdventureStaged } from "./adventure-staged";
import { generateHeistStaged } from "./heist-staged";
import { generateTomeStaged } from "./tome-staged";
import { generateVillainStaged } from "./villain-staged";
import { generateTomeTwoPass } from "./public-tome";
import { generateCampaignHeist } from "./campaign-heist-generation";
import { generatePointCrawlStaged } from "./point-crawl-staged";
import { pointCrawlToOutput } from "./public-point-crawl";
import type {
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorRunRequest,
} from "./campaign-generator-types";

/** What every staged generator hands back. */
interface StagedOutput {
  title: string;
  summary?: string;
  content: string;
  lore: string;
  labels: string[];
}

/**
 * Runs one staged generator and maps its output to a draft. `null` means a
 * stage was unusable, so the caller falls back to its one-pass route. An
 * aborted run is rethrown rather than treated as a failed stage.
 */
async function runStaged(
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  signal: AbortSignal | undefined,
  run: () => Promise<{ output: StagedOutput } | null | undefined>,
): Promise<GeneratedDraft | null> {
  try {
    const result = await run();
    if (!result) return null;
    const { output } = result;
    return generator.mapOutputToDraft(
      {
        title: output.title,
        summary: output.summary ?? "",
        content: output.content,
        lore: output.lore,
        labels: output.labels,
      },
      request,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

/**
 * Staged route (situation, places and people, consequences), then the generic
 * route if a stage is unusable. `options.staged === false` forces the generic
 * route, and a continuity thread stays on it, since staged calls cannot carry
 * the thread.
 */
export async function generateAdventureWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  if (useStagedRoute(request)) {
    const prompt = buildCampaignAdventurePrompt(request);
    const staged = await runStaged(generator, request, signal, () =>
      generateAdventureStaged(prompt, prompt.options, {
        contextPrefix: prompt.contextPrefix,
        signal,
        onStats: ctx.deps.onAdventureStagedStats,
        complete: stagedComplete(ctx.gateway, signal),
      }),
    );
    if (staged) return staged;
  }
  return generateGenericWithAI(ctx, generator, request, bannedNames);
}

/**
 * Staged route (objective, security rings, response), then the existing
 * one-pass route if a stage is unusable.
 */
export async function generateHeistWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  if (useStagedRoute(request)) {
    const prompt = buildCampaignHeistPrompt(request);
    const staged = await runStaged(generator, request, signal, () =>
      generateHeistStaged(prompt, prompt.options, {
        contextPrefix: prompt.contextPrefix,
        signal,
        onStats: ctx.deps.onHeistStagedStats,
        complete: stagedComplete(ctx.gateway, signal),
      }),
    );
    if (staged) return staged;
  }
  try {
    const output = await generateCampaignHeist(request, ctx.gateway, signal);
    return generator.mapOutputToDraft(
      { ...output, summary: output.summary ?? "" },
      request,
    );
  } catch {
    return null;
  }
}

/**
 * Staged route (provenance, revelations, hooks), then the existing two-pass
 * route if a stage is unusable.
 */
export async function generateTomeWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  if (useStagedRoute(request)) {
    const prompt = buildCampaignTomePrompt(request);
    const staged = await runStaged(generator, request, signal, () =>
      generateTomeStaged(prompt, prompt.options, {
        contextPrefix: prompt.contextPrefix,
        signal,
        onStats: ctx.deps.onTomeStagedStats,
        complete: stagedComplete(ctx.gateway, signal),
      }),
    );
    if (staged && !isTitleBanned(staged.title, bannedNames)) return staged;
  }
  try {
    const prompt = buildCampaignTomePrompt(request);
    const reviewed = await generateTomeTwoPass(
      prompt,
      async (instruction, message, passSignal) =>
        completeText(
          await ctx.gateway.complete(message, instruction, {
            signal: passSignal,
          }),
        ),
      signal,
    );
    if (!reviewed || isTitleBanned(reviewed.title, bannedNames)) return null;

    ctx.onPromptMetrics?.(
      promptMetrics({
        request,
        fullPrompt: prompt.userMessage,
        sentPrompt: prompt.userMessage,
        usedInteraction: false,
        replayed: false,
      }),
    );
    return generator.mapOutputToDraft(
      { ...reviewed, summary: reviewed.summary ?? "" },
      request,
    );
  } catch {
    // An invalid first or second pass falls back to local generation.
    return null;
  }
}

/**
 * Staged route (concept, organisation, plan, ending), then the generic
 * one-pass route if a stage is unusable.
 */
export async function generateVillainWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  if (useStagedRoute(request)) {
    const prompt = buildCampaignVillainPrompt(request);
    const staged = await runStaged(generator, request, signal, () =>
      generateVillainStaged(prompt.resolved, {
        // The context chain already carries the request's instructions.
        contextPrefix: prompt.contextPrefix,
        avoidNames: [...bannedNames],
        signal,
        onStats: ctx.deps.onVillainStagedStats,
        complete: stagedComplete(ctx.gateway, signal),
      }),
    );
    if (staged) return staged;
  }
  signal?.throwIfAborted();
  return generateGenericWithAI(ctx, generator, request, bannedNames, signal);
}

export async function generatePointCrawlWithAI(
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  try {
    const network = await generatePointCrawlStaged(
      pointCrawlOptions(request),
      async (prompt) =>
        completeText(
          await ctx.gateway.complete(prompt, SYSTEM_INSTRUCTION, { signal }),
        ),
      undefined,
      signal,
    );
    const output = pointCrawlToOutput(network);
    return generator.mapOutputToDraft(
      {
        title: output.title,
        summary: output.summary ?? "",
        content: output.content,
        lore: output.lore,
        labels: output.labels,
        pointCrawl: output.pointCrawl,
      },
      request,
    );
  } catch {
    return null;
  }
}
