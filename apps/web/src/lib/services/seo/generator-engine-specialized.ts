import {
  buildDungeonPrompt,
  buildDungeonRetryMessage,
  parseDungeonResponseDetailed,
  generateDungeonLocal,
  generateDungeonStaged,
  buildAdventurePrompt,
  buildAdventureRetryMessage,
  parseAdventureResponseDetailed,
  generateAdventureLocal,
  buildPlotTwistPrompt,
  parsePlotTwistResponse,
  generatePlotTwistLocal,
  type DungeonGeneratorOptions,
  type AdventureGeneratorOptions,
  type PlotTwistGeneratorOptions,
  type WorldGeneratorOptions,
  type StarSystemGeneratorOptions,
  type ConstellationGeneratorOptions,
  type AlienRaceGeneratorOptions,
  type CreatureGeneratorOptions,
  type PublicGeneratorOutput,
  buildTomePrompt,
  generateTomeLocalFromResolved,
  resolveTome,
  generateTomeTwoPass,
  type TomeGeneratorOptions,
  generatePointCrawlLocal,
  generatePointCrawlStaged,
  regeneratePointCrawlPart,
  regeneratePointCrawlPartLocal,
  resolvePointCrawl,
  pointCrawlToOutput,
  type PointCrawlGeneratorOptions,
  type PointCrawlNetwork,
  type PointCrawlRegenTarget,
  type PointCrawlRegenResult,
  type OneShotProgressStep,
} from "generator-engine";
import { getSessionContext } from "./session-context";
import {
  generationInputHistoryStore,
  summarizeResolvedInputs,
  formatRecentInputsNote,
} from "./generation-input-history";

import type { GeneratorOutput } from "./generator-helpers";
import { ONE_SHOT_GENERATION_CONFIG } from "./generator-ai-transport";

import { GeneratorEngineWorldbuilding } from "./generator-engine-worldbuilding";

async function runWithSingleRepair<
  TResult extends {
    output: PublicGeneratorOutput;
    problems: string[];
    rejected: boolean;
  },
>(
  initialText: string,
  systemInstruction: string,
  userMessage: string,
  runModel: (instruction: string, message: string) => Promise<string>,
  buildRetryMessage: (message: string, problems: string[]) => string,
  parse: (text: string) => TResult,
): Promise<TResult["output"]> {
  const first = parse(initialText);
  if (first.problems.length === 0) return first.output;

  const retryText = await runModel(
    systemInstruction,
    buildRetryMessage(userMessage, first.problems),
  );
  const second = parse(retryText);
  if (second.problems.length === 0) return second.output;
  return second.rejected ? first.output : second.output;
}

function recordTomeHistory(
  output: GeneratorOutput,
  inputSummary: string,
  selectedDeceptionKey?: string,
): void {
  generationInputHistoryStore.record(
    "tome",
    selectedDeceptionKey
      ? `${inputSummary}, deceptionKey: ${selectedDeceptionKey}`
      : inputSummary,
  );
  generationInputHistoryStore.record(
    "tome-mysteries",
    (output as PublicGeneratorOutput).tomeFacts?.deception,
  );
}

export class GeneratorEngineSpecialized extends GeneratorEngineWorldbuilding {
  /** Dungeon & Delve generation delegates to the generator-engine package. */
  async generateDungeon(
    options: DungeonGeneratorOptions & {
      useAI?: boolean;
      /** Staged generation is the default; `false` forces the one-pass route. */
      staged?: boolean;
      onProgress?: (steps: OneShotProgressStep[]) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<GeneratorOutput> {
    const {
      useAI,
      staged = true,
      onProgress,
      signal,
      ...dungeonOptions
    } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        // buildDungeonPrompt has no sessionContext param, so this is
        // track-only (no variety feedback into the prompt).
        const { systemInstruction, userMessage, resolved } =
          buildDungeonPrompt(dungeonOptions);
        generationInputHistoryStore.record(
          "dungeon",
          summarizeResolvedInputs(resolved),
        );
        if (staged) {
          const result = await generateDungeonStaged(resolved, dungeonOptions, {
            complete: (instruction, message) =>
              this.runModel(instruction, message, undefined, true, signal),
            signal,
            onProgress,
            onStats: (stats) => {
              if (import.meta.env.DEV) {
                console.debug("[Generator] staged dungeon run", stats);
              }
            },
          });
          if (result) return result.output;
          // An unusable stage falls through to the one-pass route below.
        }
        const text = await this.runModel(
          systemInstruction,
          userMessage,
          undefined,
          true,
          signal,
        );
        return runWithSingleRepair(
          text,
          systemInstruction,
          userMessage,
          (instruction, message) =>
            this.runModel(instruction, message, undefined, true, signal),
          buildDungeonRetryMessage,
          (response) =>
            parseDungeonResponseDetailed(
              response,
              dungeonOptions,
              undefined,
              resolved,
            ),
        );
      },
      () => generateDungeonLocal(dungeonOptions),
    );
  }

  /** Adventure Idea generation delegates to the generator-engine package. */
  async generateAdventure(
    options: AdventureGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...adventureOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        // buildAdventurePrompt has no sessionContext param, so this is
        // track-only (no variety feedback into the prompt).
        const { systemInstruction, userMessage, resolved } =
          buildAdventurePrompt(adventureOptions);
        generationInputHistoryStore.record(
          "adventure",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return runWithSingleRepair(
          text,
          systemInstruction,
          userMessage,
          (instruction, message) => this.runModel(instruction, message),
          buildAdventureRetryMessage,
          (response) =>
            parseAdventureResponseDetailed(
              response,
              adventureOptions,
              undefined,
              resolved,
            ),
        );
      },
      () => generateAdventureLocal(adventureOptions),
    );
  }

  /** Plot twist generation preserves established facts while adding playable choices. */
  async generatePlotTwist(
    options: PlotTwistGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...plotTwistOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        // buildPlotTwistPrompt has no sessionContext param, so this is
        // track-only (no variety feedback into the prompt).
        const { systemInstruction, userMessage, resolved } =
          buildPlotTwistPrompt(plotTwistOptions);
        generationInputHistoryStore.record(
          "plot-twist",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parsePlotTwistResponse(text, plotTwistOptions);
      },
      () => generatePlotTwistLocal(plotTwistOptions),
    );
  }

  /** World generation delegates to the shared offline-first generator package. */
  async generateWorld(
    options: WorldGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    return this.worldGeneration.generateWorld(options);
  }

  /** Star system generation delegates to the shared offline-first generator package. */
  async generateStarSystem(
    options: StarSystemGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    return this.worldGeneration.generateStarSystem(options);
  }

  /** Constellation generation delegates to the shared offline-first generator package. */
  async generateConstellation(
    options: ConstellationGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    return this.worldGeneration.generateConstellation(options);
  }

  /** Alien race generation delegates to the shared offline-first generator package. */
  async generateAlienRace(
    options: AlienRaceGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    return this.worldGeneration.generateAlienRace(options);
  }

  /** Creature generation delegates to the shared offline-first generator package. */
  async generateCreature(
    options: CreatureGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    return this.worldGeneration.generateCreature(options);
  }

  /** Tome and forbidden book generation delegates to the generator-engine package. */
  async generateTome(
    options: TomeGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...tomeOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("tome");
    const recentMysteries =
      generationInputHistoryStore.recent("tome-mysteries");
    const avoidDeceptionKeys = recentInputs.flatMap((entry) => {
      const match = entry.match(/deceptionKey: ([^,|]+)/);
      return match ? [match[1].trim()] : [];
    });
    const variedOptions = {
      ...tomeOptions,
      avoidDeceptionKeys,
      avoidDeceptions: recentMysteries,
    };
    let inputSummary = "";
    let selectedDeceptionKey: string | undefined;
    const generateLocal = () => {
      const resolved = resolveTome(variedOptions);
      inputSummary = summarizeResolvedInputs({
        ...resolved,
        deceptionKey: "",
      });
      selectedDeceptionKey = resolved.deceptionKey;
      const output = generateTomeLocalFromResolved(resolved);
      return output as GeneratorOutput;
    };
    const output = await this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildTomePrompt(
          variedOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        inputSummary = summarizeResolvedInputs({
          ...resolved,
          deceptionKey: "",
        });
        let pass = 0;
        const reviewed = await generateTomeTwoPass(
          { systemInstruction, userMessage, resolved },
          (instruction, message) =>
            this.runModel(instruction, message, undefined, ++pass === 2),
        );
        return reviewed
          ? (reviewed as GeneratorOutput)
          : ({
              ...generateLocal(),
              aiFallback: true,
            } as GeneratorOutput);
      },
      generateLocal,
    );
    recordTomeHistory(output, inputSummary, selectedDeceptionKey);
    return output;
  }

  /**
   * Point crawl generation runs the staged AI pipeline when AI is enabled,
   * falling back to the deterministic local topology + tables generator.
   */
  async generatePointCrawl(
    options: PointCrawlGeneratorOptions & {
      useAI?: boolean;
      onProgress?: (steps: OneShotProgressStep[]) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, onProgress, signal, ...crawlOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("point-crawl");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const resolved = resolvePointCrawl(crawlOptions);
        generationInputHistoryStore.record(
          "point-crawl",
          summarizeResolvedInputs(resolved),
        );
        const network = await generatePointCrawlStaged(
          {
            ...crawlOptions,
            campaignContext:
              (crawlOptions.campaignContext ?? "") +
              "\n" +
              getSessionContext() +
              formatRecentInputsNote(recentInputs),
          },
          (prompt: string) =>
            this.runModel(
              "You are an expert TTRPG worldbuilder creating non-linear point crawl networks. Return valid JSON only.",
              prompt,
              ONE_SHOT_GENERATION_CONFIG,
              true,
              signal,
            ),
          onProgress,
          signal,
        );
        return pointCrawlToOutput(network) as unknown as GeneratorOutput;
      },
      () => generatePointCrawlLocal(crawlOptions),
    );
  }

  /**
   * Surgically regenerate one node or route of a point crawl, leaving topology
   * and sibling items untouched.
   */
  async regeneratePointCrawlPart(
    crawl: PointCrawlNetwork,
    target: PointCrawlRegenTarget,
    options: {
      useAI?: boolean;
      instruction?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<PointCrawlRegenResult> {
    if (!options.useAI) {
      return regeneratePointCrawlPartLocal(crawl, target, options.instruction);
    }
    try {
      return await regeneratePointCrawlPart(crawl, target, {
        useAI: true,
        instruction: options.instruction,
        complete: (prompt: string) =>
          this.runModel(
            "You are an expert TTRPG worldbuilder refining point crawl details. Return valid JSON only.",
            prompt,
            undefined,
            true,
            options.signal,
          ),
        signal: options.signal,
      });
    } catch {
      if (options.instruction?.trim()) {
        return {
          crawl,
          warnings: [
            "Couldn't reach the AI, so your change wasn't applied. Nothing was changed.",
          ],
        };
      }
      return regeneratePointCrawlPartLocal(crawl, target);
    }
  }
}
