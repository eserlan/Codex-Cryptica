import type { CreaturePack } from "../types.js";
import { steampunkClockworkEntries } from "./entries/steampunk-clockwork-entries.js";
import { steampunkFrontierEntries } from "./entries/steampunk-frontier-entries.js";

const CREDITS =
  "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)";

export const steampunkClockworkPack: CreaturePack = {
  id: "steampunk-clockworks",
  name: "Clockwork & Steam Automatons Pack",
  description: "Brass automatons, steam juggernauts, and tesla-coil golems.",
  genre: "steampunk",
  parentPackId: "steampunk-bestiary",
  credits: CREDITS,
  entries: steampunkClockworkEntries,
};

export const steampunkFrontierPack: CreaturePack = {
  id: "steampunk-frontier-pack",
  name: "Weird West & Frontier Beasts Pack",
  description: "Desert wendigos, canyon skinwalkers, and rattlesnake horrors.",
  genre: "steampunk",
  parentPackId: "steampunk-bestiary",
  credits: CREDITS,
  entries: steampunkFrontierEntries,
};

export const steampunkBestiary: CreaturePack = {
  id: "steampunk-bestiary",
  name: "Steampunk & Weird Frontier Bestiary",
  description:
    "Twenty system-neutral brass automatons, aether mechs, and weird west legends for steampunk and frontier adventures.",
  genre: "steampunk",
  credits: CREDITS,
  entries: [...steampunkClockworkEntries, ...steampunkFrontierEntries],
};

export const steampunkPacks: CreaturePack[] = [
  steampunkBestiary,
  steampunkClockworkPack,
  steampunkFrontierPack,
];
