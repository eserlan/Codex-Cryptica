export function clipText(value: string, limit: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, Math.max(0, limit - 1))}…`;
}

/** Append a non-empty, unique summary after applying the brief's text limit. */
export function appendUniqueClipped(
  items: string[],
  value: string,
  limit: number,
): void {
  const clipped = clipText(value, limit);
  if (clipped && !items.includes(clipped)) items.push(clipped);
}
