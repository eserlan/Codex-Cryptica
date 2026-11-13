import {
  completeText,
  promptMetrics,
  type CampaignGeneratorServiceDeps,
} from "./campaign-generator-service-core";
import type {
  AIGeneratorCompleteResult,
  AIGeneratorGateway,
  GeneratorRunRequest,
} from "./campaign-generator-types";

/** What an AI route needs from the service that runs it. */
export interface AIRouteContext {
  gateway: AIGeneratorGateway;
  deps: CampaignGeneratorServiceDeps;
  onInteractionResult?: CampaignGeneratorServiceDeps["onInteractionResult"];
  onPromptMetrics?: CampaignGeneratorServiceDeps["onPromptMetrics"];
}

export type CompleteResult = Awaited<
  ReturnType<AIGeneratorGateway["complete"]>
>;

interface CompletionDetails {
  /** The result, when the gateway accepted the continuity thread. */
  interaction?: AIGeneratorCompleteResult;
  usedInteraction: boolean;
  replayed: boolean;
}

/** A plain string means the gateway did not use the continuity thread. */
export function describeCompletion(result: CompleteResult): CompletionDetails {
  if (typeof result === "string") {
    return { usedInteraction: false, replayed: false };
  }
  return {
    interaction: result.usedInteraction ? result : undefined,
    usedInteraction: !!result.usedInteraction,
    replayed: !!result.replayed,
  };
}

/** The prompt that actually went over the wire, for the metrics. */
function sentPromptFor(
  fullPrompt: string,
  interaction: GeneratorRunRequest["interaction"],
  replayed: boolean,
): string {
  return replayed
    ? (interaction?.replayPrompt ?? fullPrompt)
    : (interaction?.input ?? fullPrompt);
}

/**
 * Tells the caller which interaction was accepted (if any) and how big the
 * prompt was. `accepted` is passed separately because a retried or repaired
 * route may drop the first result's interaction.
 */
export function reportCompletion(
  ctx: AIRouteContext,
  input: {
    request: GeneratorRunRequest;
    fullPrompt: string;
    interaction: GeneratorRunRequest["interaction"];
    result: CompleteResult;
    accepted?: AIGeneratorCompleteResult;
  },
): void {
  const { request, fullPrompt, interaction, result, accepted } = input;
  if (accepted) ctx.onInteractionResult?.(accepted);
  const { usedInteraction, replayed } = describeCompletion(result);
  ctx.onPromptMetrics?.(
    promptMetrics({
      request,
      fullPrompt,
      sentPrompt: sentPromptFor(fullPrompt, interaction, replayed),
      usedInteraction,
      replayed,
    }),
  );
}

/** A `complete` callback for the staged generators, bound to one abort signal. */
export function stagedComplete(
  gateway: AIGeneratorGateway,
  signal?: AbortSignal,
) {
  return async (instruction: string, message: string) =>
    completeText(await gateway.complete(message, instruction, { signal }));
}

/** Staged routes run unless they are switched off or a continuity thread is in use. */
export function useStagedRoute(request: GeneratorRunRequest): boolean {
  return request.options?.staged !== false && !request.interaction;
}
