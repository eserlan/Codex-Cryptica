const MAX_SEED_LENGTH = 32;
// Readable alphabet: no I, L, O, 0 or 1.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Trim and upper-case. Null when empty or longer than 32 characters. */
export function normalizeSeed(text: string): string | null {
  const seed = text.trim().toUpperCase();
  if (seed.length === 0 || seed.length > MAX_SEED_LENGTH) return null;
  return seed;
}

/** Turn 8 bytes of caller-supplied entropy into a readable seed such as "K7Q2-9FXM". */
export function formatSeed(entropy: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[(entropy[i] ?? 0) % ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}

/** FNV-1a over UTF-16 code units. Integer maths only, so it is identical on every device. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
