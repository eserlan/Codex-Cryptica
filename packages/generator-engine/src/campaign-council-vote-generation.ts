import {
  councilVoteFoundationPrompt,
  councilVoteFoundationRepairPrompt,
  councilVotePathsPrompt,
  councilVotePathsRepairPrompt,
  getGenerator,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import { parseConnections } from "./campaign-generator-service";
import type {
  AIGeneratorChatSession,
  AIGeneratorGateway,
  AIPolicy,
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GenerationEvent,
  GeneratorOutput,
  GeneratorRunRequest,
} from "./campaign-generator-types";

type CouncilVoteFoundation = Partial<GeneratorOutput> & {
  title: string;
  summary: string;
  lore: string;
};
type CouncilVotePaths = { possiblePaths?: unknown; followUpHooks?: unknown };

function isUsableCouncilVoteFoundation(
  value: Partial<GeneratorOutput>,
): value is CouncilVoteFoundation {
  return (
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.lore === "string"
  );
}

function isUsableCouncilVotePaths(value: CouncilVotePaths): boolean {
  return (
    typeof value.possiblePaths === "string" &&
    typeof value.followUpHooks === "string"
  );
}

/** Merge the foundation and paths passes into the final council-vote output. */
export function buildCouncilVoteOutput(
  foundation: CouncilVoteFoundation,
  paths: CouncilVotePaths,
): GeneratorOutput {
  return {
    title: foundation.title,
    summary: foundation.summary,
    lore: [foundation.lore, paths.possiblePaths, paths.followUpHooks]
      .filter((value): value is string => typeof value === "string" && !!value)
      .join("\n\n"),
    content:
      typeof foundation.content === "string" ? foundation.content : undefined,
    labels: Array.isArray(foundation.labels) ? foundation.labels : [],
    connections: parseConnections(foundation.connections),
  };
}

/**
 * Four-pass AI generation for council-vote (#2033/#2034): foundation,
 * foundation-repair, paths, paths-repair, run as four turns on one real
 * chat session so each pass sees every prior pass's actual output as
 * conversation history rather than a hand-summarized re-injection of it —
 * this is what fixed the repeated contradictions (reversed/invented
 * dependencies, persuasion conditions swapped for unrelated evidence,
 * amendments introduced despite an immutable objective) that kept
 * surviving single-shot prompt tightening. Each repair turn proofreads the
 * pass immediately before it — before the next pass builds on it — since a
 * defect in an earlier pass otherwise gets faithfully inherited by a later
 * one that's correctly following its own rules. Requires
 * `aiGateway.startChat` (optional on the interface); if the injected
 * gateway doesn't implement it, falls through to local generation the same
 * as `aiGateway` being unset.
 */
export async function generateCouncilVoteWithAI(
  aiGateway: AIGeneratorGateway | undefined,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
): Promise<GeneratedDraft | null> {
  if (!aiGateway?.startChat) return null;

  try {
    const chat = await aiGateway.startChat(SYSTEM_INSTRUCTION);

    const foundationRaw = await chat.send(councilVoteFoundationPrompt(request));
    const foundationParsed = JSON.parse(
      foundationRaw,
    ) as Partial<GeneratorOutput>;
    if (!isUsableCouncilVoteFoundation(foundationParsed)) return null;
    let foundation = foundationParsed;

    // Proofread/repair before the paths pass ever sees the foundation —
    // fixing it after would let paths inherit whatever the repair fixed.
    // A malformed repair reply keeps the original, unrepaired foundation
    // rather than failing the whole generation over a cleanup step.
    try {
      const repairedRaw = await chat.send(councilVoteFoundationRepairPrompt());
      const repaired = JSON.parse(repairedRaw) as Partial<GeneratorOutput>;
      if (isUsableCouncilVoteFoundation(repaired)) foundation = repaired;
    } catch {
      // Keep the unrepaired foundation.
    }

    const pathsRaw = await chat.send(councilVotePathsPrompt());
    let paths = JSON.parse(pathsRaw) as CouncilVotePaths;

    // Same rationale as the foundation repair above, one pass later: fix
    // the paths before they're used, and keep the unrepaired paths if the
    // repair reply itself is unusable.
    try {
      const pathsRepairedRaw = await chat.send(councilVotePathsRepairPrompt());
      const pathsRepaired = JSON.parse(pathsRepairedRaw) as CouncilVotePaths;
      if (isUsableCouncilVotePaths(pathsRepaired)) paths = pathsRepaired;
    } catch {
      // Keep the unrepaired paths.
    }

    return generator.mapOutputToDraft(
      buildCouncilVoteOutput(foundation, paths),
      request,
    );
  } catch {
    return null;
  }
}

/** Streaming counterpart of {@link generateCouncilVoteWithAI}. */
export async function* generateCouncilVoteWithAIStream(
  request: GeneratorRunRequest,
  deps: {
    aiPolicy: AIPolicy;
    aiGateway?: AIGeneratorGateway;
    generateDraft: (request: GeneratorRunRequest) => Promise<GeneratedDraft>;
  },
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent | { type: "draft"; draft: GeneratedDraft }> {
  const generator = getGenerator(request.generatorId);
  const mergedRequest: GeneratorRunRequest = {
    ...request,
    options: {
      ...getThemeDefaults(request.themeId, request.generatorId),
      ...request.options,
    },
  };
  const canUseAI =
    request.useAI &&
    deps.aiPolicy.isEnabled &&
    deps.aiPolicy.isAvailable &&
    !!deps.aiGateway?.startChat;

  if (!canUseAI) {
    yield { type: "started" };
    yield { type: "draft", draft: await deps.generateDraft(request) };
    return;
  }

  async function* sendTurn(
    chat: AIGeneratorChatSession,
    label: string,
    message: string,
  ): AsyncGenerator<GenerationEvent, string> {
    yield { type: "phase", label };
    if (!chat.sendStream) {
      yield { type: "started" };
      const text = await chat.send(message);
      yield { type: "complete", text };
      return text;
    }
    let text = "";
    for await (const event of chat.sendStream(message, signal)) {
      if (event.type === "complete") text = event.text;
      yield event;
    }
    return text;
  }

  try {
    const chat = await deps.aiGateway!.startChat!(SYSTEM_INSTRUCTION);
    const foundationRaw = yield* sendTurn(
      chat,
      "Drafting the council's founding stance…",
      councilVoteFoundationPrompt(mergedRequest),
    );
    if (signal?.aborted) return;
    const parsedFoundation = JSON.parse(
      foundationRaw,
    ) as Partial<GeneratorOutput>;
    if (!isUsableCouncilVoteFoundation(parsedFoundation)) {
      yield { type: "draft", draft: await deps.generateDraft(request) };
      return;
    }
    let foundation = parsedFoundation;

    try {
      const repairedRaw = yield* sendTurn(
        chat,
        "Checking the council's stance for consistency…",
        councilVoteFoundationRepairPrompt(),
      );
      if (signal?.aborted) return;
      const repaired = JSON.parse(repairedRaw) as Partial<GeneratorOutput>;
      if (isUsableCouncilVoteFoundation(repaired)) foundation = repaired;
    } catch {
      // A repair failure retains the usable foundation from the prior turn.
    }

    const pathsRaw = yield* sendTurn(
      chat,
      "Charting possible paths…",
      councilVotePathsPrompt(),
    );
    if (signal?.aborted) return;
    let paths = JSON.parse(pathsRaw) as CouncilVotePaths;
    try {
      const repairedRaw = yield* sendTurn(
        chat,
        "Refining the possible paths…",
        councilVotePathsRepairPrompt(),
      );
      if (signal?.aborted) return;
      const repaired = JSON.parse(repairedRaw) as CouncilVotePaths;
      if (isUsableCouncilVotePaths(repaired)) paths = repaired;
    } catch {
      // A repair failure retains the usable paths from the prior turn.
    }

    yield {
      type: "draft",
      draft: generator.mapOutputToDraft(
        buildCouncilVoteOutput(foundation, paths),
        mergedRequest,
      ),
    };
  } catch {
    if (!signal?.aborted) {
      yield { type: "draft", draft: await deps.generateDraft(request) };
    }
  }
}
