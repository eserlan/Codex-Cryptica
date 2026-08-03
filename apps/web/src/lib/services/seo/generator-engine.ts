import { aiClientManager } from "@codex/ai-engine";
import { classifyApiError } from "@codex/ai-engine";
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
  buildNomadClanPrompt,
  parseNomadClanResponse,
  generateNomadClanLocal,
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
  buildWorldPrompt,
  parseWorldResponse,
  generateWorldLocal,
  BANNED_NAMES,
  type NpcGeneratorOptions,
  type MagicItemGeneratorOptions,
  type FactionGeneratorOptions,
  type VampireGeneratorOptions,
  type NomadClanGeneratorOptions,
  type SocialHubGeneratorOptions,
  type TavernGeneratorOptions,
  type QuestGeneratorOptions,
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
  type WorldGeneratorOptions,
  type PublicGeneratorOutput,
  languageConfig,
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
// Faction + vampire + nomad + settlement content data now live in the package (#1351).
export {
  factionConfig,
  themeIdToLabel,
  vampireConfig,
  nomadClanConfig,
} from "generator-engine";
export { settlementConfig } from "generator-engine";
// Magic item content data now lives in the package (#1351).
export { magicItemConfig } from "generator-engine";
export { questConfig, themeToQuestGenre } from "generator-engine";
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
export { worldConfig } from "generator-engine";

import { generateName as _generateName } from "./generator-helpers";
import type { GeneratorOutput } from "./generator-helpers";

/**
 * Bridge the package's {@link PublicGeneratorOutput} (whose `type` is a plain
 * string) onto the SEO {@link GeneratorOutput} union the public pages expect.
 */
function toSeoOutput(o: PublicGeneratorOutput): GeneratorOutput {
  return { ...o, type: o.type as GeneratorOutput["type"] };
}

/** Single source of truth for the generator model id (#1494). */
const GENERATOR_MODEL_ID = "gemini-3.5-flash-lite";
const LANGUAGE_GENERATION_CONFIG = {
  temperature: 0.35,
  topP: 0.8,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

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
        // Distinguish routine, user-facing failure classes (offline, rate
        // limits, quota, safety) from a genuine AI-pipeline defect (e.g. an
        // unparseable response). Both fall back to local tables, but an
        // "unknown" error is logged at error level so real regressions are not
        // masked behind a warn (#1494 review follow-up).
        const { type } = classifyApiError(err);
        if (type === "unknown") {
          console.error(
            "AI generation failed unexpectedly, falling back to local tables:",
            err,
          );
        } else {
          console.warn(
            `AI generation unavailable (${type}), falling back to local tables.`,
          );
        }
        return toSeoOutput({ ...local(), aiFallback: true });
      }
    }
    return toSeoOutput(local());
  }

  /**
   * Shared AI call: resolve the model once (single source for the model id),
   * run the prompt, and return trimmed text. Each generator keeps its own
   * prompt builder and response parser; only this transport is shared (#1494).
   */
  private async runModel(
    systemInstruction: string,
    userMessage: string,
    generationConfig?: typeof LANGUAGE_GENERATION_CONFIG,
  ): Promise<string> {
    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL_ID,
      systemInstruction,
    );
    const response = await model.generateContent(
      generationConfig
        ? {
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig,
          }
        : userMessage,
    );
    return response.response.text().trim();
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildFactionPrompt(
          factionOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildVampirePrompt(
          vampireOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildNomadClanPrompt(nomadOptions, getSessionContext());
        const text = await this.runModel(systemInstruction, userMessage);
        return parseNomadClanResponse(text, resolved);
      },
      () => generateNomadClanLocal(nomadOptions),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildMagicItemPrompt(itemOptions, getSessionContext());
        const text = await this.runModel(systemInstruction, userMessage);
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
        const text = await this.runModel(systemInstruction, userMessage);
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildSocialHubPrompt(
          hubOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildTavernPrompt(
          tavernOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildKingdomPrompt(
          kingdomOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildNationPrompt(
          nationOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildPantheonPrompt(pantheonOptions, getSessionContext());
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildShipPrompt(
          shipOptions,
          getSessionContext(),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildLanguagePrompt(
            langOptions,
            getSessionContext({ excludeLanguageDrafts: true }),
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
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage } = buildNewsSheetPrompt(
          sheetOptions,
          getSessionContext(),
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
        const { systemInstruction, userMessage, resolved } =
          buildDungeonPrompt(dungeonOptions);
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
        const { systemInstruction, userMessage, resolved } =
          buildAdventurePrompt(adventureOptions);
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

  /** World generation delegates to the shared offline-first generator package. */
  async generateWorld(
    options: WorldGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...worldOptions } = options;
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
}

export const generatorEngine = new DefaultGeneratorEngine();
