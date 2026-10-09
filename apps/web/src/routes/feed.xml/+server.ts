import { renderCombinedFeed } from "$lib/seo/editorial-feed";
import { FEED_HEADERS } from "$lib/seo/feed";

// fallow-ignore-next-line unused-export
export const prerender = true;

export async function GET() {
  return new Response(await renderCombinedFeed(), { headers: FEED_HEADERS });
}
