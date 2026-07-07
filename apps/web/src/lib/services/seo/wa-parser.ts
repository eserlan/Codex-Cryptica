export type EntityType =
  "character" | "creature" | "location" | "item" | "event" | "faction" | "note";

export interface ParsedEntity {
  type: EntityType;
  title: string;
  content: string;
  labels: string[];
}

/** Convert World Anvil BBCode-style internal links to [[wiki links]]. */
export function cleanWaLinks(text: string): string {
  // [article:UUID|Display Text] → [[Display Text]]
  text = text.replace(/\[article:[^\]|]+\|([^\]]+)\]/g, "[[$1]]");
  // [article:UUID] → drop (no display text to preserve)
  text = text.replace(/\[article:[^\]]+\]/g, "");
  // [url:some-url|Display Text] → [Display Text](some-url)
  text = text.replace(/\[url:([^\]|]+)\|([^\]]+)\]/g, "[$2]($1)");
  // @[Display Text](article:UUID) → [[Display Text]]
  text = text.replace(/@\[([^\]]+)\]\(article:[^)]+\)/g, "[[$1]]");
  return text;
}

/** Strip HTML and convert basic formatting to Markdown. */
export function cleanHtml(html: string): string {
  if (!html) return "";
  return (
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p>/gi, "")
      .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => {
        return "#".repeat(Number(level)) + " " + text + "\n";
      })
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i>(.*?)<\/i>/gi, "*$1*")
      .replace(
        /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
        "[$2]($1)",
      )
      .replace(/<[^>]*>/g, "")
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Map a World Anvil template string to a CC entity type. */
export function mapWaTemplate(template: string): EntityType {
  const t = template.toLowerCase();
  if (t.includes("character") || t.includes("person") || t.includes("npc"))
    return "character";
  if (t.includes("creature") || t.includes("monster") || t.includes("beast"))
    return "creature";
  if (
    t.includes("location") ||
    t.includes("settlement") ||
    t.includes("landmark") ||
    t.includes("geography")
  )
    return "location";
  if (t.includes("item") || t.includes("weapon") || t.includes("vehicle"))
    return "item";
  if (t.includes("event") || t.includes("myth") || t.includes("legend"))
    return "event";
  if (
    t.includes("organization") ||
    t.includes("faction") ||
    t.includes("military")
  )
    return "faction";
  return "note";
}

/** Parse a World Anvil JSON export into CC entities. */
export function parseWaExport(raw: unknown): ParsedEntity[] {
  if (!raw || typeof raw !== "object") return [];

  const articles: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any).articles)
      ? (raw as any).articles
      : Object.values(raw as object);

  const results: ParsedEntity[] = [];

  for (const item of articles) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;

    const title = String(a.title || a.name || "Untitled Article").trim();
    const rawBody = String(a.body || a.content || a.content_parsed || "");
    const template = String(a.template || a.entity_class || "").trim();

    const htmlCleaned = cleanHtml(rawBody);
    const content = cleanWaLinks(htmlCleaned);
    const type = mapWaTemplate(template);

    results.push({
      type,
      title,
      content,
      labels: ["world-anvil-import", template].filter(Boolean),
    });
  }

  return results;
}
