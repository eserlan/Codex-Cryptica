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
  buildSettlementPrompt,
  parseSettlementResponse,
  generateSettlementLocal,
  type NpcGeneratorOptions,
  type MagicItemGeneratorOptions,
  type FactionGeneratorOptions,
  type VampireGeneratorOptions,
  type SettlementGeneratorOptions,
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
export { questConfig, themeToQuestGenre } from "./generators/quest";
export { socialHubConfig } from "./generators/social-hub";
export { nationConfig, kingdomConfig } from "./generators/kingdom-nation";
export { pantheonConfig } from "./generators/pantheon";

import { generateName as _generateName } from "./generators/base";
import { generateQuestHook } from "./generators/quest";
import { generateNames } from "./generators/names";
import { generateSocialHub, generateTavern } from "./generators/social-hub";
import { generateKingdom, generateNation } from "./generators/kingdom-nation";
import { generatePantheon } from "./generators/pantheon";
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
    options: Parameters<typeof generateQuestHook>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateQuestHook(this.clientManager, options);
  }

  async generateNames(
    options: Parameters<typeof generateNames>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateNames(this.clientManager, options);
  }

  async generateSocialHub(
    options: Parameters<typeof generateSocialHub>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateSocialHub(this.clientManager, options);
  }

  async generateTavern(
    options: Parameters<typeof generateTavern>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateTavern(this.clientManager, options);
  }

  async generateKingdom(
    options: Parameters<typeof generateKingdom>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateKingdom(this.clientManager, options);
  }

  async generateNation(
    options: Parameters<typeof generateNation>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateNation(this.clientManager, options);
  }

  async generatePantheon(
    options: Parameters<typeof generatePantheon>[1] = {},
  ): Promise<GeneratorOutput> {
    return generatePantheon(this.clientManager, options);
  }
}

export const generatorEngine = new DefaultGeneratorEngine();
