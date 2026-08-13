import type { CreaturePack } from "../types.js";
import { scifiAlienEntries } from "./entries/scifi-alien-entries.js";
import { scifiMechEntries } from "./entries/scifi-mech-entries.js";

const CREDITS =
  "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)";

export const scifiAlienPack: CreaturePack = {
  id: "scifi-aliens",
  name: "Sci-Fi Aliens Pack",
  description: "Xenomorph hunters, void stalkers, and stellar leviathans.",
  genre: "scifi",
  parentPackId: "scifi-bestiary",
  credits: CREDITS,
  entries: scifiAlienEntries,
};

export const scifiMechPack: CreaturePack = {
  id: "scifi-mechs",
  name: "Sci-Fi Mechs & Drones Pack",
  description: "Combat automatons, patrol drones, and heavy mecha sentinels.",
  genre: "scifi",
  parentPackId: "scifi-bestiary",
  credits: CREDITS,
  entries: scifiMechEntries,
};

export const scifiBestiary: CreaturePack = {
  id: "scifi-bestiary",
  name: "Galactic Sci-Fi Bestiary",
  description:
    "Twenty system-neutral alien predators, autonomous security drones, and cosmic threats for space exploration campaigns.",
  genre: "scifi",
  credits: CREDITS,
  entries: [...scifiAlienEntries, ...scifiMechEntries],
};

export const scifiPacks: CreaturePack[] = [
  scifiBestiary,
  scifiAlienPack,
  scifiMechPack,
];
