export interface TovCharacterFixture {
  system: "tales-of-the-valiant";
  name: string;
  category: "character";
  lineage: string;
  heritage: string;
  background: string;
  class: string;
  level: number;
  armorClass: number;
  hitPoints: { current: number; max: number };
  hitDice: string;
  speed: string;
  proficiencyBonus: number;
  attributes: {
    str: { score: number; modifier: number; save: number };
    dex: { score: number; modifier: number; save: number };
    con: { score: number; modifier: number; save: number };
    int: { score: number; modifier: number; save: number };
    wis: { score: number; modifier: number; save: number };
    cha: { score: number; modifier: number; save: number };
  };
  skills: Record<string, { proficient: boolean; bonus: number }>;
  luck: { current: number; max: number };
  attacks: Array<{
    name: string;
    attackFormula: string;
    damageFormula: string;
    type: string;
    notes?: string;
  }>;
  features: Array<{ name: string; description: string }>;
}

export const TOV_HERO_LEVEL_1_FIXTURE: TovCharacterFixture = {
  system: "tales-of-the-valiant",
  name: "Aric of the Cloudborn",
  category: "character",
  lineage: "Human",
  heritage: "Cloudborn",
  background: "Soldier",
  class: "Fighter",
  level: 1,
  armorClass: 16,
  hitPoints: { current: 12, max: 12 },
  hitDice: "1d10",
  speed: "30 ft",
  proficiencyBonus: 2,
  attributes: {
    str: { score: 16, modifier: 3, save: 5 },
    dex: { score: 14, modifier: 2, save: 2 },
    con: { score: 14, modifier: 2, save: 4 },
    int: { score: 10, modifier: 0, save: 0 },
    wis: { score: 12, modifier: 1, save: 1 },
    cha: { score: 8, modifier: -1, save: -1 },
  },
  skills: {
    athletics: { proficient: true, bonus: 5 },
    intimidation: { proficient: true, bonus: 1 },
    perception: { proficient: true, bonus: 3 },
    survival: { proficient: true, bonus: 3 },
  },
  luck: {
    current: 3,
    max: 5,
  },
  attacks: [
    {
      name: "Longsword",
      attackFormula: "1d20+5",
      damageFormula: "1d8+3",
      type: "slashing",
      notes: "Versatile (1d10+3)",
    },
    {
      name: "Heavy Crossbow",
      attackFormula: "1d20+4",
      damageFormula: "1d10+2",
      type: "piercing",
      notes: "Ammunition, heavy, range 100/400, two-handed",
    },
  ],
  features: [
    {
      name: "Fighting Style: Defense",
      description: "While wearing armor, gain a +1 bonus to Armor Class.",
    },
    {
      name: "Second Wind",
      description:
        "On your turn, use a bonus action to regain hit points equal to 1d10 + fighter level. Recharges on short or long rest.",
    },
  ],
};
