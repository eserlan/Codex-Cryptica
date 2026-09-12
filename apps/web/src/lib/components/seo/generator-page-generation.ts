import {
  collectSessionNames,
  collectSessionTraits,
  extractPartialJsonStringFields,
} from "generator-engine";
import { generatorEngine } from "$lib/services/seo/generator-engine";
import { resolvePlotTwistPremiseForGeneration } from "$lib/services/seo/generator-handoffs";
import type { ValidSlug } from "./generator-page-meta";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

export const NON_STREAMABLE_SLUGS: readonly ValidSlug[] = [
  "council-vote",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "language-generator",
] as const;

export function isStreamableSlug(slug: ValidSlug): boolean {
  return !(NON_STREAMABLE_SLUGS as readonly string[]).includes(slug);
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
  rumour: Record<string, unknown>;
  encounter: Record<string, unknown>;
  puzzle: Record<string, unknown>;
  councilVote: Record<string, unknown>;
  heist: Record<string, unknown>;
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
  world: Record<string, unknown>;
  starSystem: Record<string, unknown>;
  constellation: Record<string, unknown>;
  alienRace: Record<string, unknown>;
  creature: Record<string, unknown>;
  getActiveTheme: () => string;
  getPlotTwistPremise: () => string;
  getHandoffQuestPremise: () => string;
  getSessionEntities: () => unknown[];
  engine?: typeof generatorEngine;
}

export type GeneratorHandler = (useAI: boolean) => Promise<GeneratorOutput>;
export type GeneratorHandlers = Record<ValidSlug, GeneratorHandler>;

export function createGeneratorHandlers(
  ctx: GenerationContext,
): GeneratorHandlers {
  const engine = ctx.engine ?? generatorEngine;
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
    rumour: (useAI) =>
      engine.generateRumour({ ...(ctx.rumour as object), useAI } as never),
    encounter: (useAI) =>
      engine.generateEncounter({
        ...(ctx.encounter as object),
        useAI,
      } as never),
    puzzle: (useAI) =>
      engine.generatePuzzle({ ...(ctx.puzzle as object), useAI } as never),
    "council-vote": (useAI) =>
      engine.generateCouncilVote({
        ...(ctx.councilVote as object),
        useAI,
      } as never),
    heist: (useAI) =>
      engine.generateHeist({ ...(ctx.heist as object), useAI } as never),
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
    "dungeon-generator": (useAI) =>
      engine.generateDungeon({
        ...(ctx.dungeon as object),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
        avoidTraits: collectSessionTraits(ctx.getSessionEntities() as never[]),
      } as never),
    "adventure-generator": (useAI) =>
      engine.generateAdventure({
        ...(ctx.adventure as object),
        themeId: ctx.getActiveTheme(),
        genre: ctx.getActiveTheme(),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
    "adventure-idea-generator": (useAI) =>
      engine.generateAdventure({
        ...(ctx.adventure as object),
        themeId: ctx.getActiveTheme(),
        genre: ctx.getActiveTheme(),
        useAI,
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never),
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
    "bbeg-generator": (useAI) =>
      engine.generateVillain({
        ...(ctx.villain as object),
        genre: ctx.getActiveTheme(),
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
