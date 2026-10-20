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
  generateAdventureStaged,
  adventureStatsLog,
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
  generateTomeStaged,
  tomeStatsLog,
  type TomeGeneratorOptions,
  type StagedProgressStep,
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
  generateBusinessStaged,
  generateBusinessLocal,
  businessToOutput,
  businessGeneratorOutput,
  regenerateBusinessSection as regenerateBusinessSectionPart,
  type BusinessDocument,
  type BusinessGeneratorOptions,
  type BusinessSectionId,
  type RegenerateBusinessSectionResult,
} from "generator-engine";
import { getSessionContext } from "./session-context";
import {
  generationInputHistoryStore,
  summarizeResolvedInputs,
  formatRecentInputsNote,
} from "./generation-input-history";

import type { GeneratorOutput } from "./generator-helpers";
import { ONE_SHOT_GENERATION_CONFIG } from "./generator-ai-transport";

const BUSINESS_SYSTEM =
  "You are an expert TTRPG worldbuilder writing one commercial organisation as a living business. Return valid JSON only, with no prices.";

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
                console.debug("[Generator] staged dungeon run", {
                  outcome: stats.outcome,
                  stoppedAt: stats.stoppedAt,
                  aiCalls: stats.aiCalls,
                  repairedStageCount: stats.repairedStages.length,
                  reviewIssueCount: stats.reviewIssues.length,
                  reviewSkipped: stats.reviewSkipped,
                  coherenceRepaired: stats.coherenceRepaired,
                  remainingIssueCount: stats.remainingIssues.length,
                });
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
    options: AdventureGeneratorOptions & {
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
      ...adventureOptions
    } = options;
    const complete = (instruction: string, message: string) =>
      this.runModel(instruction, message, undefined, true, signal);
    return this.runWithAIFallback(
      useAI,
      async () => {
        // buildAdventurePrompt has no sessionContext param, so this is
        // track-only (no variety feedback into the prompt).
        const prompt = buildAdventurePrompt(adventureOptions);
        const { systemInstruction, userMessage, resolved } = prompt;
        generationInputHistoryStore.record(
          "adventure",
          summarizeResolvedInputs(resolved),
        );
        if (staged) {
          const result = await generateAdventureStaged(
            prompt,
            adventureOptions,
            {
              complete,
              signal,
              onProgress,
              onStats: (stats) => {
                if (import.meta.env.DEV) {
                  console.debug(
                    "[Generator] staged adventure run",
                    adventureStatsLog(stats),
                  );
                }
              },
            },
          );
          if (result) return result.output;
          // An unusable stage falls through to the one-pass route below.
        }
        const text = await complete(systemInstruction, userMessage);
        return runWithSingleRepair(
          text,
          systemInstruction,
          userMessage,
          complete,
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
    options: TomeGeneratorOptions & {
      useAI?: boolean;
      onProgress?: (steps: StagedProgressStep[]) => void;
      signal?: AbortSignal;
      staged?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const {
      useAI,
      onProgress,
      signal,
      staged = true,
      ...tomeOptions
    } = options;
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
      // fallow-ignore-next-line complexity
      async () => {
        const prompt = buildTomePrompt(
          variedOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        const { systemInstruction, userMessage, resolved } = prompt;
        inputSummary = summarizeResolvedInputs({
          ...resolved,
          deceptionKey: "",
        });
        if (signal?.aborted) {
          throw (
            signal.reason ??
            new DOMException("The operation was aborted", "AbortError")
          );
        }
        if (staged !== false) {
          try {
            const stagedResult = await generateTomeStaged(
              prompt,
              variedOptions,
              {
                signal,
                onProgress,
                onStats: (stats) => {
                  if (import.meta.env.DEV) {
                    console.debug("[TomeStagedStats]", tomeStatsLog(stats));
                  }
                },
                complete: (instruction, message) =>
                  this.runModel(instruction, message, undefined, true, signal),
              },
            );
            if (stagedResult) return stagedResult.output as GeneratorOutput;
          } catch (err) {
            if (
              signal?.aborted ||
              (err instanceof Error && err.name === "AbortError")
            ) {
              throw err;
            }
          }
        }
        let pass = 0;
        const reviewed = await generateTomeTwoPass(
          { systemInstruction, userMessage, resolved },
          (instruction, message) =>
            this.runModel(
              instruction,
              message,
              undefined,
              ++pass === 2,
              signal,
            ),
          signal,
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
  /**
   * Business generation: three staged turns when AI is on, with each turn
   * carrying the earlier turns in its prompt, falling back to local tables.
   */
  async generateBusiness(
    options: BusinessGeneratorOptions & {
      useAI?: boolean;
      onProgress?: (steps: OneShotProgressStep[]) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, onProgress, signal, ...bizOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const transcript: string[] = [];
        const send = async (message: string, turnSignal?: AbortSignal) => {
          const prompt = [...transcript, message].join("\n\n---\n\n");
          const reply = await this.runModel(
            BUSINESS_SYSTEM,
            prompt,
            ONE_SHOT_GENERATION_CONFIG,
            true,
            turnSignal ?? signal,
          );
          transcript.push(message, reply);
          return reply;
        };
        const doc = await generateBusinessStaged(bizOptions, {
          send,
          onProgress: onProgress as never,
          signal,
        });
        return businessGeneratorOutput(doc) as unknown as GeneratorOutput;
      },
      () =>
        businessToOutput(
          generateBusinessLocal(bizOptions),
        ) as unknown as GeneratorOutput,
    );
  }

  /**
   * Rewrite one business section with an optional steer. A failed model call
   * is treated as an unusable reply, so the section is rebuilt from the tables.
   */
  async regenerateBusinessSection(
    doc: BusinessDocument,
    section: BusinessSectionId,
    options: {
      useAI?: boolean;
      instruction?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<RegenerateBusinessSectionResult> {
    const send = async (message: string, turnSignal?: AbortSignal) => {
      try {
        return await this.runModel(
          BUSINESS_SYSTEM,
          message,
          ONE_SHOT_GENERATION_CONFIG,
          true,
          turnSignal ?? options.signal,
        );
      } catch (err) {
        if (options.signal?.aborted) throw err;
        return "";
      }
    };
    return regenerateBusinessSectionPart(doc, section, {
      useAI: options.useAI === true,
      instruction: options.instruction,
      send: options.useAI ? send : undefined,
      signal: options.signal,
    });
  }
}
