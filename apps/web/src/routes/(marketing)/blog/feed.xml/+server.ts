import { renderBlogFeed } from "$lib/seo/editorial-feed";
import { FEED_HEADERS } from "$lib/seo/feed";

// fallow-ignore-next-line unused-export
export const prerender = true;

export function GET() {
  return new Response(renderBlogFeed(), { headers: FEED_HEADERS });
}
