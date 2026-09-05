import { aiClientManager } from "@codex/ai-engine";
import {
  buildNpcPrompt,
  parseNpcResponse,
  generateNpcLocal,
  buildMagicItemPrompt,
  parseMagicItemResponse,
  generateMagicItemLocal,
  buildMinorMagicItemPrompt,
  parseMinorMagicItemResponse,
  generateMinorMagicItemLocal,
  buildArtifactPrompt,
  parseArtifactResponse,
  generateArtifactLocal,
  buildFactionPrompt,
  parseFactionResponse,
  generateFactionLocal,
  buildVampirePrompt,
  parseVampireResponse,
  generateVampireLocal,
  buildNomadClanPrompt,
  parseNomadClanResponse,
  generateNomadClanLocal,
  buildDarkFactionPrompt,
  parseDarkFactionResponse,
  generateDarkFactionLocal,
  buildSocialHubPrompt,
  parseSocialHubResponse,
  generateSocialHubLocal,
  buildTavernPrompt,
  parseTavernResponse,
  generateTavernLocal,
  buildQuestPrompt,
  parseQuestResponse,
  generateQuestLocal,
  buildRumourPrompt,
  parseRumourResponse,
  generateRumourLocal,
  buildEncounterPrompt,
  parseEncounterResponse,
  generateEncounterLocal,
  buildPuzzlePrompt,
  parsePuzzleResponse,
  generatePuzzleLocal,
  buildVillainPrompt,
  parseVillainResponse,
  generateVillainLocal,
  buildCouncilVoteFoundationPrompt,
  buildCouncilVoteFoundationRepairPrompt,
  parseCouncilVoteFoundation,
  buildCouncilVotePathsPrompt,
  buildCouncilVotePathsRepairPrompt,
  parseCouncilVotePathsResponse,
  mergeCouncilVoteOutput,
  generateCouncilVoteLocal,
  buildHeistPrompt,
  parseHeistResponse,
  generateHeistLocal,
  buildSecretSocietyPrompt,
  parseSecretSocietyResponse,
  generateSecretSocietyLocal,
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
  buildShipPrompt,
  parseShipResponse,
  generateShipLocal,
  buildLanguagePrompt,
  buildLanguageRepairPrompt,
  classifyAILanguageQuality,
  parseLanguageGenerationResult,
  parseLanguageResponse,
  generateLanguageLocal,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
  buildNewsSheetPrompt,
  parseNewsSheetResponse,
  generateNewsSheetLocal,
  buildDungeonPrompt,
  buildDungeonRetryMessage,
  parseDungeonResponseDetailed,
  generateDungeonLocal,
  buildAdventurePrompt,
  buildAdventureRetryMessage,
  parseAdventureResponseDetailed,
  generateAdventureLocal,
  buildPlotTwistPrompt,
  parsePlotTwistResponse,
  generatePlotTwistLocal,
  buildWorldPrompt,
  parseWorldResponse,
  generateWorldLocal,
  buildStarSystemPrompt,
  parseStarSystemResponse,
  generateStarSystemLocal,
  buildAlienRacePrompt,
  parseAlienRaceResponse,
  generateAlienRaceLocal,
  buildCreaturePrompt,
  parseCreatureResponse,
  generateCreatureLocal,
  BANNED_NAMES,
  type NpcGeneratorOptions,
  type MagicItemGeneratorOptions,
  type MinorMagicItemGeneratorOptions,
  type ArtifactGeneratorOptions,
  type FactionGeneratorOptions,
  type VampireGeneratorOptions,
  type NomadClanGeneratorOptions,
  type DarkFactionGeneratorOptions,
  type SocialHubGeneratorOptions,
  type TavernGeneratorOptions,
  type QuestGeneratorOptions,
  type RumourGeneratorOptions,
  type EncounterGeneratorOptions,
  type PuzzleGeneratorOptions,
  type VillainGeneratorOptions,
  type CouncilVoteGeneratorOptions,
  type HeistGeneratorOptions,
  type SecretSocietyGeneratorOptions,
  type SettlementGeneratorOptions,
  type KingdomGeneratorOptions,
  type NationGeneratorOptions,
  type PantheonGeneratorOptions,
  type NamesGeneratorOptions,
  type ShipGeneratorOptions,
  type LanguageGeneratorOptions,
  type NewsSheetGeneratorOptions,
  type DungeonGeneratorOptions,
  type AdventureGeneratorOptions,
  type PlotTwistGeneratorOptions,
  type WorldGeneratorOptions,
  type StarSystemGeneratorOptions,
  type AlienRaceGeneratorOptions,
  type CreatureGeneratorOptions,
  type PublicGeneratorOutput,
  languageConfig,
} from "generator-engine";
import { getSessionContext } from "./session-context";
import { villainDomainHistoryStore } from "./villain-domain-history";
import {
  generationInputHistoryStore,
  summarizeResolvedInputs,
  formatRecentInputsNote,
} from "./generation-input-history";
import {
  GeneratorAITransport,
  LANGUAGE_GENERATION_CONFIG,
} from "./generator-ai-transport";

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
export {
  factionConfig,
  themeIdToLabel,
  vampireConfig,
  nomadClanConfig,
  darkFactionConfig,
  resolveFaction,
  resolveNomadClan,
  resolveVampire,
  resolveDarkFaction,
  factionSchema,
  nomadClanSchema,
  vampireSchema,
  darkFactionSchema,
  FACTION_PRESETS,
  NOMAD_CLAN_PRESETS,
  VAMPIRE_PRESETS,
} from "generator-engine";
export {
  settlementConfig,
  SETTLEMENT_PRESETS,
  SETTLEMENT_LEXICON,
  settlementSchema,
  presetsFor,
  analyseIntent,
  applyIntent,
  resolveSmart,
  type InferredChoice,
} from "generator-engine";
// Magic item content data now lives in the package (#1351).
export { magicItemConfig } from "generator-engine";
export { minorMagicItemConfig } from "generator-engine";
export { artifactConfig } from "generator-engine";
export { questConfig, themeToQuestGenre } from "generator-engine";
export { rumourConfig } from "generator-engine";
export { encounterConfig } from "generator-engine";
export { puzzleConfig } from "generator-engine";
export { villainConfig } from "generator-engine";
export { councilVoteConfig } from "generator-engine";
export { heistConfig } from "generator-engine";
export { secretSocietyConfig } from "generator-engine";
export { socialHubConfig } from "generator-engine";
export { kingdomConfig } from "generator-engine";
export { nationConfig } from "generator-engine";
export { pantheonConfig } from "generator-engine";
export { nameGeneratorConfig } from "generator-engine";
export { shipConfig } from "generator-engine";
export { languageConfig } from "generator-engine";
export { newsSheetConfig } from "generator-engine";
export { dungeonConfig, forDungeonGenre } from "generator-engine";
export { adventureConfig, forAdventureGenre } from "generator-engine";
export { plotTwistConfig } from "generator-engine";
export { worldConfig } from "generator-engine";
export { starSystemConfig } from "generator-engine";
export { alienRaceConfig } from "generator-engine";
export { creatureConfig } from "generator-engine";

import { generateName as _generateName } from "./generator-helpers";
import type { GeneratorOutput } from "./generator-helpers";

export class DefaultGeneratorEngine {
  private transport: GeneratorAITransport;

  constructor(private clientManager = aiClientManager) {
    this.transport = new GeneratorAITransport(clientManager);
  }

  async generateWithPreview<T>(
    generate: () => Promise<T>,
    onPreview: (text: string) => void,
  ): Promise<T> {
    return this.transport.generateWithPreview(generate, onPreview);
  }

  private runWithAIFallback(
    useAI: boolean | undefined,
    aiAttempt: () => Promise<PublicGeneratorOutput>,
    local: () => PublicGeneratorOutput,
  ): Promise<GeneratorOutput> {
    return this.transport.runWithAIFallback(useAI, aiAttempt, local);
  }

  private runModel(
    systemInstruction: string,
    userMessage: string,
    generationConfig?: typeof LANGUAGE_GENERATION_CONFIG,
  ): Promise<string> {
    return this.transport.runModel(
      systemInstruction,
      userMessage,
      generationConfig,
    );
  }

  private startChat(systemInstruction: string) {
    return this.transport.startChat(systemInstruction);
  }

  private sendChatMessage(
    chat: Awaited<ReturnType<GeneratorAITransport["startChat"]>>,
    userMessage: string,
  ): Promise<string> {
    return this.transport.sendChatMessage(chat, userMessage);
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
    const recentInputs = generationInputHistoryStore.recent("npc");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildNpcPrompt(
          npcOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "npc",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
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
    const recentInputs = generationInputHistoryStore.recent("faction");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildFactionPrompt(
          factionOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "faction",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
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
    const recentInputs = generationInputHistoryStore.recent("vampire-clan");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildVampirePrompt(
          vampireOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "vampire-clan",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseVampireResponse(text, resolved);
      },
      () => generateVampireLocal(vampireOptions),
    );
  }

  /** Nomad clan generation delegates to the generator-engine package (#1570). */
  async generateNomadClan(
    options: NomadClanGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...nomadOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("nomad-clan");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildNomadClanPrompt(
            nomadOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "nomad-clan",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseNomadClanResponse(text, resolved);
      },
      () => generateNomadClanLocal(nomadOptions),
    );
  }

  /** Dark fantasy / grimdark faction generation delegates to the generator-engine package (#1136). */
  async generateDarkFaction(
    options: DarkFactionGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...darkFactionOptions } = options;
    const recentInputs = generationInputHistoryStore.recent(
      "dark-fantasy-faction",
    );
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildDarkFactionPrompt(
            darkFactionOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "dark-fantasy-faction",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseDarkFactionResponse(text, resolved);
      },
      () => generateDarkFactionLocal(darkFactionOptions),
    );
  }

  /** Settlement generation delegates to the generator-engine package (#1351). */
  async generateSettlement(
    options: SettlementGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...settlementOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("settlement");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildSettlementPrompt(
            settlementOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "settlement",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
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
    const recentInputs = generationInputHistoryStore.recent("magic-item");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildMagicItemPrompt(
            itemOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "magic-item",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseMagicItemResponse(text, resolved);
      },
      () => generateMagicItemLocal(itemOptions),
    );
  }

  async generateMinorMagicItem(
    options: MinorMagicItemGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...itemOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("minor-magic-item");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildMinorMagicItemPrompt(
            itemOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "minor-magic-item",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseMinorMagicItemResponse(text, resolved);
      },
      () => generateMinorMagicItemLocal(itemOptions),
    );
  }

  async generateArtifact(
    options: ArtifactGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...artifactOptions } = options;
    const recentInputs =
      generationInputHistoryStore.recent("artifact-generator");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildArtifactPrompt(
            artifactOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "artifact-generator",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseArtifactResponse(text, resolved);
      },
      () => generateArtifactLocal(artifactOptions),
    );
  }

  async generateQuestHook(
    options: QuestGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...questOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("quest");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildQuestPrompt(
          questOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "quest",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseQuestResponse(text, resolved);
      },
      () => generateQuestLocal(questOptions),
    );
  }

  async generateRumour(
    options: RumourGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...rumourOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("rumour");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildRumourPrompt(
          rumourOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "rumour",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseRumourResponse(text, resolved);
      },
      () => generateRumourLocal(rumourOptions),
    );
  }

  async generateEncounter(
    options: EncounterGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...encounterOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("encounter");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildEncounterPrompt(
            encounterOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "encounter",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseEncounterResponse(text, resolved);
      },
      () => generateEncounterLocal(encounterOptions),
    );
  }

  async generatePuzzle(
    options: PuzzleGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...puzzleOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("puzzle");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildPuzzlePrompt(
          puzzleOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "puzzle",
          summarizeResolvedInputs(resolved),
        );
        return parsePuzzleResponse(
          await this.runModel(systemInstruction, userMessage),
          resolved,
        );
      },
      () => generatePuzzleLocal(puzzleOptions),
    );
  }

  async generateVillain(
    options: VillainGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...villainOptions } = options;
    const recentDomains = villainDomainHistoryStore.recent();
    const recentInputs = generationInputHistoryStore.recent("villain");
    const result = await this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildVillainPrompt(
          villainOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
          undefined,
          recentDomains,
        );
        generationInputHistoryStore.record(
          "villain",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseVillainResponse(text, resolved);
      },
      () => generateVillainLocal(villainOptions),
    );
    villainDomainHistoryStore.record(result.conflictDomain);
    return result;
  }

  async generateHeist(
    options: HeistGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...heistOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("heist");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildHeistPrompt(
          heistOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "heist",
          summarizeResolvedInputs(resolved),
        );
        return parseHeistResponse(
          await this.runModel(systemInstruction, userMessage),
          resolved,
        );
      },
      () => generateHeistLocal(heistOptions),
    );
  }

  async generateCouncilVote(
    options: CouncilVoteGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...councilVoteOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("council-vote");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const {
          systemInstruction,
          userMessage: foundationMessage,
          resolved,
        } = buildCouncilVoteFoundationPrompt(
          councilVoteOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "council-vote",
          summarizeResolvedInputs(resolved),
        );
        const chat = await this.startChat(systemInstruction);

        const foundationText = await this.sendChatMessage(
          chat,
          foundationMessage,
        );
        // A malformed repair reply keeps the pre-repair foundation/paths
        // rather than discarding an otherwise-good generation over a
        // cleanup step (mirrors the in-app service's same fallback).
        // parseCouncilVoteFoundation/parseCouncilVotePathsResponse default
        // missing fields to "" instead of throwing, so a syntactically valid
        // but empty repair reply must be rejected explicitly here — the
        // try/catch alone only catches genuinely unparseable JSON.
        let foundation = parseCouncilVoteFoundation(foundationText, resolved);
        try {
          const repairText = await this.sendChatMessage(
            chat,
            buildCouncilVoteFoundationRepairPrompt(resolved.genre),
          );
          const repaired = parseCouncilVoteFoundation(repairText, resolved);
          if (repaired.content.trim() && repaired.lore.trim()) {
            foundation = repaired;
          }
        } catch {
          // Keep the unrepaired foundation.
        }

        const { userMessage: pathsMessage } = buildCouncilVotePathsPrompt();
        const pathsText = await this.sendChatMessage(chat, pathsMessage);
        let paths = parseCouncilVotePathsResponse(pathsText);
        try {
          const pathsRepairText = await this.sendChatMessage(
            chat,
            buildCouncilVotePathsRepairPrompt(),
          );
          const pathsRepaired = parseCouncilVotePathsResponse(pathsRepairText);
          if (
            pathsRepaired.possiblePaths.trim() &&
            pathsRepaired.followUpHooks.trim()
          ) {
            paths = pathsRepaired;
          }
        } catch {
          // Keep the unrepaired paths.
        }

        return mergeCouncilVoteOutput(foundation, paths);
      },
      () => generateCouncilVoteLocal(councilVoteOptions),
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
        const assess = (
          raw: string,
        ): {
          output?: PublicGeneratorOutput;
          blockingIssues: string[];
          advisoryIssues: string[];
          issues: string[];
        } => {
          try {
            const output = parseLanguageResponse(raw);
            const result = parseLanguageGenerationResult({
              version: output.languageProfileVersion,
              title: output.title,
              summary: output.summary,
              labels: output.labels,
              profile: output.languageProfile,
            });
            const quality = classifyAILanguageQuality(result);
            const blockingIssues = [
              ...quality.blockingIssues,
              ...validateLanguageInputFidelity(result, expected).issues,
              ...validateLanguageNameBans(result, resolved.bannedNames ?? [])
                .issues,
            ];
            const advisoryIssues = quality.advisoryIssues;
            return {
              output,
              blockingIssues,
              advisoryIssues,
              issues: [...blockingIssues, ...advisoryIssues],
            };
          } catch (error) {
            const blockingIssues = [
              error instanceof Error
                ? `Structural validation failed: ${error.message}`
                : "Structural validation failed.",
            ];
            return {
              blockingIssues,
              advisoryIssues: [],
              issues: blockingIssues,
            };
          }
        };

        const initialRaw = await this.runModel(
          systemInstruction,
          userMessage,
          LANGUAGE_GENERATION_CONFIG,
        );
        const initial = assess(initialRaw);
        if (initial.output && initial.issues.length === 0) {
          return initial.output;
        }

        let candidateRaw = initialRaw;
        let candidate = initial;
        let lastAcceptableOutput =
          initial.output && initial.blockingIssues.length === 0
            ? initial.output
            : undefined;
        const repairBudget = initial.blockingIssues.length ? 2 : 1;
        for (
          let repairAttempt = 0;
          repairAttempt < repairBudget;
          repairAttempt += 1
        ) {
          try {
            const repairRaw = await this.runModel(
              systemInstruction,
              buildLanguageRepairPrompt(
                candidateRaw,
                candidate.issues,
                userMessage,
              ),
              LANGUAGE_GENERATION_CONFIG,
            );
            candidateRaw = repairRaw;
            candidate = assess(repairRaw);
            if (candidate.output && candidate.issues.length === 0) {
              return candidate.output;
            }
            if (candidate.output && candidate.blockingIssues.length === 0) {
              lastAcceptableOutput = candidate.output;
              break;
            }
          } catch {
            // Preserve the last parseable candidate for the remaining repair.
          }
        }
        if (lastAcceptableOutput) return lastAcceptableOutput;
        throw new Error(
          `AI language output failed validation: ${candidate.issues.join(" ")}`,
        );
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

  /** Dungeon & Delve generation delegates to the generator-engine package. */
  async generateDungeon(
    options: DungeonGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...dungeonOptions } = options;
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
        const text = await this.runModel(systemInstruction, userMessage);
        const first = parseDungeonResponseDetailed(
          text,
          dungeonOptions,
          undefined,
          resolved,
        );
        if (first.problems.length === 0) return first.output;

        // Tell the model exactly what it got wrong and let it try once more.
        // A single retry: two calls is an acceptable cost for a usable result,
        // an unbounded loop is not. If the retry also fails, `first.output` is
        // the locally-resolved dungeon the prompt was built from.
        const retryText = await this.runModel(
          systemInstruction,
          buildDungeonRetryMessage(userMessage, first.problems),
        );
        const second = parseDungeonResponseDetailed(
          retryText,
          dungeonOptions,
          undefined,
          resolved,
        );
        if (second.problems.length === 0) return second.output;

        // Neither attempt was clean. Prefer whichever is still the model's own
        // work over the local foundation — a response missing one field, with
        // that field patched, beats a whole dungeon of table prose.
        if (!second.rejected) return second.output;
        return first.output;
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
        const first = parseAdventureResponseDetailed(
          text,
          adventureOptions,
          undefined,
          resolved,
        );
        if (first.problems.length === 0) return first.output;

        const retryText = await this.runModel(
          systemInstruction,
          buildAdventureRetryMessage(userMessage, first.problems),
        );
        const second = parseAdventureResponseDetailed(
          retryText,
          adventureOptions,
          undefined,
          resolved,
        );
        if (second.problems.length === 0) return second.output;

        if (!second.rejected) return second.output;
        return first.output;
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
    const { useAI, ...worldOptions } = options;
    // buildWorldPrompt's WorldPrompt return type has no `resolved` field
    // (it resolves options inline without exposing them), so it's not
    // wired into generationInputHistoryStore.
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } =
          buildWorldPrompt(worldOptions);
        const text = await this.runModel(systemInstruction, userMessage);
        return parseWorldResponse(text, [
          ...BANNED_NAMES,
          ...(worldOptions.avoidNames ?? []),
        ]);
      },
      () =>
        generateWorldLocal({
          ...worldOptions,
          avoidNames: [...BANNED_NAMES, ...(worldOptions.avoidNames ?? [])],
        }),
    );
  }

  /** Star system generation delegates to the shared offline-first generator package. */
  async generateStarSystem(
    options: StarSystemGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...starSystemOptions } = options;
    // buildStarSystemPrompt's StarSystemPrompt return type has no `resolved`
    // field, so it's not wired into generationInputHistoryStore.
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } =
          buildStarSystemPrompt(starSystemOptions);
        const text = await this.runModel(systemInstruction, userMessage);
        return parseStarSystemResponse(text, [
          ...BANNED_NAMES,
          ...(starSystemOptions.avoidNames ?? []),
        ]);
      },
      () =>
        generateStarSystemLocal({
          ...starSystemOptions,
          avoidNames: [
            ...BANNED_NAMES,
            ...(starSystemOptions.avoidNames ?? []),
          ],
        }),
    );
  }

  /** Alien race generation delegates to the shared offline-first generator package. */
  async generateAlienRace(
    options: AlienRaceGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...alienRaceOptions } = options;
    // buildAlienRacePrompt's AlienRacePrompt return type has no `resolved`
    // field, so it's not wired into generationInputHistoryStore.
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } =
          buildAlienRacePrompt(alienRaceOptions);
        const text = await this.runModel(systemInstruction, userMessage);
        return parseAlienRaceResponse(text, [
          ...BANNED_NAMES,
          ...(alienRaceOptions.avoidNames ?? []),
        ]);
      },
      () =>
        generateAlienRaceLocal({
          ...alienRaceOptions,
          avoidNames: [...BANNED_NAMES, ...(alienRaceOptions.avoidNames ?? [])],
        }),
    );
  }

  /** Creature generation delegates to the shared offline-first generator package. */
  async generateCreature(
    options: CreatureGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...creatureOptions } = options;
    const historyNote = formatRecentInputsNote(
      generationInputHistoryStore.recent("creature"),
    );
    const sessionContext = [getSessionContext(), historyNote]
      .filter(Boolean)
      .join("\n\n");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildCreaturePrompt(creatureOptions, sessionContext);
        const text = await this.runModel(systemInstruction, userMessage);
        generationInputHistoryStore.record(
          "creature",
          summarizeResolvedInputs(resolved),
        );
        return parseCreatureResponse(text, resolved);
      },
      () =>
        generateCreatureLocal({
          ...creatureOptions,
          avoidNames: [...BANNED_NAMES, ...(creatureOptions.avoidNames ?? [])],
        }),
    );
  }
}

export const generatorEngine = new DefaultGeneratorEngine();
