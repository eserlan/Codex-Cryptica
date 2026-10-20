/**
 * Business / Enterprise Generator (#3627, spec 180) — campaign (in-app)
 * adapter. Maps the request onto the engine, and runs the staged AI path on one
 * chat session. Returns null when AI is unavailable or fails, so the caller
 * uses local tables.
 */

import { businessGeneratorOutput } from "./business-output";
import { generateBusinessStaged } from "./business-staged";
import type { BusinessGeneratorOptions, BusinessScale } from "./business-state";
import type {
  AIGeneratorGateway,
  GeneratedDraft,
  GeneratorRunRequest,
  CampaignGeneratorDefinition,
} from "./campaign-generator-types";
import { isAbort, throwIfAborted } from "./staged-runtime";
import type { StagedProgressStep } from "./staged-progress";

const SYSTEM_INSTRUCTION =
  "You write tabletop RPG campaign content as valid JSON only. Keep names, people and pressures consistent with what you have already written.";

function text(request: GeneratorRunRequest, key: string): string {
  const value = request.options[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Maps a generator request onto the business options. Free text comes from the instruction. */
export function businessOptionsFromRequest(
  request: GeneratorRunRequest,
): BusinessGeneratorOptions {
  const playersOwn = request.options.playersOwn;
  return {
    genre: text(request, "genre") || undefined,
    businessType: text(request, "businessType") || undefined,
    scale: (text(request, "scale") || undefined) as BusinessScale | undefined,
    legitimacy: (text(request, "legitimacy") ||
      undefined) as BusinessGeneratorOptions["legitimacy"],
    wealth: (text(request, "wealth") ||
      undefined) as BusinessGeneratorOptions["wealth"],
    tone: (text(request, "tone") ||
      undefined) as BusinessGeneratorOptions["tone"],
    clientele: text(request, "clientele") || undefined,
    location: text(request, "location") || undefined,
    campaignContext: request.instructions?.trim() || undefined,
    playersOwn: playersOwn === true || playersOwn === "true",
  };
}

export interface BusinessAIOptions {
  signal?: AbortSignal;
  onProgress?: (steps: StagedProgressStep[]) => void;
}

/** The staged AI draft, or null when there is no chat session or it fails. */
export async function generateBusinessWithAI(
  aiGateway: AIGeneratorGateway | undefined,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  options: BusinessAIOptions = {},
): Promise<GeneratedDraft | null> {
  if (!aiGateway?.startChat) return null;
  const { signal, onProgress } = options;
  try {
    throwIfAborted(signal);
    const chat = await aiGateway.startChat(SYSTEM_INSTRUCTION);
    const doc = await generateBusinessStaged(
      businessOptionsFromRequest(request),
      {
        send: (message, s) => (s ? chat.send(message, s) : chat.send(message)),
        onProgress,
        signal,
      },
    );
    return generator.mapOutputToDraft(businessGeneratorOutput(doc), request);
  } catch (err) {
    if (isAbort(err, signal)) throw err;
    return null;
  }
}
