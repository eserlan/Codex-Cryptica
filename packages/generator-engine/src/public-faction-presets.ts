/**
 * Curated starting points for the faction generators (#2531).
 */

import type { SmartPreset } from "./smart";

export const FACTION_PRESETS: readonly SmartPreset[] = [
  // Classic Fantasy
  {
    id: "merchant-cartel",
    label: "Merchant Cartel",
    description:
      "Monopoly trade, bonded debts, and counting houses that buy kings.",
    genres: ["Classic Fantasy"],
    set: {
      factionType: "Merchant Guild",
      alignment: "Pragmatic and profit-driven",
    },
  },
  {
    id: "shadow-infiltrators",
    label: "Shadow Infiltrators",
    description:
      "Sleeper agents, poisoned whispers, and debts kept in coded ledgers.",
    genres: ["Classic Fantasy"],
    set: {
      factionType: "Secret Society",
      alignment: "Publicly lawful, privately ruthless",
    },
  },
  {
    id: "holy-crusaders",
    label: "Holy Inquisitors",
    description:
      "Fanatical faith, ancient relics, and zeal that burns heretics.",
    genres: ["Classic Fantasy"],
    set: {
      factionType: "Temple Order",
      alignment: "Fanatical and secretive",
    },
  },
  {
    id: "underground-guild",
    label: "Underground Syndicate",
    description: "Informal credit, back-alley enforcement, and shadow routes.",
    genres: ["Classic Fantasy"],
    set: {
      factionType: "Criminal Syndicate",
      alignment: "Opportunistic and divided",
    },
  },

  // Cyberpunk / Corporate
  {
    id: "megacorp-division",
    label: "Megacorp Black Ops",
    description:
      "Corporate wetwork, asset extraction, and deniable operations.",
    genres: ["Cyberpunk / Corporate"],
    set: {
      factionType: "Corporate Division",
      alignment: "Publicly lawful, privately ruthless",
    },
  },
  {
    id: "anarcho-hackers",
    label: "Data Liberation Cell",
    description:
      "Zero-day exploits, pirate comms relays, and ideological insurrection.",
    genres: ["Cyberpunk / Corporate"],
    set: {
      factionType: "Hacker Collective",
      alignment: "Idealistic but compromised",
    },
  },

  // Cosmic Horror
  {
    id: "occult-antiquarians",
    label: "Forbidden Archive Circle",
    description:
      "Classified expedition notes, non-Euclidean relics, and quiet hysteria.",
    genres: ["Cosmic Horror"],
    set: {
      factionType: "Forbidden Archive",
      alignment: "Fanatical and secretive",
    },
  },
];

export const NOMAD_CLAN_PRESETS: readonly SmartPreset[] = [
  {
    id: "road-smugglers",
    label: "Highway Smugglers",
    description:
      "Modified haulers running contraband around corporate checkpoints.",
    genres: ["Cyberpunk / Corporate"],
    set: {
      role: "Smuggler Band",
      tone: "Grounded, gritty survival",
    },
  },
  {
    id: "chrome-scavengers",
    label: "Chrome Scavengers",
    description:
      "Sifting orbital drop-zones and badlands for pre-collapse tech.",
    genres: ["Cyberpunk / Corporate"],
    set: {
      role: "Tech Scavengers",
      tone: "Neon-punk, chrome and dust",
    },
  },
];

export const VAMPIRE_PRESETS: readonly SmartPreset[] = [
  {
    id: "high-court",
    label: "High Society Salon",
    description:
      "Centuries-old aristocracy feeding discreetly from mortal elite.",
    genres: ["Vampire / Gothic Noir"],
    set: {
      archetype: "Aristocratic Court",
      bloodline: "Sanguine Nobles (Charismatic Mind-Benders)",
      feedingHabit: "High-Society Salons (Elite & Consent-based)",
    },
  },
  {
    id: "feral-pack",
    label: "Bestial Night Stalkers",
    description:
      "Savage predators roaming ruins and wilderness on red instinct.",
    genres: ["Vampire / Gothic Noir"],
    set: {
      archetype: "Predatory Brood",
      bloodline: "Bestial Ravagers (Feral Predator Shapeshifters)",
      feedingHabit: "Wild Wilderness Hunts (Deep Forests & Ruins)",
    },
  },
];
