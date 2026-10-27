import { escapeXml } from "../../apps/web/src/lib/seo/feed";

/** One published episode, as stored in the episode index and rendered into the feed. */
export interface Episode {
  guid: string;
  slug: string;
  title: string;
  pageUrl: string;
  description: string;
  html: string;
  /** ISO timestamp of first publication; never changes once stored. */
  pubDate: string;
  audioUrl: string;
  bytes: number;
  duration: number;
  artworkUrl?: string;
}

export interface Channel {
  title: string;
  link: string;
  description: string;
  email: string;
  artworkUrl: string;
}

export const FEED_ITEM_LIMIT = 50;

const https = (url: string): boolean => new URL(url).protocol === "https:";

export function validateEpisode(value: unknown): Episode {
  const episode = value as Episode;
  const valid = [
    typeof episode?.guid === "string" && episode.guid.length > 0,
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(episode?.slug)),
    ...(["title", "pageUrl", "description", "html", "audioUrl"] as const).map(
      (key) =>
        typeof episode?.[key] === "string" && episode[key].trim().length > 0,
    ),
    Number.isFinite(Date.parse(String(episode?.pubDate))),
    Number.isSafeInteger(episode?.bytes) && episode.bytes > 0,
    Number.isFinite(episode?.duration) && episode.duration > 0,
  ];
  if (!valid.every(Boolean)) throw new Error("Invalid podcast episode");
  for (const url of [episode.pageUrl, episode.audioUrl, episode.artworkUrl])
    if (url !== undefined && !https(url))
      throw new Error("Podcast episode URLs must use HTTPS");
  return episode;
}

function renderItem(episode: Episode): string {
  const html = episode.html.replaceAll("]]>", "]]]]><![CDATA[>");
  const artwork = episode.artworkUrl
    ? `<itunes:image href="${escapeXml(episode.artworkUrl)}"/>`
    : "";
  return [
    "<item>",
    `<title>${escapeXml(episode.title)}</title>`,
    `<link>${escapeXml(episode.pageUrl)}</link>`,
    `<guid isPermaLink="false">${escapeXml(episode.guid)}</guid>`,
    `<pubDate>${new Date(episode.pubDate).toUTCString()}</pubDate>`,
    `<description>${escapeXml(episode.description)}</description>`,
    `<content:encoded><![CDATA[${html}]]></content:encoded>`,
    `<enclosure url="${escapeXml(episode.audioUrl)}" length="${episode.bytes}" type="audio/mpeg"/>`,
    `<itunes:duration>${Math.ceil(episode.duration)}</itunes:duration>`,
    artwork,
    "</item>",
  ].join("");
}

/** Newest first, capped; a GUID may appear only once. */
export function renderFeed(channel: Channel, episodes: Episode[]): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(channel.email))
    throw new Error("A public podcast ownership email is required");
  if (![channel.link, channel.artworkUrl].every(https))
    throw new Error("Podcast channel URLs must use HTTPS");
  const guids = new Set<string>();
  for (const episode of episodes) {
    validateEpisode(episode);
    if (guids.has(episode.guid))
      throw new Error(`Duplicate podcast GUID: ${episode.guid}`);
    guids.add(episode.guid);
  }
  const items = [...episodes]
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, FEED_ITEM_LIMIT)
    .map(renderItem);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${escapeXml(channel.title)}</title><link>${escapeXml(channel.link)}</link><description>${escapeXml(channel.description)}</description><language>en</language><itunes:author>Codex Cryptica</itunes:author><itunes:owner><itunes:name>Codex Cryptica</itunes:name><itunes:email>${escapeXml(channel.email)}</itunes:email></itunes:owner><itunes:image href="${escapeXml(channel.artworkUrl)}"/><itunes:category text="Leisure"/><itunes:explicit>false</itunes:explicit><itunes:block>yes</itunes:block>${items.join("\n")}</channel></rss>\n`;
}
