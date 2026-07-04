import { type Rng, pickFrom } from "./random-utils";

export const REALM_ROOTS = [
  "Ashenveil",
  "Stonemark",
  "Duskwall",
  "Irongate",
  "Coldmere",
  "Blackthorn",
  "Salthaven",
  "Greymarch",
  "Embervale",
  "Cinderfall",
  "Hollowreach",
  "Dunmere",
  "Thornwall",
  "Wraithfen",
  "Brokenridge",
  "Dawnspire",
  "Moorholt",
  "Saltfang",
  "Stormbreak",
  "Halveth",
  "Vorreth",
  "Kaelthas",
  "Myreth",
  "Vorath",
  "Dunrath",
  "Solvane",
  "Krethis",
  "Aelvorn",
  "Norrith",
  "Caldreth",
];

export const CAPITAL_WORDS = [
  "Veth",
  "Dorn",
  "Rath",
  "Moor",
  "Holt",
  "Fen",
  "Wick",
  "Crest",
  "Gate",
  "Hold",
  "Keep",
  "Reach",
  "Wall",
  "Ford",
  "Vale",
];

export function buildRealmName(polityType: string, rng: Rng): string {
  return `The ${pickFrom(REALM_ROOTS, rng)} ${polityType}`;
}

export function buildCapitalName(rng: Rng): string {
  const a = pickFrom(REALM_ROOTS, rng).replace(/\s.*/, "").slice(0, 5);
  const b = pickFrom(CAPITAL_WORDS, rng);
  return `${a}${b.toLowerCase()}`;
}
