import { renderAnswersFeed } from "#lib/seo/editorial-feed.js";
import { FEED_HEADERS } from "#lib/seo/feed.js";

// fallow-ignore-next-line unused-export
export const prerender = true;

export function GET() {
  return new Response(renderAnswersFeed(), { headers: FEED_HEADERS });
}
