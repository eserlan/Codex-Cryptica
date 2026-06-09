import { aiClientManager } from "$lib/services/ai/client-manager";

export {
  nameTable,
  nameGeneratorConfig,
  type GeneratorOutput,
  pickFrom,
  getRandomItems,
  generateName,
} from "./generators/base";
export { npcConfig, npcThemeConfig } from "./generators/npc";
export {
  factionConfig,
  themeIdToLabel,
  vampireConfig,
} from "./generators/faction";
export { settlementConfig } from "./generators/settlement";
export { magicItemConfig } from "./generators/magic-item";
export { questConfig } from "./generators/quest";
export { socialHubConfig } from "./generators/social-hub";
export { nationConfig, kingdomConfig } from "./generators/kingdom-nation";

import { generateName as _generateName } from "./generators/base";
import { generateNPC } from "./generators/npc";
import { generateFaction, generateVampireClan } from "./generators/faction";
import { generateSettlement } from "./generators/settlement";
import { generateMagicItem } from "./generators/magic-item";
import { generateQuestHook } from "./generators/quest";
import { generateNames } from "./generators/names";
import { generateSocialHub, generateTavern } from "./generators/social-hub";
import { generateKingdom, generateNation } from "./generators/kingdom-nation";
import type { GeneratorOutput } from "./generators/base";

export class DefaultGeneratorEngine {
  constructor(private clientManager = aiClientManager) {}

  generateName(): string {
    return _generateName();
  }

  async generateNPC(
    options: Parameters<typeof generateNPC>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateNPC(this.clientManager, options);
  }

  async generateFaction(
    options: Parameters<typeof generateFaction>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateFaction(this.clientManager, options);
  }

  async generateVampireClan(
    options: Parameters<typeof generateVampireClan>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateVampireClan(this.clientManager, options);
  }

  async generateSettlement(
    options: Parameters<typeof generateSettlement>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateSettlement(this.clientManager, options);
  }

  async generateMagicItem(
    options: Parameters<typeof generateMagicItem>[1] = {},
  ): Promise<GeneratorOutput> {
    return generateMagicItem(this.clientManager, options);
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
}

export const generatorEngine = new DefaultGeneratorEngine();
