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
  type PublicGeneratorOutput,
} from "generator-engine";
import { getSessionContext } from "./generators/session-context";

export {
  nameTable,
  nameGeneratorConfig,
  type GeneratorOutput,
  pickFrom,
  getRandomItems,
  generateName,
} from "./generators/base";
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

import { generateName as _generateName } from "./generators/base";
import { generateNames } from "./generators/names";
import type { GeneratorOutput } from "./generators/base";

/**
 * Bridge the package's {@link PublicGeneratorOutput} (whose `type` is a plain
 * string) onto the SEO {@link GeneratorOutput} union the public pages expect.
 */
function toSeoOutput(o: PublicGeneratorOutput): GeneratorOutput {
  return { ...o, type: o.type as GeneratorOutput["type"] };
}

export class DefaultGeneratorEngine {
  constructor(private clientManager = aiClientManager) {}

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
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseNpcResponse(text, npcOptions, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateNpcLocal(npcOptions));
  }

  /** Faction generation delegates to the generator-engine package (#1351). */
  async generateFaction(
    options: FactionGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...factionOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseFactionResponse(text, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateFactionLocal(factionOptions));
  }

  /** Vampire clan generation delegates to the generator-engine package (#1351). */
  async generateVampireClan(
    options: VampireGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...vampireOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseVampireResponse(text, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateVampireLocal(vampireOptions));
  }

  /** Settlement generation delegates to the generator-engine package (#1351). */
  async generateSettlement(
    options: SettlementGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...settlementOptions } = options;
    if (useAI !== false) {
      try {
        const { systemInstruction, userMessage, resolved } =
          buildSettlementPrompt(settlementOptions, getSessionContext());
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return toSeoOutput(parseSettlementResponse(text, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateSettlementLocal(settlementOptions));
  }

  /** Magic item generation delegates to the generator-engine package (#1351). */
  async generateMagicItem(
    options: MagicItemGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...itemOptions } = options;
    if (useAI !== false) {
      try {
        const { systemInstruction, userMessage, resolved } =
          buildMagicItemPrompt(itemOptions, getSessionContext());
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return toSeoOutput(parseMagicItemResponse(text, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateMagicItemLocal(itemOptions));
  }

  async generateQuestHook(
    options: QuestGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...questOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseQuestResponse(text, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateQuestLocal(questOptions));
  }

  async generateNames(
    options: Parameters<typeof generateNames>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateNames(this.clientManager, options);
  }

  async generateSocialHub(
    options: SocialHubGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...hubOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseSocialHubResponse(text));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateSocialHubLocal(hubOptions));
  }

  async generateTavern(
    options: TavernGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...tavernOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseTavernResponse(text));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateTavernLocal(tavernOptions));
  }

  async generateKingdom(
    options: KingdomGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...kingdomOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseKingdomResponse(text));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateKingdomLocal(kingdomOptions));
  }

  /** Nation generation delegates to the generator-engine package (#1351). */
  async generateNation(
    options: NationGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...nationOptions } = options;
    if (useAI !== false) {
      try {
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
        return toSeoOutput(parseNationResponse(text));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generateNationLocal(nationOptions));
  }

  /** Pantheon generation delegates to the generator-engine package (#1351). */
  async generatePantheon(
    options: PantheonGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...pantheonOptions } = options;
    if (useAI !== false) {
      try {
        const { systemInstruction, userMessage, resolved } =
          buildPantheonPrompt(pantheonOptions, getSessionContext());
        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        return toSeoOutput(parsePantheonResponse(text, resolved));
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }
    return toSeoOutput(generatePantheonLocal(pantheonOptions));
  }
}

export const generatorEngine = new DefaultGeneratorEngine();
