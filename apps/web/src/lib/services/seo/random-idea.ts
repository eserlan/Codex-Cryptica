import type { DefaultGeneratorEngine } from "./generator-engine";
import { pickFrom, type GeneratorOutput } from "./generator-helpers";
import { factionConfig } from "generator-engine";
import { npcThemeConfig } from "generator-engine";
import { themeToQuestGenre } from "generator-engine";

export interface RandomIdeaCategory {
  key:
    | "faction"
    | "nation"
    | "npc"
    | "quest"
    | "social-hub"
    | "pantheon"
    | "deity";
  label: string;
  generate: (
    engine: DefaultGeneratorEngine,
    useAI: boolean,
    theme: string,
  ) => Promise<GeneratorOutput>;
}

// Canonical themes are factionConfig.themes; nation and social-hub speak the
// shared genre vocabulary instead, so map theme -> genre for those.
export const themeToHubGenre: Record<string, string> = {
  "Classic Fantasy": "Fantasy",
  "Cyberpunk / Corporate": "Cyberpunk",
  "Vampire / Gothic Noir": "Horror",
  "Sci-Fi / Space Opera": "Sci-Fi",
  "Modern Conspiracy": "Modern",
  "Post-Apocalyptic": "Post-Apocalyptic",
  "Western / Frontier": "Western",
};

export function pickRandomIdeaTheme(
  random: () => number = Math.random,
): string {
  return factionConfig.themes[
    Math.floor(random() * factionConfig.themes.length)
  ];
}

// The Surprise Me pool: standalone generators only. Name generators and
// anything needing vault/archive/session context stay out by construction.
// Every input a user would normally pick on the generator page is rolled
// randomly here — the engine already randomises any omitted option. The
// theme is rolled (or locked) by the caller so a session can stay coherent.
export const randomIdeaCategories: RandomIdeaCategory[] = [
  {
    key: "faction",
    label: "Faction",
    generate: (engine, useAI, theme) =>
      engine.generateFaction({ theme, useAI }),
  },
  {
    key: "nation",
    label: "Kingdom & Nation",
    generate: (engine, useAI, theme) =>
      engine.generateNation({ genre: themeToHubGenre[theme], useAI }),
  },
  {
    key: "npc",
    label: "NPC",
    generate: (engine, useAI, theme) =>
      engine.generateNPC({
        theme,
        ancestry: pickFrom(npcThemeConfig.ancestries[theme]),
        role: pickFrom(npcThemeConfig.roles[theme]),
        alignment: pickFrom(npcThemeConfig.moralities[theme]).id,
        useAI,
      }),
  },
  {
    key: "quest",
    label: "Quest Hook",
    generate: (engine, useAI, theme) =>
      engine.generateQuestHook({ genre: themeToQuestGenre[theme], useAI }),
  },
  {
    key: "social-hub",
    label: "Social Hub",
    generate: (engine, useAI, theme) =>
      engine.generateSocialHub({ genre: themeToHubGenre[theme], useAI }),
  },
  {
    key: "pantheon",
    label: "Pantheon",
    generate: (engine, useAI, theme) =>
      engine.generatePantheon({ genre: theme, mode: "pantheon", useAI }),
  },
  {
    key: "deity",
    label: "Deity",
    generate: (engine, useAI, theme) =>
      engine.generatePantheon({ genre: theme, mode: "single", useAI }),
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
