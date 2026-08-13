import type { CreaturePack } from "../types.js";
import { beastEntries } from "./entries/beast-entries.js";
import { undeadEntries } from "./entries/undead-entries.js";
import { humanoidEntries } from "./entries/humanoid-entries.js";
import { monstrosityEntries } from "./entries/monstrosity-entries.js";
import { aberrationEntries } from "./entries/aberration-entries.js";
import { fiendEntries } from "./entries/fiend-entries.js";
import { dragonEntries } from "./entries/dragon-entries.js";
import { feyEntries } from "./entries/fey-entries.js";
import { elementalEntries } from "./entries/elemental-entries.js";
import { constructEntries } from "./entries/construct-entries.js";
import { giantEntries } from "./entries/giant-entries.js";
import { oozeEntries } from "./entries/ooze-entries.js";
import { plantEntries } from "./entries/plant-entries.js";
import { celestialEntries } from "./entries/celestial-entries.js";
import { goblinoidEntries } from "./entries/goblinoid-entries.js";

const CREDITS =
  "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)";

export const beastPack: CreaturePack = {
  id: "fantasy-beasts",
  name: "Fantasy Beasts Pack",
  description: "Natural and giant animals of the wilderness.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: beastEntries,
};

export const undeadPack: CreaturePack = {
  id: "fantasy-undead",
  name: "Fantasy Undead Pack",
  description: "Restless spirits, reanimated corpses, and lords of the grave.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: undeadEntries,
};

export const humanoidPack: CreaturePack = {
  id: "fantasy-humanoids",
  name: "Fantasy Humanoids Pack",
  description: "Mercenaries, bandits, cultists, and heroes.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: humanoidEntries,
};

export const monstrosityPack: CreaturePack = {
  id: "fantasy-monstrosities",
  name: "Fantasy Monstrosities Pack",
  description: "Bizarre hybrid horrors and legendary predators.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: monstrosityEntries,
};

export const aberrationPack: CreaturePack = {
  id: "fantasy-aberrations",
  name: "Fantasy Aberrations Pack",
  description: "Alien entities and deep subterranean terrors.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: aberrationEntries,
};

export const fiendPack: CreaturePack = {
  id: "fantasy-fiends",
  name: "Fantasy Fiends Pack",
  description: "Devils, demons, and infernal destroyers.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: fiendEntries,
};

export const dragonPack: CreaturePack = {
  id: "fantasy-dragons",
  name: "Fantasy Dragons Pack",
  description: "Wyrms, drakes, wyverns, and ancient sovereigns.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: dragonEntries,
};

export const feyPack: CreaturePack = {
  id: "fantasy-fey",
  name: "Fantasy Fey Pack",
  description: "Sylvan spirits, tricksters, and courtly guardians.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: feyEntries,
};

export const elementalPack: CreaturePack = {
  id: "fantasy-elementals",
  name: "Fantasy Elementals Pack",
  description: "Living primordial energy from the inner planes.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: elementalEntries,
};

export const constructPack: CreaturePack = {
  id: "fantasy-constructs",
  name: "Fantasy Constructs Pack",
  description: "Automatons, golems, and mechanical guardians.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: constructEntries,
};

export const giantPack: CreaturePack = {
  id: "fantasy-giants",
  name: "Fantasy Giants Pack",
  description: "Titans, trolls, ogres, and elemental colossi.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: giantEntries,
};

export const oozePack: CreaturePack = {
  id: "fantasy-oozes",
  name: "Fantasy Oozes Pack",
  description: "Corrosive slimes, jellies, and subterranean scavengers.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: oozeEntries,
};

export const plantPack: CreaturePack = {
  id: "fantasy-plants",
  name: "Fantasy Plants Pack",
  description: "Sentient fungi, carnivorous blossoms, and animated trees.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: plantEntries,
};

export const celestialPack: CreaturePack = {
  id: "fantasy-celestials",
  name: "Fantasy Celestials Pack",
  description: "Angels, divine messengers, and holy guardians.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: celestialEntries,
};

export const goblinoidPack: CreaturePack = {
  id: "fantasy-goblinoids",
  name: "Fantasy Goblinoids Pack",
  description: "Goblins, hobgoblins, bugbears, and their war beasts.",
  genre: "fantasy",
  parentPackId: "fantasy-bestiary",
  credits: CREDITS,
  entries: goblinoidEntries,
};

export const themedPacks: CreaturePack[] = [
  beastPack,
  undeadPack,
  humanoidPack,
  monstrosityPack,
  aberrationPack,
  fiendPack,
  dragonPack,
  feyPack,
  elementalPack,
  constructPack,
  giantPack,
  oozePack,
  plantPack,
  celestialPack,
  goblinoidPack,
];
