export function firstMetadataValue(
  metadata: Record<string, unknown>,
  keys: string[],
): unknown {
  return keys.map((key) => metadata[key]).find(Boolean);
}

function cleanQuoteString(str: string): string {
  return str
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/^["“'«]+|["”'»]+$/g, "")
    .trim();
}

function truncateQuote(str: string, maxLength: number): string {
  return str.length > maxLength
    ? `${str.slice(0, maxLength - 1).trimEnd()}…`
    : str;
}

function quoteFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  maxLength: number,
): string | undefined {
  const value = firstMetadataValue(metadata ?? {}, [
    "quote",
    "tagline",
    "motto",
    "sitat",
  ]);
  if (typeof value !== "string" || !value.trim()) return undefined;
  const cleaned = cleanQuoteString(value.trim());
  return cleaned ? truncateQuote(cleaned, maxLength) : undefined;
}

function quoteFromBlockquote(
  lines: string[],
  maxLength: number,
): string | undefined {
  const quoteLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith(">")) {
      if (quoteLines.length > 0) break;
      continue;
    }
    quoteLines.push(line.replace(/^>+\s?/, ""));
  }
  const cleaned = cleanQuoteString(quoteLines.join(" "));
  return cleaned ? truncateQuote(cleaned, maxLength) : undefined;
}

function quoteFromWrappedText(
  content: string,
  maxLength: number,
): string | undefined {
  const match = content.match(/["“«]([^"”»\n]+(?:\n[^"”»\n]+)?)["”»]/);
  const candidate = match?.[1].replace(/\s+/g, " ").trim();
  if (!candidate || candidate.length < 3 || candidate.startsWith("#"))
    return undefined;
  const cleaned = cleanQuoteString(candidate);
  return cleaned ? truncateQuote(cleaned, maxLength) : undefined;
}

function quoteFromQuotedLine(
  lines: string[],
  maxLength: number,
): string | undefined {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("#") ||
      !/^[*_]*["“'«].+["”'»][*_]*$/.test(line)
    )
      continue;
    const cleaned = cleanQuoteString(line);
    if (cleaned) return truncateQuote(cleaned, maxLength);
  }
  return undefined;
}

/**
 * An author-written quote: markdown blockquote (`> …`), explicit quoted line, or metadata quote.
 */
export function extractQuote(
  content: string | undefined | null,
  metadata?: Record<string, unknown> | null,
  maxLength = 140,
): string | undefined {
  const metadataQuote = quoteFromMetadata(metadata, maxLength);
  if (metadataQuote) return metadataQuote;
  if (!content) return undefined;
  const lines = content.split("\n");
  return (
    quoteFromBlockquote(lines, maxLength) ??
    quoteFromWrappedText(content, maxLength) ??
    quoteFromQuotedLine(lines, maxLength)
  );
}

export function formatCoordinates(
  metadata:
    { coordinates?: { x: number; y: number } | undefined } | undefined | null,
): string | undefined {
  const coordinates = metadata?.coordinates;
  if (
    !coordinates ||
    !Number.isFinite(coordinates.x) ||
    !Number.isFinite(coordinates.y)
  ) {
    return undefined;
  }
  return `${coordinates.x}, ${coordinates.y}`;
}

/**
 * Subtitle line for character and entity cards (e.g. "Menneske · Kriger" or "Halvalv · Magiker").
 */
export function extractEntitySubtitle(
  entity:
    | {
        type?: string | null;
        kind?: string | null;
        labels?: string[] | null;
        content?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | undefined
    | null,
): string {
  if (!entity) return "";
  const meta = entity.metadata as
    Record<string, string | undefined> | undefined;
  const metadataSubtitle = combineSubtitle(
    firstValue(meta, ["ancestry", "race", "rase", "species"]),
    firstValue(meta, [
      "class",
      "klasse",
      "role",
      "yrke",
      "profession",
      "occupation",
    ]),
  );
  if (metadataSubtitle) return metadataSubtitle;
  const contentSubtitle = subtitleFromContent(entity.content);
  if (contentSubtitle) return contentSubtitle;
  const labelSubtitle = subtitleFromLabels(entity.labels);
  if (labelSubtitle) return labelSubtitle;
  if (entity.kind) return entity.kind;
  return entity.type
    ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1)
    : "";
}

function firstValue(
  record: Record<string, string | undefined> | undefined,
  keys: string[],
): string {
  return keys.map((key) => record?.[key]).find(Boolean) ?? "";
}

function combineSubtitle(ancestry: string, role: string): string {
  if (ancestry && role) return `${ancestry} · ${role}`;
  return ancestry || role;
}

const ANCESTRY_KEYS = ["race", "ancestry", "rase", "species"];
const ROLE_KEYS = [
  "class",
  "klasse",
  "role",
  "yrke/rolle",
  "yrke",
  "profession",
  "occupation",
];
export const COMMON_ANCESTRIES = [
  "human",
  "menneske",
  "elf",
  "alv",
  "halvalv",
  "half-elf",
  "dwarf",
  "dverg",
  "halfling",
  "tiefling",
  "orc",
  "ork",
  "gnome",
];
const NON_ROLE_LABELS = new Set([
  "female",
  "male",
  "kvinne",
  "mann",
  "ally",
  "alliert",
  "enemy",
  "fiende",
  "party",
  "partyet",
  "neutral",
  "nøytral",
  "character",
]);

function subtitleFromContent(content: string | null | undefined): string {
  if (!content) return "";
  let ancestry = "";
  let role = "";
  for (const line of content.split("\n")) {
    const match = line
      .trim()
      .match(/^(?:[-*•]\s*)?\*{0,2}([^*:]+)\*{0,2}[:-]\s*(.+)$/);
    if (!match) continue;
    const key = match[1].replace(/[*_`]/g, "").trim().toLowerCase();
    const value = match[2].replace(/[*_`]/g, "").trim();
    if (!ancestry && ANCESTRY_KEYS.includes(key)) ancestry = value;
    if (!role && ROLE_KEYS.includes(key)) role = value;
  }
  return combineSubtitle(ancestry, role);
}

function subtitleFromLabels(labels: string[] | null | undefined): string {
  let ancestry = "";
  let role = "";
  for (const label of labels ?? []) {
    const lower = label.toLowerCase();
    if (!ancestry && COMMON_ANCESTRIES.some((item) => lower.includes(item)))
      ancestry = label;
    else if (!role && !NON_ROLE_LABELS.has(lower)) role = label;
  }
  return combineSubtitle(ancestry, role);
}
