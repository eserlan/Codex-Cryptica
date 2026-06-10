import type { DefaultGeneratorEngine } from "./generator-engine";
import { pickFrom, type GeneratorOutput } from "./generators/base";
import { factionConfig } from "./generators/faction";
import { npcThemeConfig } from "./generators/npc";

export interface RandomIdeaCategory {
  key: "faction" | "nation" | "npc" | "quest" | "social-hub";
  label: string;
  generate: (
    engine: DefaultGeneratorEngine,
    useAI: boolean,
  ) => Promise<GeneratorOutput>;
}

// The Surprise Me pool: standalone generators only. Name generators and
// anything needing vault/archive/session context stay out by construction.
// Every input a user would normally pick on the generator page is rolled
// randomly here — the engine already randomises any omitted option.
export const randomIdeaCategories: RandomIdeaCategory[] = [
  {
    key: "faction",
    label: "Faction",
    generate: (engine, useAI) =>
      engine.generateFaction({ theme: pickFrom(factionConfig.themes), useAI }),
  },
  {
    key: "nation",
    label: "Kingdom & Nation",
    generate: (engine, useAI) => engine.generateNation({ useAI }),
  },
  {
    key: "npc",
    label: "NPC",
    generate: (engine, useAI) => {
      const theme = pickFrom(factionConfig.themes);
      return engine.generateNPC({
        theme,
        ancestry: pickFrom(npcThemeConfig.ancestries[theme]),
        role: pickFrom(npcThemeConfig.roles[theme]),
        alignment: pickFrom(npcThemeConfig.moralities[theme]).id,
        useAI,
      });
    },
  },
  {
    key: "quest",
    label: "Quest Hook",
    generate: (engine, useAI) => engine.generateQuestHook({ useAI }),
  },
  {
    key: "social-hub",
    label: "Social Hub",
    generate: (engine, useAI) => engine.generateSocialHub({ useAI }),
  },
];

/**
 * Picks the category for the next roll.
 * - "Regenerate [Category]" flow: keep === true returns the current category.
 * - "Reroll Everything" flow: picks a random category, never repeating the
 *   current one so a reroll always visibly changes the idea type.
 */
export function pickNextCategory(
  current: RandomIdeaCategory | null,
  keep: boolean,
  random: () => number = Math.random,
): RandomIdeaCategory {
  if (keep && current) return current;
  const pool = current
    ? randomIdeaCategories.filter((c) => c.key !== current.key)
    : randomIdeaCategories;
  return pool[Math.floor(random() * pool.length)];
}
