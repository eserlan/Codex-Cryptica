import type { CreaturePack } from "../types.js";
import { allEntries } from "./entries/index.js";

export const fantasyBestiary: CreaturePack = {
  id: "fantasy-bestiary",
  name: "Classic Fantasy Bestiary",
  description:
    "Three hundred system-neutral creatures that populate any fantasy world — organized into modular themed packs from beasts to celestials.",
  genre: "fantasy",
  credits: "Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)",
  entries: allEntries,
};
