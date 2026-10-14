export interface TovCreatureFixture {
  system: "tales-of-the-valiant";
  name: string;
  category: "creature";
  size: string;
  type: string;
  armorClass: number;
  hitPoints: { current: number; max: number; formula: string };
  speed: string;
  challengeRating: string;
  experiencePoints: number;
  proficiencyBonus: number;
  attributes: {
    str: { score: number; modifier: number };
    dex: { score: number; modifier: number };
    con: { score: number; modifier: number };
    int: { score: number; modifier: number };
    wis: { score: number; modifier: number };
    cha: { score: number; modifier: number };
  };
  skills?: Record<string, number>;
  senses: string;
  languages: string;
  traits: Array<{ name: string; description: string }>;
  actions: Array<{
    name: string;
    attackFormula?: string;
    damageFormula?: string;
    description: string;
  }>;
  bonusActions?: Array<{ name: string; description: string }>;
  doomPoints?: number;
}

export const TOV_CAVE_GOBLIN_FIXTURE: TovCreatureFixture = {
  system: "tales-of-the-valiant",
  name: "Cave Goblin",
  category: "creature",
  size: "Small",
  type: "Humanoid (Goblinoid)",
  armorClass: 13,
  hitPoints: { current: 7, max: 7, formula: "2d6" },
  speed: "30 ft",
  challengeRating: "1/4",
  experiencePoints: 50,
  proficiencyBonus: 2,
  attributes: {
    str: { score: 8, modifier: -1 },
    dex: { score: 14, modifier: 2 },
    con: { score: 10, modifier: 0 },
    int: { score: 10, modifier: 0 },
    wis: { score: 8, modifier: -1 },
    cha: { score: 8, modifier: -1 },
  },
  skills: {
    stealth: 6,
  },
  senses: "Darkvision 60 ft., passive Perception 9",
  languages: "Common, Goblin",
  traits: [],
  actions: [
    {
      name: "Scimitar",
      attackFormula: "1d20+4",
      damageFormula: "1d6+2",
      description:
        "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
    },
    {
      name: "Shortbow",
      attackFormula: "1d20+4",
      damageFormula: "1d6+2",
      description:
        "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
    },
  ],
  bonusActions: [
    {
      name: "Nimble Escape",
      description:
        "The goblin can take the Disengage or Hide action as a bonus action on each of its turns.",
    },
  ],
};
