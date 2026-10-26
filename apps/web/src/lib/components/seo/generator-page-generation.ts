import {
  collectSessionNames,
  collectSessionTraits,
  extractPartialJsonStringFields,
  type OneShotProgressStep,
} from "generator-engine";
import { generatorEngine } from "#lib/services/seo/generator-engine.js";
import { resolvePlotTwistPremiseForGeneration } from "#lib/services/seo/generator-handoffs.js";
import type { ValidSlug } from "./generator-page-meta";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

export const NON_STREAMABLE_SLUGS: readonly ValidSlug[] = [
  "council-vote",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "one-shot-adventure-generator",
  "point-crawl",
  "business",
  "language-generator",
  "heist",
  "tome",
  "bbeg-generator",
  "mystery-investigation",
] as const;

export function isStreamableSlug(slug: ValidSlug): boolean {
  return !(NON_STREAMABLE_SLUGS as readonly string[]).includes(slug);
}

/** Generators that run in stages and show the live step list. */
const STAGED_SLUGS: readonly ValidSlug[] = [
  "one-shot-adventure-generator",
  "point-crawl",
  "business",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "council-vote",
  "heist",
  "tome",
  "bbeg-generator",
  "mystery-investigation",
] as const;

export function showsStagedProgress(slug: ValidSlug): boolean {
  return (STAGED_SLUGS as readonly string[]).includes(slug);
}

export function buildPreviewOutput(raw: string): GeneratorOutput {
  const fields = extractPartialJsonStringFields(raw);
  return {
    type: "note",
    title: fields.title || "Generating…",
    summary: fields.summary || "",
    content: fields.content || "",
    lore: fields.lore || "",
    labels: [],
    status: "draft",
  };
}

export interface GenerationContext {
  npc: Record<string, unknown>;
  settlement: Record<string, unknown>;
  magicItem: Record<string, unknown>;
  minorMagicItem: Record<string, unknown>;
  artifact: Record<string, unknown>;
  faction: Record<string, unknown>;
  factionRoster: Record<string, unknown>;
  quest: Record<string, unknown>;
  personality: Record<string, unknown>;
  rumour: Record<string, unknown>;
  encounter: Record<string, unknown>;
  puzzle: Record<string, unknown>;
  councilVote: Record<string, unknown>;
  heist: Record<string, unknown>;
  holiday: Record<string, unknown>;
  secretSociety: Record<string, unknown>;
  tavern: Record<string, unknown>;
  kingdom: Record<string, unknown>;
  nation: Record<string, unknown>;
  socialHub: Record<string, unknown>;
  vampireClan: Record<string, unknown>;
  nomadClan: Record<string, unknown>;
  darkFaction: Record<string, unknown>;
  names: Record<string, unknown>;
  dndNpc: Record<string, unknown>;
  pantheon: Record<string, unknown>;
  ship: Record<string, unknown>;
  language: Record<string, unknown>;
  newsSheet: Record<string, unknown>;
  dungeon: Record<string, unknown>;
  adventure: Record<string, unknown>;
  plotTwist: Record<string, unknown>;
  villain: Record<string, unknown>;
  comicBookEvent: Record<string, unknown>;
  origin: Record<string, unknown>;
  villainScheme: Record<string, unknown>;
  oneShot: Record<string, unknown>;
  pointCrawl?: Record<string, unknown>;
  business?: Record<string, unknown>;
  mysteryInvestigation?: Record<string, unknown>;
  world: Record<string, unknown>;
  starSystem: Record<string, unknown>;
  constellation: Record<string, unknown>;
  alienRace: Record<string, unknown>;
  creature: Record<string, unknown>;
  tome: Record<string, unknown>;
  getActiveTheme: () => string;
  getPlotTwistPremise: () => string;
  getHandoffQuestPremise: () => string;
  getSessionEntities: () => unknown[];
  /** Receives each step of a staged one-shot generation; null resets it. */
  onOneShotProgress?: (steps: OneShotProgressStep[] | null) => void;
  /** Cancels a staged one-shot when a new one starts or the page goes away. */
  oneShotRuns?: OneShotRunControl;
  engine?: typeof generatorEngine;
}

export interface OneShotRunControl {
  /** Cancel any run in flight and return the signal for a new one. */
  start: () => AbortSignal;
  /** Cancel the run in flight, e.g. when the page is destroyed. */
  dispose: () => void;
}

export function createOneShotRunControl(): OneShotRunControl {
  let controller: AbortController | null = null;
  return {
    start() {
      controller?.abort();
      controller = new AbortController();
      return controller.signal;
    },
    dispose() {
      controller?.abort();
      controller = null;
    },
  };
}

export type GeneratorHandler = (useAI: boolean) => Promise<GeneratorOutput>;
export type GeneratorHandlers = Record<ValidSlug, GeneratorHandler>;

export function createGeneratorHandlers(
  ctx: GenerationContext,
): GeneratorHandlers {
  const engine = ctx.engine ?? generatorEngine;
  // Both adventure slugs run the staged route with the live step list.
  const generateAdventure = (useAI: boolean) => {
    ctx.onOneShotProgress?.(null);
    return engine.generateAdventure({
      ...(ctx.adventure as object),
      themeId: ctx.getActiveTheme(),
      genre: ctx.getActiveTheme(),
      useAI,
      avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      onProgress: ctx.onOneShotProgress,
      signal: ctx.oneShotRuns?.start(),
    } as never);
  };
  return {
    npc: (useAI) =>
      engine.generateNPC({ ...(ctx.npc as object), useAI } as never),
    settlement: (useAI) =>
      engine.generateSettlement({
        ...(ctx.settlement as object),
        useAI,
      } as never),
    "magic-item": (useAI) =>
      engine.generateMagicItem({
        ...(ctx.magicItem as object),
        useAI,
      } as never),
    "minor-magic-item": (useAI) =>
      engine.generateMinorMagicItem({
        ...(ctx.minorMagicItem as object),
        genre: ctx.getActiveTheme(),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    "artifact-generator": (useAI) =>
      engine.generateArtifact({
        ...(ctx.artifact as object),
        genre: ctx.getActiveTheme(),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    item: (useAI) =>
      engine.generateMagicItem({
        ...(ctx.magicItem as object),
        useAI,
      } as never),
    faction: (useAI) =>
      engine.generateFaction({ ...(ctx.faction as object), useAI } as never),
    "faction-roster": (useAI) =>
      engine.generateFactionRoster({
        ...(ctx.factionRoster as object),
        useAI,
      } as never),
    quest: (useAI) =>
      engine.generateQuestHook({ ...(ctx.quest as object), useAI } as never),
    personality: (useAI) =>
      engine.generatePersonality({
        ...(ctx.personality as object),
        useAI,
      } as never),
    rumour: (useAI) =>
      engine.generateRumour({ ...(ctx.rumour as object), useAI } as never),
    encounter: (useAI) =>
      engine.generateEncounter({
        ...(ctx.encounter as object),
        useAI,
      } as never),
    puzzle: (useAI) =>
      engine.generatePuzzle({ ...(ctx.puzzle as object), useAI } as never),
    "council-vote": (useAI) => {
      ctx.onOneShotProgress?.(null);
      return engine.generateCouncilVote({
        ...(ctx.councilVote as object),
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    heist: (useAI) => {
      ctx.onOneShotProgress?.(null);
      return engine.generateHeist({
        ...(ctx.heist as object),
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    holiday: (useAI) =>
      engine.generateHoliday({
        ...(ctx.holiday as object),
        genre: ctx.getActiveTheme(),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    "secret-society": (useAI) =>
      engine.generateSecretSociety({
        ...(ctx.secretSociety as object),
        useAI,
      } as never),
    tavern: (useAI) =>
      engine.generateTavern({ ...(ctx.tavern as object), useAI } as never),
    kingdom: (useAI) =>
      engine.generateKingdom({ ...(ctx.kingdom as object), useAI } as never),
    nation: (useAI) =>
      engine.generateNation({ ...(ctx.nation as object), useAI } as never),
    "social-hub": (useAI) =>
      engine.generateSocialHub({
        ...(ctx.socialHub as object),
        useAI,
      } as never),
    "vampire-clan": (useAI) =>
      engine.generateVampireClan({
        ...(ctx.vampireClan as object),
        useAI,
      } as never),
    "nomad-clan": (useAI) =>
      engine.generateNomadClan({
        ...(ctx.nomadClan as object),
        useAI,
      } as never),
    "dark-fantasy-faction": (useAI) =>
      engine.generateDarkFaction({
        ...(ctx.darkFaction as object),
        useAI,
      } as never),
    names: (useAI) =>
      engine.generateNames({
        ...(ctx.names as object),
        theme: ctx.getActiveTheme(),
        useAI,
      } as never),
    "fantasy-names": (useAI) =>
      engine.generateNames({
        ...(ctx.names as object),
        theme: "Classic Fantasy",
        useAI,
      } as never),
    "dnd-npc": (useAI) =>
      engine.generateNPC({
        ...(ctx.dndNpc as object),
        includeDndQuickStats: true,
        useAI,
      } as never),
    "pantheon-generator": (useAI) =>
      engine.generatePantheon({ ...(ctx.pantheon as object), useAI } as never),
    "god-generator": (useAI) =>
      engine.generatePantheon({ ...(ctx.pantheon as object), useAI } as never),
    "ship-generator": (useAI) =>
      engine.generateShip({ ...(ctx.ship as object), useAI } as never),
    "language-generator": (useAI) =>
      engine.generateLanguage({ ...(ctx.language as object), useAI } as never),
    "news-sheet-generator": (useAI) =>
      engine.generateNewsSheet({
        ...(ctx.newsSheet as object),
        useAI,
      } as never),
    "dungeon-generator": (useAI) => {
      ctx.onOneShotProgress?.(null);
      return engine.generateDungeon({
        ...(ctx.dungeon as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
        avoidTraits: collectSessionTraits(ctx.getSessionEntities() as never[]),
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    "adventure-generator": (useAI) => generateAdventure(useAI),
    "adventure-idea-generator": (useAI) => generateAdventure(useAI),
    "plot-twist-generator": (useAI) =>
      engine.generatePlotTwist({
        ...(ctx.plotTwist as object),
        premise: resolvePlotTwistPremiseForGeneration(
          ctx.getPlotTwistPremise(),
          ctx.getHandoffQuestPremise(),
        ),
        themeId: ctx.getActiveTheme(),
        genre: ctx.getActiveTheme(),
        useAI,
      } as never),
    "bbeg-generator": (useAI) => {
      ctx.onOneShotProgress?.(null);
      return engine.generateVillain({
        ...(ctx.villain as object),
        genre: ctx.getActiveTheme(),
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    "comic-book-event-generator": (useAI) =>
      engine.generateComicBookEvent({
        ...(ctx.comicBookEvent as object),
        useAI,
      } as never),
    "origin-generator": (useAI) =>
      engine.generateOrigin({ ...(ctx.origin as object), useAI } as never),
    "one-shot-adventure-generator": (useAI) => {
      ctx.onOneShotProgress?.(null);
      return engine.generateOneShot({
        ...(ctx.oneShot as object),
        durationHours: Number(ctx.oneShot.durationHours),
        partySize: Number(ctx.oneShot.partySize),
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    "villain-scheme-generator": (useAI) =>
      engine.generateVillainScheme({
        ...(ctx.villainScheme as object),
        useAI,
      } as never),
    world: (useAI) =>
      engine.generateWorld({
        ...(ctx.world as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    "star-system": (useAI) =>
      engine.generateStarSystem({
        ...(ctx.starSystem as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    constellation: (useAI) =>
      engine.generateConstellation({
        ...(ctx.constellation as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    "alien-race": (useAI) =>
      engine.generateAlienRace({
        ...(ctx.alienRace as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    creature: (useAI) =>
      engine.generateCreature({
        ...(ctx.creature as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    tome: (useAI) => {
      ctx.onOneShotProgress?.(null);
      return engine.generateTome({
        ...(ctx.tome as object),
        primaryHazard: (ctx.tome as Record<string, unknown>).hazard,
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    business: (useAI: boolean) => {
      ctx.onOneShotProgress?.(null);
      const b = (ctx.business ?? {}) as Record<string, unknown>;
      return engine.generateBusiness({
        ...b,
        genre: (b.genre as string) || ctx.getActiveTheme(),
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    "mystery-investigation": (useAI: boolean) => {
      ctx.onOneShotProgress?.(null);
      const mystery = ctx.mysteryInvestigation ?? {};
      return engine.generateMysteryInvestigation({
        ...mystery,
        genre: (mystery.genre as string) || ctx.getActiveTheme(),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
    "point-crawl": (useAI: boolean) => {
      ctx.onOneShotProgress?.(null);
      const pc = (ctx.pointCrawl ?? {}) as Record<string, unknown>;
      return engine.generatePointCrawl({
        ...pc,
        genre: (pc.genre as string) || ctx.getActiveTheme(),
        pointCount: Number(pc.pointCount) || 8,
        useAI,
        onProgress: ctx.onOneShotProgress,
        signal: ctx.oneShotRuns?.start(),
      } as never);
    },
  } as GeneratorHandlers;
}

export function createGenerate(options: {
  getSlug: () => ValidSlug;
  getHandlers: () => GeneratorHandlers;
  engine?: typeof generatorEngine;
}): (args: {
  useAI: boolean;
  onPreview?: (preview: GeneratorOutput) => void;
}) => Promise<GeneratorOutput> {
  const engine = options.engine ?? generatorEngine;
  return async ({ useAI, onPreview }) => {
    const slug = options.getSlug();
    const handlers = options.getHandlers();
    const handler = handlers[slug];
    if (!handler) throw new Error(`No generator implemented for slug: ${slug}`);
    const streamable = isStreamableSlug(slug);
    if (useAI && onPreview && streamable) {
      return engine.generateWithPreview(
        () => handler(useAI),
        (raw) => {
          onPreview(buildPreviewOutput(raw));
        },
      );
    }
    return handler(useAI);
  };
}
