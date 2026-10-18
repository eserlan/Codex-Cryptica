import {
  BANNED_NAMES,
  buildAlienRacePrompt,
  buildConstellationPrompt,
  buildCreaturePrompt,
  buildNightSkyPrompt,
  buildStarSystemPrompt,
  buildWorldPrompt,
  generateAlienRaceLocal,
  generateConstellationLocal,
  generateCreatureLocal,
  generateNightSkyLocal,
  generateStarSystemLocal,
  generateWorldLocal,
  parseAlienRaceResponse,
  parseConstellationResponse,
  parseCreatureResponse,
  parseNightSkyResponse,
  parseStarSystemResponse,
  parseWorldResponse,
  type AlienRaceGeneratorOptions,
  type ConstellationGeneratorOptions,
  type CreatureGeneratorOptions,
  type StarSystemGeneratorOptions,
  type WorldGeneratorOptions,
} from "generator-engine";
import type { GeneratorOutput } from "./generator-helpers";

type RunWithAIFallback = (
  useAI: boolean | undefined,
  aiAttempt: () => Promise<GeneratorOutput>,
  local: () => GeneratorOutput,
) => Promise<GeneratorOutput>;

export interface WorldGenerationDependencies {
  runWithAIFallback: RunWithAIFallback;
  runModel: (systemInstruction: string, userMessage: string) => Promise<string>;
  getSessionContext: () => string;
  recentInputs: (generatorId: string) => string[];
  recordInputs: (generatorId: string, summary: string) => void;
  summarizeResolvedInputs: (resolved: object) => string;
  formatRecentInputsNote: (recentInputs: readonly string[]) => string;
}

/** Owns the related world, astronomy, and creature generation workflows. */
export class WorldGenerationService {
  constructor(private readonly dependencies: WorldGenerationDependencies) {}

  async generateWorld(
    options: WorldGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...worldOptions } = options;
    return this.dependencies.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } =
          buildWorldPrompt(worldOptions);
        const text = await this.dependencies.runModel(
          systemInstruction,
          userMessage,
        );
        return parseWorldResponse(text, [
          ...BANNED_NAMES,
          ...(worldOptions.avoidNames ?? []),
        ]) as GeneratorOutput;
      },
      () =>
        generateWorldLocal({
          ...worldOptions,
          avoidNames: [...BANNED_NAMES, ...(worldOptions.avoidNames ?? [])],
        }) as GeneratorOutput,
    );
  }

  async generateStarSystem(
    options: StarSystemGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...starSystemOptions } = options;
    return this.dependencies.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } =
          buildStarSystemPrompt(starSystemOptions);
        const text = await this.dependencies.runModel(
          systemInstruction,
          userMessage,
        );
        return parseStarSystemResponse(text, [
          ...BANNED_NAMES,
          ...(starSystemOptions.avoidNames ?? []),
        ]) as GeneratorOutput;
      },
      () =>
        generateStarSystemLocal({
          ...starSystemOptions,
          avoidNames: [
            ...BANNED_NAMES,
            ...(starSystemOptions.avoidNames ?? []),
          ],
        }) as GeneratorOutput,
    );
  }

  async generateConstellation(
    options: ConstellationGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...constellationOptions } = options;
    const isNightSky = constellationOptions.mode === "night-sky";
    return this.dependencies.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = isNightSky
          ? buildNightSkyPrompt(constellationOptions)
          : buildConstellationPrompt(constellationOptions);
        const text = await this.dependencies.runModel(
          systemInstruction,
          userMessage,
        );
        const avoidNames = [
          ...BANNED_NAMES,
          ...(constellationOptions.avoidNames ?? []),
        ];
        return (
          isNightSky
            ? parseNightSkyResponse(text, avoidNames)
            : parseConstellationResponse(text, avoidNames)
        ) as GeneratorOutput;
      },
      () => {
        const avoidNames = [
          ...BANNED_NAMES,
          ...(constellationOptions.avoidNames ?? []),
        ];
        return (
          isNightSky
            ? generateNightSkyLocal({ ...constellationOptions, avoidNames })
            : generateConstellationLocal({
                ...constellationOptions,
                avoidNames,
              })
        ) as GeneratorOutput;
      },
    );
  }

  async generateAlienRace(
    options: AlienRaceGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...alienRaceOptions } = options;
    return this.dependencies.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } =
          buildAlienRacePrompt(alienRaceOptions);
        const text = await this.dependencies.runModel(
          systemInstruction,
          userMessage,
        );
        return parseAlienRaceResponse(text, [
          ...BANNED_NAMES,
          ...(alienRaceOptions.avoidNames ?? []),
        ]) as GeneratorOutput;
      },
      () =>
        generateAlienRaceLocal({
          ...alienRaceOptions,
          avoidNames: [...BANNED_NAMES, ...(alienRaceOptions.avoidNames ?? [])],
        }) as GeneratorOutput,
    );
  }

  async generateCreature(
    options: CreatureGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...creatureOptions } = options;
    const historyNote = this.dependencies.formatRecentInputsNote(
      this.dependencies.recentInputs("creature"),
    );
    const sessionContext = [this.dependencies.getSessionContext(), historyNote]
      .filter(Boolean)
      .join("\n\n");
    return this.dependencies.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildCreaturePrompt(creatureOptions, sessionContext);
        const text = await this.dependencies.runModel(
          systemInstruction,
          userMessage,
        );
        this.dependencies.recordInputs(
          "creature",
          this.dependencies.summarizeResolvedInputs(resolved),
        );
        return parseCreatureResponse(text, resolved) as GeneratorOutput;
      },
      () =>
        generateCreatureLocal({
          ...creatureOptions,
          avoidNames: [...BANNED_NAMES, ...(creatureOptions.avoidNames ?? [])],
        }) as GeneratorOutput,
    );
  }
}
