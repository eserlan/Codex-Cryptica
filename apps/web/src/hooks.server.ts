import type { Handle } from "@sveltejs/kit";

/**
 * Note: This hook only affects local development (Vite dev server) and prerendering output.
 * In production (Cloudflare Pages), these headers are enforced by `static/_headers`.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups",
  );
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  return response;
};
