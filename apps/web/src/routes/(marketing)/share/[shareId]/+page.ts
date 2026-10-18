import type { PageLoad } from "./$types";

// Share IDs are created after deployment, so the page uses the static SPA
// fallback and loads the immutable snapshot from the worker in the browser.
export const ssr = false;
export const prerender = false;

export const load: PageLoad = ({ params }) => ({ shareId: params.shareId });
