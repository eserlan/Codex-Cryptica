import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import type { GenerationContext } from "./generator-page-generation.js";
import type { ValidSlug } from "./generator-page-meta.js";
import {
  collectSessionNames,
  collectSessionTraits,
} from "generator-engine/public-dungeon";
import { BANNED_NAMES } from "generator-engine/naming-policy";
import {
  generationNameHistoryStore,
  summarizeResolvedInputs,
} from "#lib/services/seo/generation-input-history.js";
import {
  recordTomeHistory,
  tomeVariationOptions,
} from "#lib/services/seo/tome-generation-history.js";
import { villainDomainHistoryStore } from "#lib/services/seo/villain-domain-history.js";
import { prepareMysteryGeneration } from "#lib/services/seo/mystery-generation-inputs.js";

type LocalGenerator = (
  context: GenerationContext,
) => GeneratorOutput | Promise<GeneratorOutput>;
type LocalGeneratorLoader = () => Promise<LocalGenerator>;

async function loadAdventureLocalHandler(): Promise<LocalGenerator> {
  const mod = await import("generator-engine/public-adventure");
  return (ctx) =>
    mod.generateAdventureLocal({
      ...(ctx.adventure as object),
      genre: ctx.getActiveTheme(),
      avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
    } as never) as GeneratorOutput;
}

const loaders: Record<ValidSlug, LocalGeneratorLoader> = {
  npc: async () => {
    const mod = await import("generator-engine/public-npc");
    return (ctx) => mod.generateNpcLocal(ctx.npc as never) as GeneratorOutput;
  },
  "dnd-npc": async () => {
    const mod = await import("generator-engine/public-npc");
    return (ctx) =>
      mod.generateNpcLocal({
        ...(ctx.dndNpc as object),
        includeDndQuickStats: true,
      } as never) as GeneratorOutput;
  },
  settlement: async () => {
    const mod = await import("generator-engine/public-settlement");
    return (ctx) =>
      mod.generateSettlementLocal(ctx.settlement as never) as GeneratorOutput;
  },
  "magic-item": async () => {
    const mod = await import("generator-engine/public-magic-item");
    return (ctx) =>
      mod.generateMagicItemLocal({
        ...(ctx.magicItem as object),
        theme: ctx.getActiveTheme(),
      } as never) as GeneratorOutput;
  },
  item: async () => {
    const mod = await import("generator-engine/public-magic-item");
    return (ctx) =>
      mod.generateMagicItemLocal({
        ...(ctx.magicItem as object),
        theme: ctx.getActiveTheme(),
      } as never) as GeneratorOutput;
  },
  "minor-magic-item": async () => {
    const mod = await import("generator-engine/public-minor-magic-item");
    return (ctx) =>
      mod.generateMinorMagicItemLocal({
        ...(ctx.minorMagicItem as object),
        genre: ctx.getActiveTheme(),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  "artifact-generator": async () => {
    const mod = await import("generator-engine/public-artifact");
    return (ctx) =>
      mod.generateArtifactLocal({
        ...(ctx.artifact as object),
        genre: ctx.getActiveTheme(),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  faction: async () => {
    const mod = await import("generator-engine/public-faction");
    return (ctx) =>
      mod.generateFactionLocal(ctx.faction as never) as GeneratorOutput;
  },
  "faction-roster": async () => {
    const mod = await import("generator-engine/public-faction-roster");
    return (ctx) =>
      mod.generateFactionRosterLocal(
        ctx.factionRoster as never,
      ) as GeneratorOutput;
  },
  quest: async () => {
    const mod = await import("generator-engine/public-quest");
    return (ctx) =>
      mod.generateQuestLocal(ctx.quest as never) as GeneratorOutput;
  },
  personality: async () => {
    const mod = await import("generator-engine/public-personality");
    return (ctx) =>
      mod.generatePersonalityLocal(ctx.personality as never) as GeneratorOutput;
  },
  rumour: async () => {
    const mod = await import("generator-engine/public-rumour");
    return (ctx) =>
      mod.generateRumourLocal(ctx.rumour as never) as GeneratorOutput;
  },
  encounter: async () => {
    const mod = await import("generator-engine/public-encounter");
    return (ctx) =>
      mod.generateEncounterLocal(ctx.encounter as never) as GeneratorOutput;
  },
  puzzle: async () => {
    const mod = await import("generator-engine/public-puzzle");
    return (ctx) =>
      mod.generatePuzzleLocal(ctx.puzzle as never) as GeneratorOutput;
  },
  "council-vote": async () => {
    const mod = await import("generator-engine/public-council-vote");
    return (ctx) => {
      const recentNames = generationNameHistoryStore.recent("council-vote");
      const result = mod.generateCouncilVoteLocal({
        ...(ctx.councilVote as object),
        avoidNames: [
          ...new Set([
            ...collectSessionNames(ctx.getSessionEntities() as never[]),
            ...recentNames,
          ]),
        ],
      } as never) as GeneratorOutput;
      generationNameHistoryStore.record(
        "council-vote",
        mod.extractCouncilVoteNames(result as never),
      );
      return result;
    };
  },
  heist: async () => {
    const mod = await import("generator-engine/public-heist");
    return (ctx) => {
      const recentNames = generationNameHistoryStore.recent("heist");
      const result = mod.generateHeistLocal({
        ...(ctx.heist as object),
        avoidNames: [
          ...new Set([
            ...collectSessionNames(ctx.getSessionEntities() as never[]),
            ...recentNames,
          ]),
        ],
      } as never) as GeneratorOutput;
      generationNameHistoryStore.record(
        "heist",
        mod.extractHeistNames(result as never),
      );
      return result;
    };
  },
  holiday: async () => {
    const mod = await import("generator-engine/public-holiday");
    return (ctx) =>
      mod.generateHolidayLocal({
        ...(ctx.holiday as object),
        genre: ctx.getActiveTheme(),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  "secret-society": async () => {
    const mod = await import("generator-engine/public-secret-society");
    return (ctx) =>
      mod.generateSecretSocietyLocal(
        ctx.secretSociety as never,
      ) as GeneratorOutput;
  },
  tavern: async () => {
    const mod = await import("generator-engine/public-social-hub");
    return (ctx) =>
      mod.generateTavernLocal(ctx.tavern as never) as GeneratorOutput;
  },
  kingdom: async () => {
    const mod = await import("generator-engine/public-kingdom");
    return (ctx) =>
      mod.generateKingdomLocal(ctx.kingdom as never) as GeneratorOutput;
  },
  nation: async () => {
    const mod = await import("generator-engine/public-nation");
    return (ctx) =>
      mod.generateNationLocal(ctx.nation as never) as GeneratorOutput;
  },
  "social-hub": async () => {
    const mod = await import("generator-engine/public-social-hub");
    return (ctx) =>
      mod.generateSocialHubLocal(ctx.socialHub as never) as GeneratorOutput;
  },
  "vampire-clan": async () => {
    const mod = await import("generator-engine/public-faction");
    return (ctx) =>
      mod.generateVampireLocal(ctx.vampireClan as never) as GeneratorOutput;
  },
  "nomad-clan": async () => {
    const mod = await import("generator-engine/public-faction");
    return (ctx) =>
      mod.generateNomadClanLocal(ctx.nomadClan as never) as GeneratorOutput;
  },
  "dark-fantasy-faction": async () => {
    const mod = await import("generator-engine/public-faction");
    return (ctx) =>
      mod.generateDarkFactionLocal(ctx.darkFaction as never) as GeneratorOutput;
  },
  "urban-fantasy-faction": async () => {
    const mod = await import("generator-engine/public-urban-fantasy-faction");
    return (ctx) =>
      mod.generateUrbanFantasyFactionLocal(
        ctx.urbanFantasyFaction as never,
      ) as GeneratorOutput;
  },
  names: async () => {
    const mod = await import("generator-engine/public-names");
    return (ctx) =>
      mod.generateNamesLocal({
        ...(ctx.names as object),
        theme: ctx.getActiveTheme(),
      } as never) as GeneratorOutput;
  },
  "fantasy-names": async () => {
    const mod = await import("generator-engine/public-names");
    return (ctx) =>
      mod.generateNamesLocal({
        ...(ctx.names as object),
        theme: "Classic Fantasy",
      } as never) as GeneratorOutput;
  },
  "pantheon-generator": async () => {
    const mod = await import("generator-engine/public-pantheon");
    return (ctx) =>
      mod.generatePantheonLocal(ctx.pantheon as never) as GeneratorOutput;
  },
  "god-generator": async () => {
    const mod = await import("generator-engine/public-pantheon");
    return (ctx) =>
      mod.generatePantheonLocal(ctx.pantheon as never) as GeneratorOutput;
  },
  "ship-generator": async () => {
    const mod = await import("generator-engine/public-ship");
    return (ctx) => mod.generateShipLocal(ctx.ship as never) as GeneratorOutput;
  },
  "language-generator": async () => {
    const mod = await import("generator-engine/public-language");
    return (ctx) =>
      mod.generateLanguageLocal(ctx.language as never) as GeneratorOutput;
  },
  "news-sheet-generator": async () => {
    const mod = await import("generator-engine/public-news-sheet");
    return (ctx) =>
      mod.generateNewsSheetLocal(ctx.newsSheet as never) as GeneratorOutput;
  },
  "dungeon-generator": async () => {
    const mod = await import("generator-engine/public-dungeon");
    return (ctx) =>
      mod.generateDungeonLocal({
        ...(ctx.dungeon as object),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
        avoidTraits: collectSessionTraits(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  "adventure-generator": loadAdventureLocalHandler,
  "adventure-idea-generator": loadAdventureLocalHandler,
  "plot-twist-generator": async () => {
    const mod = await import("generator-engine/public-plot-twist");
    return (ctx) =>
      mod.generatePlotTwistLocal({
        ...(ctx.plotTwist as object),
        genre: ctx.getActiveTheme(),
        premise:
          ctx.getPlotTwistPremise().trim() ||
          ctx.getHandoffQuestPremise().trim(),
      } as never) as GeneratorOutput;
  },
  "bbeg-generator": async () => {
    const mod = await import("generator-engine/public-villain");
    return (ctx) => {
      const result = mod.generateVillainLocal({
        ...(ctx.villain as object),
        genre: ctx.getActiveTheme(),
      } as never) as GeneratorOutput;
      if (result.conflictDomain)
        villainDomainHistoryStore.record(result.conflictDomain);
      return result;
    };
  },
  "comic-book-event-generator": async () => {
    const mod = await import("generator-engine/public-comic-book-event");
    return (ctx) =>
      mod.generateComicBookEventLocal(
        ctx.comicBookEvent as never,
      ) as GeneratorOutput;
  },
  "origin-generator": async () => {
    const mod = await import("generator-engine/public-origin");
    return (ctx) =>
      mod.generateOriginLocal(ctx.origin as never) as GeneratorOutput;
  },
  "one-shot-adventure-generator": async () => {
    const mod = await import("generator-engine/public-one-shot");
    return (ctx) => {
      const options = ctx.oneShot ?? {};
      return mod.generateOneShotLocal({
        ...options,
        durationHours: Number(options.durationHours),
        partySize: Number(options.partySize),
      } as never) as GeneratorOutput;
    };
  },
  "villain-scheme-generator": async () => {
    const mod = await import("generator-engine/public-villain-scheme");
    return (ctx) =>
      mod.generateVillainSchemeLocal(
        ctx.villainScheme as never,
      ) as GeneratorOutput;
  },
  world: async () => {
    const mod = await import("generator-engine/public-world");
    return (ctx) =>
      mod.generateWorldLocal({
        ...(ctx.world as object),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  "star-system": async () => {
    const mod = await import("generator-engine/public-star-system");
    return (ctx) =>
      mod.generateStarSystemLocal({
        ...(ctx.starSystem as object),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  constellation: async () => {
    const mod = await import("generator-engine/public-constellation");
    return (ctx) => {
      const options = {
        ...(ctx.constellation as object),
        avoidNames: [
          ...BANNED_NAMES,
          ...collectSessionNames(ctx.getSessionEntities() as never[]),
        ],
      } as never;
      const constellationOptions = ctx.constellation as {
        mode?: string;
      };
      return (
        constellationOptions.mode === "night-sky"
          ? mod.generateNightSkyLocal(options)
          : mod.generateConstellationLocal(options)
      ) as GeneratorOutput;
    };
  },
  "alien-race": async () => {
    const mod = await import("generator-engine/public-alien-race");
    return (ctx) =>
      mod.generateAlienRaceLocal({
        ...(ctx.alienRace as object),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  creature: async () => {
    const mod = await import("generator-engine/public-creature");
    return (ctx) =>
      mod.generateCreatureLocal({
        ...(ctx.creature as object),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never) as GeneratorOutput;
  },
  tome: async () => {
    const mod = await import("generator-engine/public-tome");
    return (ctx) => {
      const options = tomeVariationOptions({
        ...(ctx.tome as object),
        primaryHazard: (ctx.tome as Record<string, unknown>).hazard,
      }) as never;
      const resolved = mod.resolveTome(options);
      const generated = mod.generateTomeLocalFromResolved(resolved);
      const result = generated as GeneratorOutput;
      recordTomeHistory(
        generated as import("generator-engine/public-generator-types").PublicGeneratorOutput,
        summarizeResolvedInputs(resolved),
        resolved.deceptionKey,
      );
      return result;
    };
  },
  business: async () => {
    await import("generator-engine/business-save");
    const mod = await import("generator-engine/public-business");
    return (ctx) =>
      mod.generateBusinessOutput({
        ...(ctx.business as object),
        genre:
          (ctx.business as Record<string, unknown> | undefined)?.genre ||
          ctx.getActiveTheme(),
      } as never) as GeneratorOutput;
  },
  "mystery-investigation": async () => {
    const mod = await import("generator-engine/public-mystery");
    return (ctx) => {
      const history = prepareMysteryGeneration({
        ...(ctx.mysteryInvestigation as object),
        genre:
          (ctx.mysteryInvestigation as Record<string, unknown> | undefined)
            ?.genre || ctx.getActiveTheme(),
        avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]),
      } as never);
      const result = mod.generateMysteryLocal(
        history.prompt.resolved,
      ) as GeneratorOutput;
      history.recordLocalOutput(result as never);
      return result;
    };
  },
  "point-crawl": async () => {
    await import("generator-engine/point-crawl-save");
    const mod = await import("generator-engine/public-point-crawl");
    return (ctx) =>
      mod.generatePointCrawlLocal({
        ...(ctx.pointCrawl as object),
        genre:
          (ctx.pointCrawl as Record<string, unknown> | undefined)?.genre ||
          ctx.getActiveTheme(),
        pointCount:
          Number(
            (ctx.pointCrawl as Record<string, unknown> | undefined)?.pointCount,
          ) || 8,
      } as never) as GeneratorOutput;
  },
};

export const LOCAL_GENERATOR_SLUGS = Object.keys(loaders) as ValidSlug[];

const refinementPreloaders: Partial<Record<ValidSlug, () => Promise<unknown>>> =
  {
    "one-shot-adventure-generator": () => import("./OneShotRefinePanel.svelte"),
    "point-crawl": () => import("./PointCrawlRefinePanel.svelte"),
    business: () => import("./BusinessRefinePanel.svelte"),
  };

const loaded = new Map<ValidSlug, Promise<LocalGenerator>>();

export function preloadLocalGenerator(
  slug: ValidSlug,
): Promise<LocalGenerator> {
  const loader = loaders[slug];
  let pending = loaded.get(slug);
  if (!pending) {
    pending = Promise.all([
      loader(),
      refinementPreloaders[slug]?.().catch(() => undefined) ??
        Promise.resolve(),
    ])
      .then(([generator]) => generator)
      .catch((error: unknown) => {
        loaded.delete(slug);
        throw error;
      });
    loaded.set(slug, pending);
  }
  return pending;
}

export async function generateLocally(
  slug: ValidSlug,
  context: GenerationContext,
): Promise<GeneratorOutput> {
  const generator = await preloadLocalGenerator(slug);
  const output = await generator(context);
  return { ...output, status: output.status ?? "active" };
}
