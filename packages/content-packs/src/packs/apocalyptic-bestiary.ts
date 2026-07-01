import type { CreaturePack } from "../types.js";
import { apocalypticMutantEntries } from "./entries/apocalyptic-mutant-entries.js";
import { apocalypticRaiderEntries } from "./entries/apocalyptic-raider-entries.js";

const CREDITS =
  "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)";

export const apocalypticMutantPack: CreaturePack = {
  id: "apocalyptic-mutants",
  name: "Wasteland Mutants Pack",
  description: "Glowing ghouls, giant rad-scorpions, and death-claws.",
  genre: "apocalyptic",
  parentPackId: "apocalyptic-bestiary",
  credits: CREDITS,
  entries: apocalypticMutantEntries,
};

export const apocalypticRaiderPack: CreaturePack = {
  id: "apocalyptic-raiders",
  name: "Wasteland Raiders & Marauders Pack",
  description: "Chem-crazed berserkers, road chiefs, and junk mecha.",
  genre: "apocalyptic",
  parentPackId: "apocalyptic-bestiary",
  credits: CREDITS,
  entries: apocalypticRaiderEntries,
};

export const apocalypticBestiary: CreaturePack = {
  id: "apocalyptic-bestiary",
  name: "Wasteland & Fallout Bestiary",
  description:
    "Twenty system-neutral radioactive mutants, wasteland raider gangs, and post-apocalyptic horrors for fallout and survivor campaigns.",
  genre: "apocalyptic",
  credits: CREDITS,
  entries: [...apocalypticMutantEntries, ...apocalypticRaiderEntries],
};

export const apocalypticPacks: CreaturePack[] = [
  apocalypticBestiary,
  apocalypticMutantPack,
  apocalypticRaiderPack,
];
