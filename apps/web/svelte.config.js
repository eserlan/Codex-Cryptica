import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Using adapter-static to generate a fully static site suitable for Cloudflare Pages (no SSR, only prerendered assets).
    // Cloudflare Pages serves static files directly, and the fallback index.html supports SPA routing for the app shell.
    // See https://svelte.dev/docs/kit/adapters for more information about adapter-static and other deployment targets.
    adapter: adapter({
      fallback: "index.html",
      strict: false,
    }),
    prerender: {
      entries: ["/", "/features", "/terms", "/privacy", "/blog"],
      handleUnseenRoutes: "ignore",
      handleHttpError: ({ path, message }) => {
        // llms.txt is a static file served at the domain root; ignore 404s
        // that arise during prerendering of optional static entries.
        if (path.endsWith("/llms.txt")) return;
        throw new Error(message);
      },
    },
    alias: {
      $stores: "src/lib/stores",
      $workers: "src/workers",
    },
  },
};

export default config;
