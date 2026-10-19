import {
  councilVoteFoundationPrompt,
  councilVoteFoundationRepairPrompt,
  councilVotePathsPrompt,
  councilVotePathsRepairPrompt,
  getGenerator,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import { parseConnections } from "./campaign-connections";
import {
  auditCouncilVotePaths,
  runCouncilVoteFourTurn,
} from "./public-council-vote";
import type { StagedProgressStep } from "./staged-progress";
import { isAbort, readJsonObject, throwIfAborted } from "./staged-runtime";
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
  value: Partial<GeneratorOutput> | null,
): value is CouncilVoteFoundation {
  return (
    !!value &&
    typeof value.title === "string" &&
    Boolean(value.title.trim()) &&
    typeof value.summary === "string" &&
    Boolean(value.summary.trim()) &&
    typeof value.lore === "string" &&
    Boolean(value.lore.trim())
  );
}

function isUsableCouncilVotePaths(value: CouncilVotePaths | null): boolean {
  return (
    !!value &&
    typeof value.possiblePaths === "string" &&
    Boolean(value.possiblePaths.trim()) &&
    typeof value.followUpHooks === "string" &&
    Boolean(value.followUpHooks.trim())
  );
}

function readInAppCouncilVoteFoundation(
  reply: string,
): CouncilVoteFoundation | null {
  const parsed = readJsonObject(reply) as Partial<GeneratorOutput> | null;
  return isUsableCouncilVoteFoundation(parsed) ? parsed : null;
}

function readInAppCouncilVotePaths(reply: string): CouncilVotePaths | null {
  const parsed = readJsonObject(reply) as CouncilVotePaths | null;
  return isUsableCouncilVotePaths(parsed) ? parsed : null;
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
  options?: {
    onProgress?: (steps: StagedProgressStep[]) => void;
    signal?: AbortSignal;
  },
): Promise<GeneratedDraft | null> {
  if (!aiGateway?.startChat) return null;
  const { onProgress, signal } = options ?? {};

  try {
    throwIfAborted(signal);
    const chat = await aiGateway.startChat(SYSTEM_INSTRUCTION);
    const stages = await runCouncilVoteFourTurn({
      send: (message) =>
        signal ? chat.send(message, signal) : chat.send(message),
      foundationPrompt: councilVoteFoundationPrompt(request),
      foundationRepairPrompt: councilVoteFoundationRepairPrompt(),
      pathsPrompt: councilVotePathsPrompt(),
      pathsRepairPrompt: councilVotePathsRepairPrompt(),
      readFoundation: readInAppCouncilVoteFoundation,
      readPaths: readInAppCouncilVotePaths,
      validatePaths: (foundation, paths) =>
        auditCouncilVotePaths(
          {
            possiblePaths: String(paths.possiblePaths ?? ""),
            followUpHooks: String(paths.followUpHooks ?? ""),
          },
          { foundationLore: foundation.lore, fixedProposal: true },
        ).valid,
      onProgress,
      signal,
    });
    if (!stages) return null;

    return generator.mapOutputToDraft(
      buildCouncilVoteOutput(stages.foundation, stages.paths),
      request,
    );
  } catch (err) {
    if (isAbort(err, signal)) throw err;
    return null;
  }
}

async function* sendCouncilVoteStreamTurn(
  chat: AIGeneratorChatSession,
  label: string,
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent, string> {
  yield { type: "phase", label };
  if (!chat.sendStream) {
    yield { type: "started" };
    const text = signal
      ? await chat.send(message, signal)
      : await chat.send(message);
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

function acceptValidated<T>(
  candidate: T,
  validate?: (value: T) => boolean,
): T | null {
  return validate && !validate(candidate) ? null : candidate;
}

async function* runCouncilVoteStreamStage<T>(
  chat: AIGeneratorChatSession,
  initialLabel: string,
  initialPrompt: string,
  repairLabel: string,
  repairPrompt: string,
  read: (reply: string) => T | null,
  signal?: AbortSignal,
  validate?: (value: T) => boolean,
): AsyncGenerator<GenerationEvent, T | null> {
  const initialRaw = yield* sendCouncilVoteStreamTurn(
    chat,
    initialLabel,
    initialPrompt,
    signal,
  );
  if (signal?.aborted) return null;
  const initial = read(initialRaw);
  if (!initial) return null;

  try {
    const repairedRaw = yield* sendCouncilVoteStreamTurn(
      chat,
      repairLabel,
      repairPrompt,
      signal,
    );
    if (signal?.aborted) return null;
    return acceptValidated(read(repairedRaw) ?? initial, validate);
  } catch (err) {
    if (isAbort(err, signal)) throw err;
    return acceptValidated(initial, validate);
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

  try {
    throwIfAborted(signal);
    const chat = await deps.aiGateway!.startChat!(SYSTEM_INSTRUCTION);
    const foundation = yield* runCouncilVoteStreamStage(
      chat,
      "Drafting the council's founding stance…",
      councilVoteFoundationPrompt(mergedRequest),
      "Checking the council's stance for consistency…",
      councilVoteFoundationRepairPrompt(),
      readInAppCouncilVoteFoundation,
      signal,
    );
    if (signal?.aborted) return;
    if (!foundation) {
      yield { type: "draft", draft: await deps.generateDraft(request) };
      return;
    }

    const paths = yield* runCouncilVoteStreamStage(
      chat,
      "Charting possible paths…",
      councilVotePathsPrompt(),
      "Refining the possible paths…",
      councilVotePathsRepairPrompt(),
      readInAppCouncilVotePaths,
      signal,
      (paths) =>
        auditCouncilVotePaths(
          {
            possiblePaths: String(paths.possiblePaths ?? ""),
            followUpHooks: String(paths.followUpHooks ?? ""),
          },
          { foundationLore: foundation.lore, fixedProposal: true },
        ).valid,
    );
    if (signal?.aborted) return;
    if (!paths) {
      yield { type: "draft", draft: await deps.generateDraft(request) };
      return;
    }

    yield {
      type: "draft",
      draft: generator.mapOutputToDraft(
        buildCouncilVoteOutput(foundation, paths),
        mergedRequest,
      ),
    };
  } catch (err) {
    if (!isAbort(err, signal)) {
      yield { type: "draft", draft: await deps.generateDraft(request) };
    }
  }
}
