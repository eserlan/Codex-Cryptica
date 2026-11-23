import {
  extractMysteryNames,
  generateMysteryLocal,
  parseMysteryResponse,
  type MysteryGeneratorOptions,
} from "generator-engine/public-mystery";
import { generateConceptSeed } from "generator-engine/concept-seed";
import { generateMysteryStaged } from "generator-engine/mystery-staged";
import { type OneShotProgressStep } from "generator-engine/one-shot-staged";
import {
  generationNameHistoryStore,
  generationSeedHistoryStore,
} from "./generation-input-history";
import { prepareMysteryGeneration } from "./mystery-generation-inputs.js";
import { GeneratorEngineSpecialized } from "./generator-engine-specialized";
import { LANGUAGE_GENERATION_CONFIG } from "./generator-ai-transport";
import type { GeneratorOutput } from "./generator-helpers";

interface MysteryRunControls {
  onProgress?: (steps: OneShotProgressStep[]) => void;
  signal?: AbortSignal;
  staged: boolean;
}

export class GeneratorEngineMystery extends GeneratorEngineSpecialized {
  async generateMysteryInvestigation(
    options: MysteryGeneratorOptions & {
      useAI?: boolean;
      onProgress?: (steps: OneShotProgressStep[]) => void;
      signal?: AbortSignal;
      staged?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const {
      useAI,
      onProgress,
      signal,
      staged = true,
      ...mysteryOptions
    } = options;
    const history = prepareMysteryGeneration(mysteryOptions);
    const { prompt } = history;
    return this.runWithAIFallback(
      useAI,
      () => this.generateMysteryWithAI(prompt, { onProgress, signal, staged }),
      () => {
        const local = generateMysteryLocal(prompt.resolved);
        history.recordLocalOutput(local);
        return local;
      },
      signal,
    );
  }

  private async generateMysteryWithAI(
    prompt: ReturnType<typeof prepareMysteryGeneration>["prompt"],
    controls: MysteryRunControls,
  ): Promise<GeneratorOutput> {
    controls.signal?.throwIfAborted();
    if (controls.staged) {
      const stagedOutput = await this.generateMysteryByStages(prompt, controls);
      if (stagedOutput) return stagedOutput;
    }
    return this.generateMysteryOnePass(prompt, controls.signal);
  }

  private async generateMysteryByStages(
    prompt: ReturnType<typeof prepareMysteryGeneration>["prompt"],
    controls: MysteryRunControls,
  ): Promise<GeneratorOutput | null> {
    try {
      const complete = (system: string, message: string) =>
        this.runModel(
          system,
          message,
          LANGUAGE_GENERATION_CONFIG,
          false,
          controls.signal,
        );
      const seed = await generateConceptSeed(
        {
          genre: prompt.resolved.genre,
          tone: prompt.resolved.tone,
          mysteryType: prompt.resolved.mysteryType,
          context: prompt.context,
          recent: generationSeedHistoryStore.recent("mystery-investigation"),
        },
        { complete, signal: controls.signal },
      );
      generationSeedHistoryStore.record("mystery-investigation", seed);
      const result = await generateMysteryStaged(prompt.resolved, {
        complete,
        contextPrefix: prompt.context,
        seed,
        onProgress: controls.onProgress,
        signal: controls.signal,
      });
      if (result) {
        const names = extractMysteryNames(result.output);
        generationNameHistoryStore.record("mystery-investigation", names);
        return {
          type: "note",
          title: result.output.title,
          summary: result.output.summary ?? "",
          content: result.output.content,
          lore: result.output.lore,
          labels: result.output.labels,
          status: "draft",
          mysteryGraph: result.output.mysteryGraph,
        };
      }
      return null;
    } catch (error) {
      if (
        controls.signal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw error;
      }
      return null;
    }
  }

  private async generateMysteryOnePass(
    prompt: ReturnType<typeof prepareMysteryGeneration>["prompt"],
    signal?: AbortSignal,
  ): Promise<GeneratorOutput> {
    signal?.throwIfAborted();
    const text = await this.runModel(
      prompt.systemInstruction,
      prompt.userMessage,
      undefined,
      false,
      signal,
    );
    const output = parseMysteryResponse(text);
    if (!output)
      throw new Error("Mystery generation returned an incomplete result");
    const names = extractMysteryNames(output);
    generationNameHistoryStore.record("mystery-investigation", names);
    return {
      type: "note",
      title: output.title,
      summary: output.summary ?? "",
      content: output.content,
      lore: output.lore,
      labels: output.labels,
      status: "draft",
    };
  }
}
