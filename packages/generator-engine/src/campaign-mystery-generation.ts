import {
  type AIGeneratorGateway,
  type CampaignGeneratorDefinition,
  type GeneratedDraft,
  type GeneratorRunRequest,
} from "./campaign-generator-types";
import { contextChain } from "./campaign-generator-registry";
import { completeText } from "./campaign-generator-service-core";
import { buildMysteryPrompt, parseMysteryResponse } from "./public-mystery";
import { generateMysteryStaged } from "./mystery-staged";
import type { MysteryGraph } from "./mystery-graph";

function mapMysteryDraft(
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  output: {
    title: string;
    summary?: string;
    content: string;
    lore: string;
    labels: string[];
    mysteryGraph?: MysteryGraph;
  },
): GeneratedDraft {
  return generator.mapOutputToDraft(
    {
      title: output.title,
      summary: output.summary ?? "",
      content: output.content,
      lore: output.lore,
      labels: output.labels,
      mysteryGraph: output.mysteryGraph,
    },
    request,
  );
}

function shouldUseStaging(request: GeneratorRunRequest): boolean {
  return request.options?.staged !== false && !request.interaction;
}

async function generateMysteryStagedDraft(
  gateway: AIGeneratorGateway,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  options: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  const context = contextChain(request);
  const prompt = buildMysteryPrompt(options, context);
  try {
    const staged = await generateMysteryStaged(prompt.resolved, {
      contextPrefix: context,
      signal,
      complete: async (instruction, message) =>
        completeText(await gateway.complete(message, instruction, { signal })),
    });
    return staged ? mapMysteryDraft(generator, request, staged.output) : null;
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    return null;
  }
}

async function generateMysteryOnePassDraft(
  gateway: AIGeneratorGateway,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  options: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  const prompt = buildMysteryPrompt(options, contextChain(request));
  try {
    const raw = await gateway.complete(
      prompt.userMessage,
      prompt.systemInstruction,
      {
        interaction: request.interaction,
        signal,
      },
    );
    const output = parseMysteryResponse(completeText(raw));
    return output ? mapMysteryDraft(generator, request, output) : null;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

/** Campaign generation carries only the selected vault context and instructions. */
export async function generateCampaignMysteryWithAI(
  gateway: AIGeneratorGateway,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  signal?: AbortSignal,
): Promise<GeneratedDraft | null> {
  const options = {
    ...(request.options ?? {}),
    genre: String(
      request.options?.genre ?? request.vaultContext?.themeName ?? "Fantasy",
    ),
    // The shared campaign context chain includes instructions, vault context,
    // world examples and naming constraints; pass it through the public
    // prompt's session context so one-pass fallback retains the same grounding.
    campaignContext: "",
    avoidNames: [...bannedNames],
  };
  if (shouldUseStaging(request)) {
    const staged = await generateMysteryStagedDraft(
      gateway,
      generator,
      request,
      options,
      signal,
    );
    if (staged) return staged;
  }
  signal?.throwIfAborted();
  return generateMysteryOnePassDraft(
    gateway,
    generator,
    request,
    options,
    signal,
  );
}
