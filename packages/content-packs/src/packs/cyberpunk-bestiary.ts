import type { CreaturePack } from "../types.js";
import { cyberpunkCyborgEntries } from "./entries/cyberpunk-cyborg-entries.js";
import { cyberpunkDroneEntries } from "./entries/cyberpunk-drone-entries.js";

const CREDITS =
  "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)";

export const cyberpunkCyborgPack: CreaturePack = {
  id: "cyberpunk-cyborgs",
  name: "Cyberpunk Cyborgs & Mercs Pack",
  description: "Street samurai, corporate guards, and chrome brawlers.",
  genre: "cyberpunk",
  parentPackId: "cyberpunk-bestiary",
  credits: CREDITS,
  entries: cyberpunkCyborgEntries,
};

export const cyberpunkDronePack: CreaturePack = {
  id: "cyberpunk-drones",
  name: "Cyberpunk Drones & Security Pack",
  description: "Surveillance roto-drones, spider-mechs, and siege bots.",
  genre: "cyberpunk",
  parentPackId: "cyberpunk-bestiary",
  credits: CREDITS,
  entries: cyberpunkDroneEntries,
};

export const cyberpunkBestiary: CreaturePack = {
  id: "cyberpunk-bestiary",
  name: "Neon Sprawl Cyberpunk Bestiary",
  description:
    "Twenty system-neutral cybernetic operatives, corporate security drones, and urban sprawl hazards for cyberpunk and modern campaigns.",
  genre: "cyberpunk",
  credits: CREDITS,
  entries: [...cyberpunkCyborgEntries, ...cyberpunkDroneEntries],
};

export const cyberpunkPacks: CreaturePack[] = [
  cyberpunkBestiary,
  cyberpunkCyborgPack,
  cyberpunkDronePack,
];
