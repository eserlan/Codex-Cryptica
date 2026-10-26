import { renderBlogFeed } from "#lib/seo/editorial-feed.js";
import { FEED_HEADERS } from "#lib/seo/feed.js";

// fallow-ignore-next-line unused-export
export const prerender = true;

export async function GET() {
  return new Response(await renderBlogFeed(), { headers: FEED_HEADERS });
}
