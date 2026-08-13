export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

export function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickRandomItems<T>(
  arr: readonly T[],
  count: number,
  rng: Rng = defaultRng,
): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const PLACEHOLDER_NAME_PREFIXES = [
  "Ael",
  "Bran",
  "Cael",
  "Dax",
  "Kael",
  "Morg",
  "Thor",
  "Vael",
];
const PLACEHOLDER_NAME_SUFFIXES = [
  "dar",
  "wen",
  "ric",
  "mar",
  "thas",
  "gar",
  "rin",
  "on",
];

export function generatePlaceholderName(rng: Rng = defaultRng): string {
  return `${pickFrom(PLACEHOLDER_NAME_PREFIXES, rng)}${pickFrom(PLACEHOLDER_NAME_SUFFIXES, rng)}`;
}
