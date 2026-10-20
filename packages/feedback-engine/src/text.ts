/** Ranges stripped from reports: control characters (tab, newline and carriage return kept), zero-width, bidi overrides, BOM. */
const STRIPPED_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];

const isStripped = (code: number): boolean =>
  STRIPPED_RANGES.some(([low, high]) => code >= low && code <= high);

export function normaliseText(value: string): string {
  let kept = "";
  for (const character of value.normalize("NFC")) {
    if (!isStripped(character.codePointAt(0) ?? 0)) kept += character;
  }
  return kept.replace(/\r\n?/g, "\n").trim();
}
