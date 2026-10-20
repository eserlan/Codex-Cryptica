import {
  buildSocialHubPrompt,
  parseSocialHubResponse,
  generateSocialHubLocal,
  buildTavernPrompt,
  parseTavernResponse,
  generateTavernLocal,
  buildOriginPrompt,
  parseOriginResponse,
  generateOriginLocal,
  buildCouncilVoteFoundationPrompt,
  runCouncilVoteStaged,
  generateCouncilVoteLocal,
  buildHeistPrompt,
  generateHeistLocal,
  buildSecretSocietyPrompt,
  parseSecretSocietyResponse,
  generateSecretSocietyLocal,
  buildKingdomPrompt,
  parseKingdomResponse,
  generateKingdomLocal,
  buildNationPrompt,
  parseNationResponse,
  generateNationLocal,
  buildPantheonPrompt,
  parsePantheonResponse,
  generatePantheonLocal,
  buildNamesPrompt,
  parseNamesResponse,
  generateNamesLocal,
  buildShipPrompt,
  parseShipResponse,
  generateShipLocal,
  buildLanguagePrompt,
  generateLanguageLocal,
  buildNewsSheetPrompt,
  parseNewsSheetResponse,
  generateNewsSheetLocal,
  type SocialHubGeneratorOptions,
  type TavernGeneratorOptions,
  type OriginGeneratorOptions,
  type CouncilVoteGeneratorOptions,
  type HeistGeneratorOptions,
  type SecretSocietyGeneratorOptions,
  type KingdomGeneratorOptions,
  type NationGeneratorOptions,
  type PantheonGeneratorOptions,
  type NamesGeneratorOptions,
  type ShipGeneratorOptions,
  type LanguageGeneratorOptions,
  type NewsSheetGeneratorOptions,
  type OneShotProgressStep,
  languageConfig,
} from "generator-engine";
import { getSessionContext } from "./session-context";
import {
  generationInputHistoryStore,
  summarizeResolvedInputs,
  formatRecentInputsNote,
} from "./generation-input-history";
import { runLanguageGenerationWithRepair } from "./language-generation-repair";
import { runSeoHeistGeneration } from "./heist-generation-orchestration";

import type { GeneratorOutput } from "./generator-helpers";

import { GeneratorEngineCore } from "./generator-engine-core";

export class GeneratorEngineWorldbuilding extends GeneratorEngineCore {
  async generateHeist(
    options: HeistGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...heistOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("heist");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const prompt = buildHeistPrompt(
          heistOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        const { resolved } = prompt;
        generationInputHistoryStore.record(
          "heist",
          summarizeResolvedInputs(resolved),
        );
        return runSeoHeistGeneration(
          prompt,
          this.startChat.bind(this),
          this.sendChatMessage.bind(this),
        );
      },
      () => generateHeistLocal(heistOptions),
    );
  }

  async generateCouncilVote(
    options: CouncilVoteGeneratorOptions & {
      useAI?: boolean;
      onProgress?: (steps: OneShotProgressStep[]) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, onProgress, signal, ...councilVoteOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("council-vote");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const prompt = buildCouncilVoteFoundationPrompt(
          councilVoteOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "council-vote",
          summarizeResolvedInputs(prompt.resolved),
        );
        if (signal?.aborted) {
          throw (
            signal.reason ??
            new DOMException("The operation was aborted", "AbortError")
          );
        }
        const chat = await this.startChat(prompt.systemInstruction);
        const output = await runCouncilVoteStaged(prompt, {
          send: (message) => this.sendChatMessage(chat, message, signal),
          onProgress,
          signal,
        });
        if (!output) {
          throw new Error(
            "Council Vote staged generation returned no usable draft.",
          );
        }
        return output;
      },
      () => generateCouncilVoteLocal(councilVoteOptions),
      signal,
    );
  }

  async generateSecretSociety(
    options: SecretSocietyGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...secretSocietyOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("secret-society");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildSecretSocietyPrompt(
            secretSocietyOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "secret-society",
          summarizeResolvedInputs(resolved),
        );
        return parseSecretSocietyResponse(
          await this.runModel(systemInstruction, userMessage),
          resolved,
        );
      },
      () => generateSecretSocietyLocal(secretSocietyOptions),
    );
  }

  async generateOrigin(
    options: OriginGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...originOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("origin");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildOriginPrompt(
          originOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "origin",
          summarizeResolvedInputs(resolved),
        );
        return parseOriginResponse(
          await this.runModel(systemInstruction, userMessage),
          resolved,
        );
      },
      () => generateOriginLocal(originOptions),
    );
  }

  /** Name generation delegates to the generator-engine package (#1351). */
  async generateNames(
    options: NamesGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...nameOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        // buildNamesPrompt has no sessionContext param, so this is track-only
        // (no variety feedback into the prompt).
        const { systemInstruction, userMessage, resolved } =
          buildNamesPrompt(nameOptions);
        generationInputHistoryStore.record(
          "names",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseNamesResponse(text, resolved);
      },
      () => generateNamesLocal(nameOptions),
    );
  }

  async generateSocialHub(
    options: SocialHubGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...hubOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("social-hub");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildSocialHubPrompt(
            hubOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "social-hub",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseSocialHubResponse(text);
      },
      () => generateSocialHubLocal(hubOptions),
    );
  }

  async generateTavern(
    options: TavernGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...tavernOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("tavern");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildTavernPrompt(
          tavernOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "tavern",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseTavernResponse(text);
      },
      () => generateTavernLocal(tavernOptions),
    );
  }

  async generateKingdom(
    options: KingdomGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...kingdomOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("kingdom");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildKingdomPrompt(
          kingdomOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "kingdom",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseKingdomResponse(text);
      },
      () => generateKingdomLocal(kingdomOptions),
    );
  }

  /** Nation generation delegates to the generator-engine package (#1351). */
  async generateNation(
    options: NationGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...nationOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("nation");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildNationPrompt(
          nationOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "nation",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseNationResponse(text);
      },
      () => generateNationLocal(nationOptions),
    );
  }

  /** Pantheon generation delegates to the generator-engine package (#1351). */
  async generatePantheon(
    options: PantheonGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...pantheonOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("pantheon");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildPantheonPrompt(
            pantheonOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "pantheon",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parsePantheonResponse(text, resolved);
      },
      () => generatePantheonLocal(pantheonOptions),
    );
  }

  /** Ship generation delegates to the generator-engine package (#1500). */
  async generateShip(
    options: ShipGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...shipOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("ship");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildShipPrompt(
          shipOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "ship",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseShipResponse(text, resolved);
      },
      () => generateShipLocal(shipOptions),
    );
  }

  async generateLanguage(
    options: Partial<LanguageGeneratorOptions> & {
      useAI?: boolean;
      campaignContext?: string;
    } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...rest } = options;
    const langOptions = {
      genre: rest.genre || languageConfig.genres[0],
      tone: rest.tone || languageConfig.tones[0],
      role: rest.role || languageConfig.roles[0],
      structure: rest.structure || languageConfig.structures[0],
      context: rest.context || rest.campaignContext || "",
    };
    const recentInputs = generationInputHistoryStore.recent("language");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildLanguagePrompt(
            langOptions,
            getSessionContext({ excludeLanguageDrafts: true }) +
              formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "language",
          summarizeResolvedInputs(resolved),
        );
        const expected = {
          genre: resolved.genre,
          tone: resolved.tone,
          role: resolved.role,
          structure: resolved.structure,
          ...(resolved.context ? { worldContext: resolved.context } : {}),
        };
        return runLanguageGenerationWithRepair({
          systemInstruction,
          userMessage,
          expected,
          bannedNames: resolved.bannedNames ?? [],
          runModel: (instruction, message, config) =>
            this.runModel(instruction, message, config),
        });
      },
      () => generateLanguageLocal(langOptions),
    );
  }

  /** News Sheet generation delegates to the generator-engine package (#1639). */
  async generateNewsSheet(
    options: NewsSheetGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...sheetOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("news-sheet");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildNewsSheetPrompt(
            sheetOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "news-sheet",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseNewsSheetResponse(text);
      },
      () => generateNewsSheetLocal(sheetOptions),
    );
  }
}
