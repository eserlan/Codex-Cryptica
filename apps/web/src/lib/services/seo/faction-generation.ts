import {
  buildFactionPrompt,
  parseFactionResponse,
  generateFactionLocal,
  buildFactionRosterPrompt,
  parseFactionRosterResponse,
  generateFactionRosterLocal,
  buildVampirePrompt,
  parseVampireResponse,
  generateVampireLocal,
  buildNomadClanPrompt,
  parseNomadClanResponse,
  generateNomadClanLocal,
  buildDarkFactionPrompt,
  parseDarkFactionResponse,
  generateDarkFactionLocal,
  type FactionGeneratorOptions,
  type FactionRosterGeneratorOptions,
  type VampireGeneratorOptions,
  type NomadClanGeneratorOptions,
  type DarkFactionGeneratorOptions,
  type PublicGeneratorOutput,
} from "generator-engine";
import type { GeneratorOutput } from "./generator-helpers";

type FactionGenerationDependencies = {
  runWithAIFallback: (
    useAI: boolean | undefined,
    aiAttempt: () => Promise<PublicGeneratorOutput>,
    local: () => PublicGeneratorOutput,
  ) => Promise<GeneratorOutput>;
  runModel: (systemInstruction: string, userMessage: string) => Promise<string>;
  getSessionContext: () => string;
  recentInputs: (type: string) => string[];
  recordInputs: (type: string, summary: string | undefined) => void;
  summarizeResolvedInputs: (resolved: object) => string;
  formatRecentInputsNote: (inputs: readonly string[]) => string;
};

/** AI orchestration for faction-family generators. */
export class FactionGenerationService {
  constructor(private readonly deps: FactionGenerationDependencies) {}

  async generateFaction(
    options: FactionGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...factionOptions } = options;
    const recentInputs = this.deps.recentInputs("faction");
    return this.deps.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildFactionPrompt(
          factionOptions,
          this.deps.getSessionContext() +
            this.deps.formatRecentInputsNote(recentInputs),
        );
        this.deps.recordInputs(
          "faction",
          this.deps.summarizeResolvedInputs(resolved),
        );
        const text = await this.deps.runModel(systemInstruction, userMessage);
        return parseFactionResponse(text, resolved);
      },
      () => generateFactionLocal(factionOptions),
    );
  }

  async generateFactionRoster(
    options: FactionRosterGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...rosterOptions } = options;
    const recentInputs = this.deps.recentInputs("faction-roster");
    return this.deps.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildFactionRosterPrompt(
            rosterOptions,
            this.deps.getSessionContext() +
              this.deps.formatRecentInputsNote(recentInputs),
          );
        this.deps.recordInputs(
          "faction-roster",
          this.deps.summarizeResolvedInputs(resolved),
        );
        const text = await this.deps.runModel(systemInstruction, userMessage);
        return parseFactionRosterResponse(text, resolved);
      },
      () => generateFactionRosterLocal(rosterOptions),
    );
  }

  async generateVampireClan(
    options: VampireGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...vampireOptions } = options;
    const recentInputs = this.deps.recentInputs("vampire-clan");
    return this.deps.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildVampirePrompt(
          vampireOptions,
          this.deps.getSessionContext() +
            this.deps.formatRecentInputsNote(recentInputs),
        );
        this.deps.recordInputs(
          "vampire-clan",
          this.deps.summarizeResolvedInputs(resolved),
        );
        const text = await this.deps.runModel(systemInstruction, userMessage);
        return parseVampireResponse(text, resolved);
      },
      () => generateVampireLocal(vampireOptions),
    );
  }

  async generateNomadClan(
    options: NomadClanGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...nomadOptions } = options;
    const recentInputs = this.deps.recentInputs("nomad-clan");
    return this.deps.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildNomadClanPrompt(
            nomadOptions,
            this.deps.getSessionContext() +
              this.deps.formatRecentInputsNote(recentInputs),
          );
        this.deps.recordInputs(
          "nomad-clan",
          this.deps.summarizeResolvedInputs(resolved),
        );
        const text = await this.deps.runModel(systemInstruction, userMessage);
        return parseNomadClanResponse(text, resolved);
      },
      () => generateNomadClanLocal(nomadOptions),
    );
  }

  async generateDarkFaction(
    options: DarkFactionGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...darkFactionOptions } = options;
    const recentInputs = this.deps.recentInputs("dark-fantasy-faction");
    return this.deps.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildDarkFactionPrompt(
            darkFactionOptions,
            this.deps.getSessionContext() +
              this.deps.formatRecentInputsNote(recentInputs),
          );
        this.deps.recordInputs(
          "dark-fantasy-faction",
          this.deps.summarizeResolvedInputs(resolved),
        );
        const text = await this.deps.runModel(systemInstruction, userMessage);
        return parseDarkFactionResponse(text, resolved);
      },
      () => generateDarkFactionLocal(darkFactionOptions),
    );
  }
}
