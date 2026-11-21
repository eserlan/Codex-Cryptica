function words(s: string): Set<string> {
  const normalized = s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return new Set(normalized.split(" ").filter(Boolean));
}

function tokens(s: string): Set<string> {
  return new Set([...words(s)].filter((token) => token.length >= 4));
}

/** Key text A is "found" in B when ≥60% of A's distinct tokens appear in B. */
export function textFoundIn(a: string, b: string): boolean {
  const aTokens = tokens(a);
  if (aTokens.size === 0) return false;
  const bTokens = tokens(b);
  let found = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) found += 1;
  }
  return found / aTokens.size >= 0.6;
}

export function normaliseText(s: string): string {
  return s.trim().toLowerCase();
}

export function containsTokens(value: string, expected: string): boolean {
  const expectedTokens = words(expected);
  if (expectedTokens.size === 0) return false;
  const valueTokens = words(value);
  return [...expectedTokens].every((token) => valueTokens.has(token));
}
