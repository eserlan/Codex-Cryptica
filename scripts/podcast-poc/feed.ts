import { escapeXml } from "../../apps/web/src/lib/seo/feed";

export interface Fixture {
  id: string;
  title: string;
  date: string;
  narration: string;
  artworkUrl?: string;
  description: string;
  html: string;
}
export interface Episode extends Fixture {
  audioUrl: string;
  bytes: number;
  duration: number;
}
export interface Metadata {
  email: string;
  baseUrl: string;
  artworkUrl: string;
}

function validateText(value: Fixture): void {
  for (const key of ["title", "narration", "description", "html"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim())
      throw new Error(`Missing ${key}`);
  }
}

export function validateFixture(value: Fixture): void {
  if (
    !value ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id) ||
    !Number.isFinite(Date.parse(value.date))
  )
    throw new Error("Invalid fixture ID or date");
  validateText(value);
}

function validateEnclosure(item: Episode): void {
  const valid = [
    Number.isSafeInteger(item.bytes),
    item.bytes > 0,
    Number.isFinite(item.duration),
    item.duration > 0,
    new URL(item.audioUrl).protocol === "https:",
  ];
  if (!valid.every(Boolean)) throw new Error("Invalid enclosure");
}

function renderArtwork(url?: string): string {
  if (!url) return "";
  if (new URL(url).protocol !== "https:")
    throw new Error("Episode artwork must use HTTPS");
  return `<itunes:image href="${escapeXml(url)}"/>`;
}

export function renderFeed(meta: Metadata, episodes: Episode[]): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(meta.email))
    throw new Error("A public ownership email is required");
  for (const url of [meta.baseUrl, meta.artworkUrl])
    if (new URL(url).protocol !== "https:")
      throw new Error("HTTPS URLs required");
  const ids = new Set<string>();
  const items = episodes.map((item) => {
    validateFixture(item);
    if (ids.has(item.id)) throw new Error("Duplicate fixture ID");
    ids.add(item.id);
    validateEnclosure(item);
    const art = renderArtwork(item.artworkUrl);
    const html = item.html.replaceAll("]]>", "]]]]><![CDATA[>");
    return `<item><title>${escapeXml(item.title)}</title><guid isPermaLink="false">codex-cryptica-release-poc:${item.id}</guid><pubDate>${new Date(item.date).toUTCString()}</pubDate><description>${escapeXml(item.description)}</description><content:encoded><![CDATA[${html}]]></content:encoded><enclosure url="${escapeXml(item.audioUrl)}" length="${item.bytes}" type="audio/mpeg"/><itunes:duration>${Math.ceil(item.duration)}</itunes:duration>${art}</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Codex Cryptica podcast sync experiment</title><link>${escapeXml(meta.baseUrl)}</link><description>Fictional release updates for a podcast sync experiment.</description><language>en</language><itunes:author>Codex Cryptica</itunes:author><itunes:owner><itunes:name>Codex Cryptica</itunes:name><itunes:email>${escapeXml(meta.email)}</itunes:email></itunes:owner><itunes:image href="${escapeXml(meta.artworkUrl)}"/><itunes:category text="Leisure"/><itunes:explicit>false</itunes:explicit><itunes:block>yes</itunes:block>${items.join("\n")}</channel></rss>\n`;
}
