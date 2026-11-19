/** `secret` marks a line that is always GM-only, whatever its record's visibility. */
export type Line = [
  label: string,
  value: string | Iterable<string> | undefined,
  secret?: true,
  referenceIds?: readonly string[],
];

export function referenceLine(label: string, id: string | undefined): Line {
  return [label, id, undefined, id === undefined ? [] : [id]];
}

export function referenceLines(label: string, ids: string[] | undefined): Line {
  return [label, ids, undefined, ids];
}

/**
 * Joins labelled lines, copying at most `cap + 1` characters of source text.
 * One character over the cap is enough for admission to see that the excerpt
 * does not fit and to trim it, so oversized package fields (an unbounded scene
 * `body`, say) are never copied or serialised in full.
 */
export function buildText(lines: Iterable<Line>, cap: number): string {
  const out = new BoundedText(cap + 1);
  for (const [label, value] of lines) {
    if (out.full) break;
    const parts = lineParts(value);
    appendLine(out, label, parts);
  }
  return out.text;
}

/** A string that stops growing once it reaches `limit` characters. */
class BoundedText {
  text = "";
  constructor(private readonly limit: number) {}

  get full(): boolean {
    return this.text.length >= this.limit;
  }

  append(s: string): void {
    if (!this.full) this.text += s.slice(0, this.limit - this.text.length);
  }
}

function lineParts(value: Line[1]): Iterable<string> {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

function appendLine(
  out: BoundedText,
  label: string,
  parts: Iterable<string>,
): void {
  const iterator = parts[Symbol.iterator]();
  const firstPart = iterator.next();
  if (firstPart.done) return;
  if (out.text.length > 0) out.append("\n");
  out.append(`${label}: `);
  out.append(firstPart.value);
  for (;;) {
    const next = iterator.next();
    if (next.done) break;
    if (out.full) break;
    out.append("; ");
    out.append(next.value);
  }
}

/** Reads a line's parts into an array, stopping once they exceed `limit`. */
export function readLine(
  [label, value, secret, referenceIds]: Line,
  limit: number,
): Line {
  let parts: string | string[] | undefined;
  if (value === undefined || typeof value === "string") {
    parts = value;
  } else {
    parts = [];
    let length = 0;
    for (const part of value) {
      parts.push(part);
      length += part.length + 2;
      if (length > limit) break;
    }
  }
  return [label, parts, secret, referenceIds];
}
