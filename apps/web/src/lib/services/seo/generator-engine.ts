import { aiClientManager } from "$lib/services/ai/client-manager";
import {
  buildNpcPrompt,
  parseNpcResponse,
  generateNpcLocal,
  buildMagicItemPrompt,
  parseMagicItemResponse,
  generateMagicItemLocal,
  buildFactionPrompt,
  parseFactionResponse,
  generateFactionLocal,
  buildVampirePrompt,
  parseVampireResponse,
  generateVampireLocal,
  buildSocialHubPrompt,
  parseSocialHubResponse,
  generateSocialHubLocal,
  buildTavernPrompt,
  parseTavernResponse,
  generateTavernLocal,
  buildQuestPrompt,
  parseQuestResponse,
  generateQuestLocal,
  buildSettlementPrompt,
  parseSettlementResponse,
  generateSettlementLocal,
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
  type NpcGeneratorOptions,
  type MagicItemGeneratorOptions,
  type FactionGeneratorOptions,
  type VampireGeneratorOptions,
  type SocialHubGeneratorOptions,
  type TavernGeneratorOptions,
  type QuestGeneratorOptions,
  type SettlementGeneratorOptions,
  type KingdomGeneratorOptions,
  type NationGeneratorOptions,
  type PantheonGeneratorOptions,
  type NamesGeneratorOptions,
  type PublicGeneratorOutput,
} from "generator-engine";
import { getSessionContext } from "./session-context";

export {
  nameTable,
  type GeneratorOutput,
  pickFrom,
  getRandomItems,
  generateName,
} from "./generator-helpers";
// NPC content data now lives in the generator-engine package (#1351); re-export
// it here so existing SEO consumers (form fields, random-idea) keep importing
// from this module.
export { npcConfig, npcThemeConfig } from "generator-engine";
// Faction + vampire + settlement content data now live in the package (#1351).
export { factionConfig, themeIdToLabel, vampireConfig } from "generator-engine";
export { settlementConfig } from "generator-engine";
// Magic item content data now lives in the package (#1351).
export { magicItemConfig } from "generator-engine";
export { questConfig, themeToQuestGenre } from "generator-engine";
export { socialHubConfig } from "generator-engine";
export { kingdomConfig } from "generator-engine";
export { nationConfig } from "generator-engine";
export { pantheonConfig } from "generator-engine";
export { nameGeneratorConfig } from "generator-engine";

import { generateName as _generateName } from "./generator-helpers";
import type { GeneratorOutput } from "./generator-helpers";

/**
 * Bridge the package's {@link PublicGeneratorOutput} (whose `type` is a plain
 * string) onto the SEO {@link GeneratorOutput} union the public pages expect.
 */
function toSeoOutput(o: PublicGeneratorOutput): GeneratorOutput {
  return { ...o, type: o.type as GeneratorOutput["type"] };
}

export class DefaultGeneratorEngine {
  constructor(private clientManager = aiClientManager) {}

  /**
   * Shared AI-with-local-fallback flow for every generator (#1494). When AI is
   * requested (`useAI !== false`) we try the AI path and, on any failure, fall
   * back to the local tables while stamping `aiFallback` so the UI can surface a
   * friendly "AI was unavailable" notice. When AI is not requested we go
   * straight to local with no flag.
   */
  private async runWithAIFallback(
    useAI: boolean | undefined,
    aiAttempt: () => Promise<PublicGeneratorOutput>,
    local: () => PublicGeneratorOutput,
  ): Promise<GeneratorOutput> {
    if (useAI !== false) {
      try {
        return toSeoOutput(await aiAttempt());
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
        return toSeoOutput({ ...local(), aiFallback: true });
      }
    }
    return toSeoOutput(local());
  }

  generateName(): string {
    return _generateName();
  }

  /**
   * NPC generation now delegates to the generator-engine package (#1351). AI
   * orchestration stays here at the call site: build the prompt in the package,
   * run it through the AI client, parse the result, fall back to the package's
   * local generator when AI is unavailable or fails.
   */
  async generateNPC(
    options: NpcGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...npcOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildNpcPrompt(
          npcOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseNpcResponse(text, npcOptions, resolved);
      },
      () => generateNpcLocal(npcOptions),
    );
  }

  /** Faction generation delegates to the generator-engine package (#1351). */
  async generateFaction(
    options: FactionGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...factionOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildFactionPrompt(
          factionOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseFactionResponse(text, resolved);
      },
      () => generateFactionLocal(factionOptions),
    );
  }

  /** Vampire clan generation delegates to the generator-engine package (#1351). */
  async generateVampireClan(
    options: VampireGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...vampireOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildVampirePrompt(
          vampireOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseVampireResponse(text, resolved);
      },
      () => generateVampireLocal(vampireOptions),
    );
  }

  /** Settlement generation delegates to the generator-engine package (#1351). */
  async generateSettlement(
    options: SettlementGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...settlementOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildSettlementPrompt(settlementOptions, getSessionContext());
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseSettlementResponse(text, resolved);
      },
      () => generateSettlementLocal(settlementOptions),
    );
  }

  /** Magic item generation delegates to the generator-engine package (#1351). */
  async generateMagicItem(
    options: MagicItemGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...itemOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildMagicItemPrompt(itemOptions, getSessionContext());
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseMagicItemResponse(text, resolved);
      },
      () => generateMagicItemLocal(itemOptions),
    );
  }

  async generateQuestHook(
    options: QuestGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...questOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildQuestPrompt(
          questOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseQuestResponse(text, resolved);
      },
      () => generateQuestLocal(questOptions),
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
        const { systemInstruction, userMessage, resolved } =
          buildNamesPrompt(nameOptions);
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseNamesResponse(text, resolved);
      },
      () => generateNamesLocal(nameOptions),
    );
  }

  async generateSocialHub(
    options: SocialHubGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...hubOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildSocialHubPrompt(
          hubOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseSocialHubResponse(text);
      },
      () => generateSocialHubLocal(hubOptions),
    );
  }

  async generateTavern(
    options: TavernGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...tavernOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildTavernPrompt(
          tavernOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parseTavernResponse(text);
      },
      () => generateTavernLocal(tavernOptions),
    );
  }

  async generateKingdom(
    options: KingdomGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...kingdomOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildKingdomPrompt(
          kingdomOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildNationPrompt(
          nationOptions,
          getSessionContext(),
        );
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildPantheonPrompt(pantheonOptions, getSessionContext());
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return parsePantheonResponse(text, resolved);
      },
      () => generatePantheonLocal(pantheonOptions),
    );
  }
}

export const generatorEngine = new DefaultGeneratorEngine();
