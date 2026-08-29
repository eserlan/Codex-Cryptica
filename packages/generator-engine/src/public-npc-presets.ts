/**
 * Curated starting points for the NPC generator (#2532).
 *
 * Each preset names key starting axes and leaves the rest to resolve through
 * the smart schema, ensuring coherent role, background, mannerism, and motive.
 */

import type { SmartPreset } from "./smart";

export const NPC_PRESETS: readonly SmartPreset[] = [
  // Classic Fantasy
  {
    id: "disgraced-archivist",
    label: "Disgraced Archivist",
    description:
      "A scholarly outcast who sells restricted records to fund private studies.",
    genres: ["Classic Fantasy"],
    set: { role: "Scholar", alignment: "enlightened_balance" },
  },
  {
    id: "holy-crusader",
    label: "Zealous Inquisitor",
    description:
      "An uncompromising champion of faith who sees corruption everywhere.",
    genres: ["Classic Fantasy"],
    set: { role: "Priest", alignment: "zealous_crusade" },
  },
  {
    id: "underworld-fence",
    label: "Underworld Fence",
    description: "A pragmatic broker connected to every smuggler in the city.",
    genres: ["Classic Fantasy"],
    set: { role: "Rogue", alignment: "mercenary_instinct" },
  },

  // Pirate
  {
    id: "mutinous-quartermaster",
    label: "Mutinous Quartermaster",
    description:
      "Quietly balances the crew's ledger while preparing to take the helm.",
    genres: ["Pirate"],
    set: { role: "Quartermaster", alignment: "freebooter_pragmatist" },
  },
  {
    id: "cursed-navigator",
    label: "Cursed Navigator",
    description:
      "Knows the hidden reefs because the deep sea already claimed their soul.",
    genres: ["Pirate"],
    set: { role: "Navigator", alignment: "superstitious_sailor" },
  },

  // Cyberpunk / Corporate
  {
    id: "shady-street-fixer",
    label: "Shady Street Fixer",
    description:
      "Knows who needs cyberware moved and who pays for corporate blackouts.",
    genres: ["Cyberpunk / Corporate"],
    set: { role: "Street Fixer", alignment: "fixer_neutrality" },
  },
  {
    id: "renegade-netrunner",
    label: "Renegade Netrunner",
    description:
      "Burning through ICE to expose high-level corporate conspiracy.",
    genres: ["Cyberpunk / Corporate"],
    set: { role: "Netrunner", alignment: "subversive_rebel" },
  },

  // Cosmic Horror
  {
    id: "obsessed-antiquarian",
    label: "Obsessed Antiquarian",
    description:
      "Translates forgotten grimoires while desperately barricading the study.",
    genres: ["Cosmic Horror"],
    set: { role: "Antiquarian", alignment: "forbidden_curiosity" },
  },
  {
    id: "quarantined-witness",
    label: "Traumatized Witness",
    description:
      "Survived the coastal expedition, but their nightmares predict the next arrival.",
    genres: ["Cosmic Horror"],
    set: { role: "Surviving Witness", alignment: "fatalistic_resignation" },
  },

  // Post-Apocalyptic
  {
    id: "wasteland-scavenger",
    label: "Wasteland Scavenger",
    description:
      "Lives off the scrap of the old world, trusting no one outside the barricades.",
    genres: ["Post-Apocalyptic"],
    set: { role: "Scavenger", alignment: "pure_scavenger" },
  },

  // Western / Frontier
  {
    id: "grizzled-bounty-hunter",
    label: "Grizzled Bounty Hunter",
    description:
      "Tracks down outlaws across the badlands with cold, professional detachment.",
    genres: ["Western / Frontier"],
    set: { role: "Bounty Hunter", alignment: "frontier_pragmatist" },
  },
];
