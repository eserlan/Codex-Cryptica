/**
 * Atom 1.0 feeds for intentionally published editorial content (Answers and
 * blog posts). Pure functions: routes gather the entries, this renders them.
 * Kept free of `$lib` aliases so the rendering stays trivially testable.
 */

export type FeedContentType = "answer" | "blog";

export interface FeedEntry {
  title: string;
  /** Absolute canonical URL. Doubles as the stable entry id. */
  url: string;
  /** ISO date or datetime. */
  publishedAt: string;
  /** Only when the content was materially revised; falls back to publishedAt. */
  updatedAt?: string;
  summary: string;
  contentType: FeedContentType;
  categories: string[];
  author?: string;
}

export interface FeedMeta {
  title: string;
  subtitle: string;
  /** Feed-level author applies to entries that do not declare their own. */
  author: string;
  /** Absolute URL of the feed itself. */
  selfUrl: string;
  /** Absolute URL of the human-readable page the feed mirrors. */
  siteUrl: string;
}

export const escapeXml = (value: string): string =>
  value
    // Keep only characters allowed by XML 1.0, including rejecting lone
    // surrogates and the two noncharacters at the end of the BMP.
    .replace(
      // eslint-disable-next-line no-control-regex
      /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,
      "",
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toIso = (value: string): string => new Date(value).toISOString();

const timeOf = (value: string): number => new Date(value).getTime();

const hasValidDate = (value: string): boolean => Number.isFinite(timeOf(value));

const updatedAtOf = (entry: FeedEntry): string =>
  entry.updatedAt && hasValidDate(entry.updatedAt)
    ? entry.updatedAt
    : entry.publishedAt;

/** Newest first; ties broken by URL so output is deterministic. */
export const sortFeedEntries = (entries: FeedEntry[]): FeedEntry[] =>
  [...entries].sort(
    (a, b) =>
      timeOf(b.publishedAt) - timeOf(a.publishedAt) ||
      a.url.localeCompare(b.url),
  );

const renderEntry = (entry: FeedEntry): string => {
  const updated = updatedAtOf(entry);
  const categories = [entry.contentType, ...entry.categories]
    .filter((term, index, all) => term && all.indexOf(term) === index)
    .map((term) => `    <category term="${escapeXml(term)}"/>`);
  return [
    "  <entry>",
    `    <id>${escapeXml(entry.url)}</id>`,
    `    <title>${escapeXml(entry.title)}</title>`,
    `    <link rel="alternate" type="text/html" href="${escapeXml(entry.url)}"/>`,
    `    <published>${toIso(entry.publishedAt)}</published>`,
    `    <updated>${toIso(updated)}</updated>`,
    ...(entry.author
      ? [`    <author><name>${escapeXml(entry.author)}</name></author>`]
      : []),
    `    <summary>${escapeXml(entry.summary)}</summary>`,
    ...categories,
    "  </entry>",
  ].join("\n");
};

export const renderAtomFeed = (
  meta: FeedMeta,
  entries: FeedEntry[],
): string => {
  // Remote blog indexes are a content boundary. Ignore entries with malformed
  // publication dates rather than letting one bad record break prerendering.
  const sorted = sortFeedEntries(
    entries.filter((entry) => hasValidDate(entry.publishedAt)),
  );
  const feedUpdated = sorted.reduce(
    (latest, entry) => Math.max(latest, timeOf(updatedAtOf(entry))),
    0,
  );
  // An empty feed still needs a valid <updated>; use the epoch, not "now",
  // so the build output stays deterministic.
  const updated = new Date(feedUpdated).toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(meta.selfUrl)}</id>
  <title>${escapeXml(meta.title)}</title>
  <subtitle>${escapeXml(meta.subtitle)}</subtitle>
  <author><name>${escapeXml(meta.author)}</name></author>
  <link rel="self" type="application/atom+xml" href="${escapeXml(meta.selfUrl)}"/>
  <link rel="alternate" type="text/html" href="${escapeXml(meta.siteUrl)}"/>
  <updated>${updated}</updated>
${sorted.map(renderEntry).join("\n")}
</feed>
`;
};

export const FEED_HEADERS = {
  "Content-Type": "application/atom+xml; charset=utf-8",
  "Cache-Control": "max-age=0, s-maxage=3600",
} as const;
