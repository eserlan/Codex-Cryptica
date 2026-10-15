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
  buildComicBookEventPrompt,
  parseComicBookEventResponse,
  generateComicBookEventLocal,
  generateOneShotLocal,
  regenerateOneShotLocal,
  buildOneShotRegenPrompt,
  applyOneShotRegenResponse,
  oneShotToOutput,
  runOneShotStages,
  type OneShotProgressStep,
  type OneShotAdventure,
  type OneShotGeneratorOptions,
  type OneShotRegenResult,
  type OneShotRegenTarget,
  buildVillainSchemePrompt,
  parseVillainSchemeResponse,
  generateVillainSchemeLocal,
  buildPersonalityPrompt,
  parsePersonalityResponse,
  generatePersonalityLocal,
  buildHolidayPrompt,
  parseHolidayResponse,
  generateHolidayLocal,
  type HolidayGeneratorOptions,
  buildSettlementPrompt,
  parseSettlementResponse,
  generateSettlementLocal,
  type NpcGeneratorOptions,
  type MagicItemGeneratorOptions,
  type MinorMagicItemGeneratorOptions,
  type ArtifactGeneratorOptions,
  type FactionGeneratorOptions,
  type FactionRosterGeneratorOptions,
  type VampireGeneratorOptions,
  type NomadClanGeneratorOptions,
  type DarkFactionGeneratorOptions,
  type QuestGeneratorOptions,
  type RumourGeneratorOptions,
  type EncounterGeneratorOptions,
  type PuzzleGeneratorOptions,
  type VillainGeneratorOptions,
  type ComicBookEventGeneratorOptions,
  type VillainSchemeGeneratorOptions,
  type PersonalityGeneratorOptions,
  type SettlementGeneratorOptions,
} from "generator-engine";
import { getSessionContext } from "./session-context";
import { villainDomainHistoryStore } from "./villain-domain-history";
import {
  generationInputHistoryStore,
  summarizeResolvedInputs,
  formatRecentInputsNote,
} from "./generation-input-history";

import { generateName as _generateName } from "./generator-helpers";
import type { GeneratorOutput } from "./generator-helpers";
import { ONE_SHOT_GENERATION_CONFIG } from "./generator-ai-transport";

import { GeneratorEngineBase } from "./generator-engine-base";

export class GeneratorEngineCore extends GeneratorEngineBase {
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

  /** Faction generation delegates to the faction-generation service. */
  generateFaction(options: FactionGeneratorOptions & { useAI?: boolean } = {}) {
    return this.factionGeneration.generateFaction(options);
  }

  /** Faction roster generation (#2808): notable members of a faction. */
  generateFactionRoster(
    options: FactionRosterGeneratorOptions & { useAI?: boolean } = {},
  ) {
    return this.factionGeneration.generateFactionRoster(options);
  }

  generateVampireClan(
    options: VampireGeneratorOptions & { useAI?: boolean } = {},
  ) {
    return this.factionGeneration.generateVampireClan(options);
  }

  generateNomadClan(
    options: NomadClanGeneratorOptions & { useAI?: boolean } = {},
  ) {
    return this.factionGeneration.generateNomadClan(options);
  }

  generateDarkFaction(
    options: DarkFactionGeneratorOptions & { useAI?: boolean } = {},
  ) {
    return this.factionGeneration.generateDarkFaction(options);
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

  async generateHoliday(
    options: HolidayGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...holidayOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("holiday");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } = buildHolidayPrompt(
          holidayOptions,
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "holiday",
          summarizeResolvedInputs({
            genre: resolved.genre,
            scope: resolved.scope,
            tone: resolved.tone,
            count: resolved.count,
          }),
        );
        return parseHolidayResponse(
          await this.runModel(systemInstruction, userMessage),
          resolved,
        );
      },
      () => generateHolidayLocal(holidayOptions),
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

  async generatePersonality(
    options: PersonalityGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...personalityOptions } = options;
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildPersonalityPrompt(personalityOptions, "", getSessionContext());
        const text = await this.runModel(systemInstruction, userMessage);
        return parsePersonalityResponse(text, resolved);
      },
      () => generatePersonalityLocal(personalityOptions),
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

  async generateComicBookEvent(
    options: ComicBookEventGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...eventOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("comic-book-event");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildComicBookEventPrompt(
            eventOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "comic-book-event",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseComicBookEventResponse(text, resolved);
      },
      () => generateComicBookEventLocal(eventOptions),
    );
  }

  /**
   * One-shots are generated in stages (core, plan, finale, scenes and cast,
   * review) so each call stays short and each part is written knowing the
   * earlier ones. `onProgress` reports each step for the page to show. Only
   * a failed core or plan falls back to the local generator; a later part
   * that fails is written from templates and named in `aiPartialFallback`.
   */
  async generateOneShot(
    options: OneShotGeneratorOptions & {
      useAI?: boolean;
      onProgress?: (steps: OneShotProgressStep[]) => void;
    } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, onProgress, ...oneShotOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("one-shot");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const result = await runOneShotStages(
          oneShotOptions,
          {
            call: ({ systemInstruction, userMessage }) =>
              this.runModel(
                systemInstruction,
                userMessage,
                ONE_SHOT_GENERATION_CONFIG,
              ),
            onProgress,
          },
          getSessionContext() + formatRecentInputsNote(recentInputs),
        );
        generationInputHistoryStore.record(
          "one-shot",
          summarizeResolvedInputs(result.resolved),
        );
        return {
          ...oneShotToOutput(result.adventure),
          ...(result.reviewSkipped ? { aiReviewSkipped: true } : {}),
          ...(result.fallbackParts.length
            ? { aiPartialFallback: result.fallbackParts }
            : {}),
        };
      },
      () => generateOneShotLocal(oneShotOptions),
    );
  }

  /**
   * Regenerate one scene or NPC of a one-shot, leaving the rest alone. Falls
   * back to the local re-roll when AI is off, unavailable or replies badly.
   */
  async regenerateOneShotPart(
    adventure: OneShotAdventure,
    target: OneShotRegenTarget,
    options: {
      useAI?: boolean;
      instruction?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<OneShotRegenResult> {
    const local = () => regenerateOneShotLocal(adventure, target);
    if (!options.useAI) return local();
    try {
      const { systemInstruction, userMessage } = buildOneShotRegenPrompt(
        adventure,
        target,
        options.instruction,
      );
      const text = await this.runModel(
        systemInstruction,
        userMessage,
        undefined,
        true,
        options.signal,
      );
      return applyOneShotRegenResponse(adventure, target, text);
    } catch {
      // A random re-roll would silently ignore what the GM asked for.
      if (options.instruction?.trim()) {
        return {
          adventure,
          warnings: [
            "Couldn't reach the AI, so your change wasn't applied. Nothing was changed.",
          ],
        };
      }
      return local();
    }
  }

  async generateVillainScheme(
    options: VillainSchemeGeneratorOptions & { useAI?: boolean } = {},
  ): Promise<GeneratorOutput> {
    const { useAI, ...villainSchemeOptions } = options;
    const recentInputs = generationInputHistoryStore.recent("villain-scheme");
    return this.runWithAIFallback(
      useAI,
      async () => {
        const { systemInstruction, userMessage, resolved } =
          buildVillainSchemePrompt(
            villainSchemeOptions,
            getSessionContext() + formatRecentInputsNote(recentInputs),
          );
        generationInputHistoryStore.record(
          "villain-scheme",
          summarizeResolvedInputs(resolved),
        );
        const text = await this.runModel(systemInstruction, userMessage);
        return parseVillainSchemeResponse(text, resolved);
      },
      () => generateVillainSchemeLocal(villainSchemeOptions),
    );
  }

  /**
   * Generate, independently audit, then conditionally repair (#2768).
   *
   * Public and campaign generation share the same policy. A fresh reviewer
   * always externalises the scenario's state transitions. Repair runs in that
   * reviewer's conversation only when semantic or deterministic issues exist;
   * failed or structurally worse repairs retain the usable original.
   */
}
