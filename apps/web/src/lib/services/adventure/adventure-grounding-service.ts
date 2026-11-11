import type { AdventureTurnGenerationService } from "@codex/ai-engine";
import {
  buildAdventurePrompt,
  selectGroundingCandidates,
  type AdventureSession,
  type AdventureWorldStyle,
  type ResolvedSourceExcerpt,
  type GroundingContext,
  type GroundingFailureCode,
  type GroundingIntent,
} from "@codex/adventure-engine";
import {
  adventureContextService,
  type AdventureContextService,
} from "./adventure-context-service";

type Transport = Pick<AdventureTurnGenerationService, "generate">;
type ContextResolver = Pick<
  AdventureContextService,
  "resolveAnchors" | "resolveOpeningRelevant" | "resolveActionRelevant"
> &
  Partial<Pick<AdventureContextService, "verifyRequiredSources">>;

/** Safe to present to the player; never contains underlying source/error text. */
export class AdventureGroundingError extends Error {
  constructor(readonly code: GroundingFailureCode = "lookup") {
    super(
      code === "budget"
        ? "Unable to load world context: selected sources exceed the size limit. Reduce sources and retry."
        : "Unable to load world context. Please retry, or restore a missing source or edit your selection.",
    );
    this.name = "AdventureGroundingError";
  }
}

/** Local preparation shared by all Adventure AI paths before provider dispatch. */
export class AdventureGroundingService {
  constructor(
    private readonly context: ContextResolver = adventureContextService,
    private readonly verifyCurrent: (
      session: AdventureSession,
    ) => Promise<void> = async () => {},
    private readonly getWorldStyle: () =>
      AdventureWorldStyle | undefined = () => undefined,
  ) {}

  async prepare(
    intent: GroundingIntent,
    signal?: AbortSignal,
  ): Promise<GroundingContext> {
    checkCancellation(signal);
    await this.verifyCurrent(intent.session);
    checkCancellation(signal);
    try {
      const anchors = await this.context.resolveAnchors(intent.session);
      checkCancellation(signal);
      const relevant = await this.resolveRelevant(intent);
      checkCancellation(signal);
      await this.context.verifyRequiredSources?.(intent.session);
      checkCancellation(signal);
      const prompt = budgetSources(intent, anchors, relevant);
      await this.verifyCurrent(intent.session);
      checkCancellation(signal);
      return {
        vaultId: intent.session.vaultId,
        sessionId: intent.session.id,
        revision: intent.session.revision,
        purpose: intent.purpose,
        anchors: prompt.anchors,
        relevant: prompt.relevant,
        sessionKnowledge: prompt.state,
      };
    } catch (cause) {
      checkCancellation(signal);
      if (
        cause instanceof Error &&
        (cause.message === "control-lost" ||
          cause.message === "stale-adventure-context")
      )
        throw cause;
      throw safeGroundingFailure(cause);
    }
  }

  private resolveRelevant(intent: GroundingIntent) {
    if (intent.purpose === "opening" || intent.purpose === "background")
      return this.context.resolveOpeningRelevant(intent.session);
    const action =
      intent.purpose === "roll-resolution"
        ? (intent.session.pendingRoll?.playerAction ?? "")
        : (intent.playerAction ?? "");
    return this.context.resolveActionRelevant(intent.session, action);
  }

  wrap(transport: Transport): Transport {
    return {
      generate: async (request, options) => {
        const context = await this.prepare(
          {
            session: request.session,
            purpose: request.phase,
            playerAction: request.playerAction,
          },
          options?.signal ?? request.signal,
        );
        const prepared = {
          ...request,
          anchors: context.anchors,
          relevant: context.relevant,
          worldStyle: this.getWorldStyle(),
        };
        return options === undefined
          ? transport.generate(prepared)
          : transport.generate(prepared, options);
      },
    };
  }
}
export const adventureGroundingService = new AdventureGroundingService();

function budgetSources(
  intent: GroundingIntent,
  anchors: ResolvedSourceExcerpt[],
  relevant: ResolvedSourceExcerpt[],
) {
  const ids = selectGroundingCandidates(
    anchors.map((source) => source.recordId),
    relevant.map((source) => source.recordId),
  );
  const anchorIds = new Set(anchors.map((source) => source.recordId));
  const unique = new Map(
    [...anchors, ...relevant].map((source) => [source.recordId, source]),
  );
  // Required records always retain their canonical anchor excerpt.
  for (const anchor of anchors) unique.set(anchor.recordId, anchor);
  const prompt = buildAdventurePrompt({
    session: intent.session,
    phase: intent.purpose === "background" ? "opening" : intent.purpose,
    playerAction: intent.playerAction,
    anchors: ids.filter((id) => anchorIds.has(id)).map((id) => unique.get(id)!),
    relevant: ids
      .filter((id) => !anchorIds.has(id))
      .map((id) => unique.get(id)!),
  });
  if (
    anchors.some((anchor) => {
      const included = prompt.anchors.find(
        (source) => source.recordId === anchor.recordId,
      );
      return (
        !included ||
        included.content !== anchor.content ||
        included.lore !== anchor.lore
      );
    })
  )
    throw new AdventureGroundingError("budget");

  return prompt;
}

function checkCancellation(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

function safeGroundingFailure(cause: unknown): AdventureGroundingError {
  if (cause instanceof AdventureGroundingError) return cause;
  if (!(cause instanceof Error)) return new AdventureGroundingError();
  const codes: Record<string, GroundingFailureCode> = {
    "required-source-unavailable": "unavailable",
    "grounding-anchor-budget-exceeded": "budget",
    "state-budget-exceeded": "budget",
    "generation-budget-exceeded": "budget",
  };
  return new AdventureGroundingError(codes[cause.message] ?? "lookup");
}
