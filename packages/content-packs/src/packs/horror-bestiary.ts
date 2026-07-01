import type { CreaturePack } from "../types.js";
import { horrorUndeadEntries } from "./entries/horror-undead-entries.js";
import { horrorEldritchEntries } from "./entries/horror-eldritch-entries.js";

const CREDITS =
  "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)";

export const horrorUndeadPack: CreaturePack = {
  id: "horror-undead-pack",
  name: "Gothic Horror Undead Pack",
  description: "Vampire lords, stalking wraiths, and weeping maidens.",
  genre: "horror",
  parentPackId: "horror-bestiary",
  credits: CREDITS,
  entries: horrorUndeadEntries,
};

export const horrorEldritchPack: CreaturePack = {
  id: "horror-eldritch-pack",
  name: "Eldritch & Cosmic Horror Pack",
  description: "Deep shoggoths, sanity devourers, and eyestalk horrors.",
  genre: "horror",
  parentPackId: "horror-bestiary",
  credits: CREDITS,
  entries: horrorEldritchEntries,
};

export const horrorBestiary: CreaturePack = {
  id: "horror-bestiary",
  name: "Gothic & Eldritch Horror Bestiary",
  description:
    "Twenty system-neutral vampire lords, cosmic abominations, and supernatural terrors for dark fantasy and investigation campaigns.",
  genre: "horror",
  credits: CREDITS,
  entries: [...horrorUndeadEntries, ...horrorEldritchEntries],
};

export const horrorPacks: CreaturePack[] = [
  horrorBestiary,
  horrorUndeadPack,
  horrorEldritchPack,
];
