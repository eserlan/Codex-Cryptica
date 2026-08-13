import type { CreaturePack } from "./types.js";
import { fantasyBestiary } from "./packs/fantasy-bestiary.js";
import { themedPacks } from "./packs/themed-packs.js";
import { scifiPacks } from "./packs/scifi-bestiary.js";
import { cyberpunkPacks } from "./packs/cyberpunk-bestiary.js";
import { apocalypticPacks } from "./packs/apocalyptic-bestiary.js";
import { horrorPacks } from "./packs/horror-bestiary.js";
import { steampunkPacks } from "./packs/steampunk-bestiary.js";

const PACKS: CreaturePack[] = [
  fantasyBestiary,
  ...themedPacks,
  ...scifiPacks,
  ...cyberpunkPacks,
  ...apocalypticPacks,
  ...horrorPacks,
  ...steampunkPacks,
];

export function listPacks(): CreaturePack[] {
  return PACKS;
}

export function getPack(id: string): CreaturePack | undefined {
  return PACKS.find((p) => p.id === id);
}
