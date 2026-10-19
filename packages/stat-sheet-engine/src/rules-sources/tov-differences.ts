/**
 * Structural differences and mechanical inventory comparing Tales of the Valiant / Black Flag
 * against traditional D&D 5e mechanics (Milestone 1 baseline).
 */

export interface MechanicDifference {
  category: string;
  tovConcept: string;
  dnd5eEquivalent: string;
  differenceDescription: string;
  impactOnCodexCryptica: string;
}

export const TOV_5E_DIFFERENCES: MechanicDifference[] = [
  {
    category: "Identity",
    tovConcept: "Lineage + Heritage",
    dnd5eEquivalent: "Race + Subrace",
    differenceDescription:
      "ToV separates biological species traits (Lineage, e.g. Human, Elf, Dwarf, Beastkin) from cultural/upbringing traits (Heritage, e.g. Cloudborn, Nomad, Urban, Grove). Any Lineage can freely combine with any Heritage.",
    impactOnCodexCryptica:
      "Stat-sheet templates and importers must track Lineage and Heritage as distinct fields rather than forcing a single Race or Ancestry string.",
  },
  {
    category: "Character Customization",
    tovConcept: "Talents (Martial, Magic, Technical)",
    dnd5eEquivalent: "Feats",
    differenceDescription:
      "Talents replace Feats and are divided into three distinct categories: Martial, Magic, and Technical. Characters select talents tailored to their playstyle and prerequisites.",
    impactOnCodexCryptica:
      "Stat sheets and generators should group or label talents by their respective category (Martial, Magic, Technical).",
  },
  {
    category: "Resources",
    tovConcept: "Luck (Granular Pool, 1 to Max 5)",
    dnd5eEquivalent: "Inspiration (Binary Advantage)",
    differenceDescription:
      "Luck is a numeric pool of points (starting value + earned points up to a maximum). Gained when a d20 roll fails (1 Luck). Spent 1-for-1 to add to a d20 test, attack, or saving throw, or to activate specific talents.",
    impactOnCodexCryptica:
      "Luck must be an interactive counter on character sheets and VTT tokens, allowing numeric additions and spending, unlike binary 5e inspiration.",
  },
  {
    category: "Adversaries & GM Mechanics",
    tovConcept: "Doom Points",
    dnd5eEquivalent: "Legendary Actions / Lair Actions",
    differenceDescription:
      "The optional BFRD Doom rule gives the GM a CR-based resource pool at the start of an encounter that can affect creatures in that encounter. Published spends are giving a creature advantage on an attack, giving a PC disadvantage on a save, or once per encounter refreshing, recharging, or gaining one additional use of a limited-use feature.",
    impactOnCodexCryptica:
      "Encounter guidance aligns with the optional encounter-level Doom pool and published spends, labelling any custom creature-specific Doom abilities or alternate Doom economies as homebrew. ToV monster sheets and VTT token controls expose a per-creature Doom counter to track allocations from the encounter pool without implying the BFRD rule is creature-only.",
  },
  {
    category: "Magic System",
    tovConcept: "Spell Circles (1st-9th) & Spell Sources",
    dnd5eEquivalent: "Spell Levels & Class Spell Lists",
    differenceDescription:
      "Spells are classified by Circles (1st through 9th) and drawn from four primary sources: Arcane, Divine, Primordial, and Wyrd.",
    impactOnCodexCryptica:
      "Spell lists and features reflect spell circle terminology and source tags.",
  },
  {
    category: "Weapon Mechanics",
    tovConcept: "Weapon Options / Maneuvers",
    dnd5eEquivalent: "Base Weapon Properties (2014) / Weapon Mastery (2024)",
    differenceDescription:
      "Certain weapons grant tactical maneuvers and options when wielded by characters with the appropriate martial training.",
    impactOnCodexCryptica:
      "Attacks and weapon tables retain action/maneuver descriptions in the item-table row structure.",
  },
];

export const CONTENT_BOUNDARIES = {
  licensedUnderBFRD: [
    "Core mechanics, ability scores, modifiers, proficiency, saves, and skills",
    "Lineage and Heritage structural definitions",
    "Talents, categories (Martial, Magic, Technical), and open prerequisite structures",
    "Luck pool, earn mechanics, spend rules, and the d4 overflow reset",
    "Spell circle framework and open BFRD spell statistics",
    "Creature stat-block structures, vital statistics, attack actions, and Doom mechanics",
  ],
  strictlyExcludedProprietaryContent: [
    "Proprietary setting lore (Midgard, Southlands, Margreve, Scarlet Citadel)",
    "Commercial adventure texts and campaign book narratives",
    "Commercial Kobold Press creature artwork, maps, and graphic tokens",
    "Official 'Tales of the Valiant Compatibility' trade dress and logo graphics",
  ],
};
