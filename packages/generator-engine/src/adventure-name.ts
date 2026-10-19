/** Name matching shared by the staged Adventure Idea modules. */

export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Whether two names refer to the same thing: equal once case, "the" and
 * punctuation are ignored, or one contains the other ("Assay Office" and
 * "the Old Assay Office"). Containment needs at least 4 characters so a
 * short word cannot match everything.
 */
export function sameName(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && ` ${long} `.includes(` ${short} `);
}
