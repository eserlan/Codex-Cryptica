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
      entries: [
        "/",
        "/help",
        "/features",
        "/terms",
        "/privacy",
        "/blog",
        "/sitemap.xml",
        "/tools",
        "/free-rpg-campaign-manager",
        "/worldbuilding-tool",
        "/ai-rpg-campaign-manager",
        "/tools/dnd-npc-generator",
        "/tools/faction-generator",
        "/tools/quest-hook-generator",
        "/tools/fantasy-name-generator",
        "/solutions/campaign-manager",
        "/solutions/worldbuilding-tool",
        "/solutions/ai-gm-assistant",
        "/solutions/local-first-rpg",
        "/solutions/ai-dm-assistant",
        "/solutions/ai-worldbuilding-tool",
        "/solutions/rpg-knowledge-graph",
        "/solutions/offline-rpg-campaign-manager",
        "/solutions/local-first-worldbuilding-tool",
        "/vs/obsidian",
        "/vs/world-anvil",
        "/vs/legendkeeper",
        "/vs/kanka-alternative",
        "/generators/npc",
        "/generators/settlement",
        "/generators/magic-item",
        "/generators/faction",
      ],
      handleUnseenRoutes: "ignore",
      handleHttpError: ({ path, message }) => {
        // Ignore static assets/metadata files that return 404 during local crawling
        if (
          path === "/app" ||
          path.startsWith("/app/") ||
          path.endsWith("/llms.txt") ||
          path.endsWith("/favicon.png") ||
          path.endsWith("/logo.png") ||
          path.endsWith("/manifest.webmanifest") ||
          path.includes("/images/")
        ) {
          return;
        }
        throw new Error(message);
      },
    },
    alias: {
      $stores: "src/lib/stores",
      $workers: "src/workers",
      $types: "src/types",
    },
  },
};

export default config;
