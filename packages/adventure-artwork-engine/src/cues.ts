/** Public catalogue vocabulary. Add terms deliberately alongside reviewed assets. */
export const ARTWORK_CUES = [
  "forest",
  "woodland",
  "mountain",
  "hills",
  "plains",
  "desert",
  "swamp",
  "river",
  "coast",
  "ocean",
  "island",
  "tundra",
  "snow",
  "cave",
  "ruins",
  "village",
  "town",
  "city",
  "harbour",
  "road",
  "castle",
  "temple",
  "tavern",
  "market",
  "farm",
  "space-station",
  "starship",
  "laboratory",
  "industrial",
  "urban",
  "rural",
  "wilderness",
  "interior",
  "exterior",
  "traveller",
  "merchant",
  "guard",
  "scholar",
  "explorer",
  "worker",
  "human",
  "elf",
  "dwarf",
  "halfling",
  "orc",
  "tiefling",
  "dragonborn",
  "gnome",
  "fighter",
  "paladin",
  "ranger",
  "rogue",
  "wizard",
  "cleric",
  "bard",
  "druid",
  "barbarian",
  "warlock",
  "monk",
  "noble",
  "elder",
  "witch",
  "cultist",
  "bandit",
  "official",
  "urchin",
  "goblin",
  "necromancer",
  "innkeeper",
  "healer",
  "smith",
  "informant",
  "quiet",
  "busy",
  "ominous",
  "hopeful",
  "mysterious",
  "day",
  "night",
  "dawn",
  "dusk",
  "rain",
  "fog",
  "winter",
  "summer",
] as const;

const allowed = new Set<string>(ARTWORK_CUES);

const SETTING_CUES = new Set<string>([
  "forest",
  "woodland",
  "mountain",
  "hills",
  "plains",
  "desert",
  "swamp",
  "river",
  "coast",
  "ocean",
  "island",
  "tundra",
  "snow",
  "cave",
  "ruins",
  "village",
  "town",
  "city",
  "harbour",
  "road",
  "castle",
  "temple",
  "tavern",
  "market",
  "farm",
  "space-station",
  "starship",
  "laboratory",
  "industrial",
  "urban",
  "rural",
  "wilderness",
  "interior",
  "exterior",
]);

const NPC_ANCESTRY_CUES = new Set<string>([
  "human",
  "elf",
  "dwarf",
  "halfling",
  "orc",
  "tiefling",
  "dragonborn",
  "gnome",
]);

const NPC_GENERIC_ROLE_CUES = new Set<string>(["worker", "traveller"]);

const NPC_PERSON_CUES = new Set<string>([
  "traveller",
  "merchant",
  "guard",
  "scholar",
  "explorer",
  "worker",
  ...NPC_ANCESTRY_CUES,
  "fighter",
  "paladin",
  "ranger",
  "rogue",
  "wizard",
  "cleric",
  "bard",
  "druid",
  "barbarian",
  "warlock",
  "monk",
  "noble",
  "elder",
  "witch",
  "cultist",
  "bandit",
  "official",
  "urchin",
  "goblin",
  "necromancer",
  "innkeeper",
  "healer",
  "smith",
  "informant",
]);

export const CUE_SYNONYMS: Readonly<Record<string, string>> = {
  reeve: "elder",
  seer: "witch",
  oracle: "witch",
  fortuneteller: "witch",
  "fortune-teller": "witch",
  "fortune teller": "witch",
  magistrate: "official",
  judge: "official",
  guildmaster: "official",
  "street child": "urchin",
  "street-child": "urchin",
  beggar: "urchin",
  priest: "cleric",
  priestess: "cleric",
  medic: "healer",
  paramedic: "healer",
  herbalist: "healer",
  outlaw: "bandit",
  highwayman: "bandit",
  "inn-keeper": "innkeeper",
  "tavern keeper": "innkeeper",
  tavernkeeper: "innkeeper",
  barkeep: "innkeeper",
  barkeeper: "innkeeper",
  blacksmith: "smith",
  thief: "rogue",
  minstrel: "bard",
};

export function isArtworkCue(value: string): boolean {
  return allowed.has(value);
}

export function isSettingCue(value: string): boolean {
  return SETTING_CUES.has(value);
}

export function isNpcPersonCue(value: string): boolean {
  return NPC_PERSON_CUES.has(value);
}

export function isNpcAncestryCue(value: string): boolean {
  return NPC_ANCESTRY_CUES.has(value);
}

export function isNpcGenericRoleCue(value: string): boolean {
  return NPC_GENERIC_ROLE_CUES.has(value);
}

/** Bound and filter already player-visible structured cues, never raw narration. */
export function normalizeArtworkCues(values: readonly string[]): string[] {
  const result: string[] = [];
  for (const raw of values) {
    const lower = raw.trim().toLowerCase();
    const value = CUE_SYNONYMS[lower] ?? lower;
    if (isArtworkCue(value) && !result.includes(value)) result.push(value);
    if (result.length === 24) break;
  }
  return result;
}
