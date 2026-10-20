/** Crockford base32: no I, L, O or U, so a reference reads aloud and copies cleanly. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REFERENCE = /^CC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/**
 * Creates a reference from 8 random bytes. Each byte is masked to 5 bits, so the
 * 32-character alphabet is used without bias.
 */
export function createReference(
  random: (length: number) => Uint8Array,
): string {
  const bytes = random(8);
  let chars = "";
  for (let i = 0; i < 8; i++) chars += ALPHABET[(bytes[i] ?? 0) & 31];
  return `CC-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function isReference(value: string): boolean {
  return REFERENCE.test(value);
}
