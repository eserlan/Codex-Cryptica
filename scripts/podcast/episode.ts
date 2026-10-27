import { parseInlineLinks } from "../../apps/web/src/lib/content/answers/inline-links";
import { answerPath } from "../../apps/web/src/lib/content/answers/registry";
import type { AnswerConfig } from "../../apps/web/src/lib/content/answers/schema";

export const SITE_URL = "https://codexcryptica.com";
export const ASSET_URL = "https://assets.codexcryptica.com";

/**
 * Everything an episode says, derived only from the answer's own reviewed
 * text. Nothing here is newly written copy, so a merged answer needs no
 * further approval before it reaches the public feed.
 */
export interface EpisodeContent {
  guid: string;
  slug: string;
  title: string;
  pageUrl: string;
  narration: string;
  description: string;
  html: string;
  imageUrl: string;
  imageAlt: string;
}

export const episodeGuid = (slug: string): string =>
  `codex-cryptica:answer:${slug}`;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const absolute = (href: string): string =>
  href.startsWith("/") ? `${SITE_URL}${href}` : href;

/** Authored text without its markdown-style link syntax, for speech. */
export const plainText = (source: string): string =>
  parseInlineLinks(source)
    .map((segment) => segment.text)
    .join("");

/** Authored text as escaped HTML, with its inline links as absolute anchors. */
export const richText = (source: string): string =>
  parseInlineLinks(source)
    .map((segment) =>
      segment.kind === "link"
        ? `<a href="${escapeHtml(absolute(segment.href))}">${escapeHtml(segment.text)}</a>`
        : escapeHtml(segment.text),
    )
    .join("");

/** A 1400 × 1400 square of an R2 image via Cloudflare Image Resizing. */
export function squareArtwork(imageUrl: string): string | undefined {
  if (!imageUrl.startsWith(`${ASSET_URL}/`)) return undefined;
  const path = imageUrl.slice(ASSET_URL.length);
  if (path.startsWith("/cdn-cgi/")) return imageUrl;
  return `${ASSET_URL}/cdn-cgi/image/width=1400,height=1400,fit=cover,format=jpeg${path}`;
}

export function buildEpisodeContent(
  answer: AnswerConfig,
  { includeImage = true }: { includeImage?: boolean } = {},
): EpisodeContent {
  const path = answerPath(answer);
  const pageUrl = path.startsWith("https://") ? path : absolute(path);
  const imageUrl = answer.seo.image ?? `${ASSET_URL}/og/${answer.slug}.jpg`;
  const imageAlt = answer.seo.imageAlt ?? plainText(answer.question);
  const headings = answer.sections
    .map((section) => section.heading)
    .filter((heading): heading is string => Boolean(heading));
  const html = [
    includeImage
      ? `<p><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" /></p>`
      : "",
    `<p>${richText(answer.shortAnswer)}</p>`,
    headings.length
      ? `<h2>In the full answer</h2><ul>${headings
          .map((heading) => `<li>${richText(heading)}</li>`)
          .join("")}</ul>`
      : "",
    `<p><a href="${escapeHtml(pageUrl)}">Read the full answer on Codex Cryptica.</a></p>`,
  ].join("");
  return {
    guid: episodeGuid(answer.slug),
    slug: answer.slug,
    title: plainText(answer.question),
    pageUrl,
    narration: `${plainText(answer.question)} ${plainText(answer.shortAnswer)} Read the full answer at Codex Cryptica.`,
    description: plainText(answer.seo.description),
    html,
    imageUrl,
    imageAlt,
  };
}
