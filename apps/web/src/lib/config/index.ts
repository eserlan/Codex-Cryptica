/**
 * Application-wide configuration and metadata
 */

const versionFromBuild =
  typeof __APP_VERSION__ === "string"
    ? __APP_VERSION__.split("+")[0]
    : undefined;

export const VERSION =
  import.meta.env.VITE_APP_VERSION ?? versionFromBuild ?? "0.27.18";
export const CODENAME = import.meta.env.VITE_APP_CODENAME ?? "Cryptica";

export const APP_NAME = "Codex Cryptica";
export const PATREON_URL = "https://patreon.com/EspenE";
export const DISCORD_URL = "https://discord.gg/5UUMCChF2u";

export const IS_STAGING =
  import.meta.env.VITE_APP_ENV === "staging" ||
  import.meta.env.MODE === "staging" ||
  (typeof window !== "undefined" &&
    (window.location.hostname.includes("staging") ||
      window.location.pathname.includes("/staging")));

export const SCHEMA_ORG = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://codexcryptica.com/#software",
      name: APP_NAME,
      description:
        "A free, local-first RPG campaign manager and worldbuilding workspace for private Markdown vaults, offline prep, spatial lore maps, timelines, and optional AI assistance.",
      applicationCategory: ["GameApplication", "UtilitiesApplication"],
      applicationSubCategory: ["RPG campaign manager", "worldbuilding tool"],
      operatingSystem: "Web browser",
      url: "https://codexcryptica.com/",
      browserRequirements:
        "Modern browser with Origin Private File System support",
      featureList: [
        "Local-first Markdown vaults",
        "World Anvil JSON migration import",
        "Offline RPG campaign management",
        "Private browser-local OPFS storage",
        "Interactive knowledge graph",
        "Spatial canvas and flowcharts",
        "Tactical map mode",
        "Era-based timelines",
        "Optional AI Lore Oracle; vault works fully without AI",
        "Google Drive syncing",
      ],
      keywords:
        "local-first RPG campaign manager, private worldbuilding tool, offline campaign notes, Markdown RPG vault, spatial lore graph, AI GM assistant, World Anvil alternative, Obsidian RPG alternative, Kanka alternative",
      storageRequirements: "Origin Private File System (OPFS)",
      softwareVersion: VERSION,
      isAccessibleForFree: true,
      image: "https://codexcryptica.com/og-image.png",
      screenshot: "https://codexcryptica.com/screenshots/living-lore-graph.png",
      privacyPolicy: "https://codexcryptica.com/privacy",
      termsOfService: "https://codexcryptica.com/terms",
      offers: {
        "@type": "Offer",
        price: 0,
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        "@id": "https://codexcryptica.com/#organization",
      },
      publisher: {
        "@type": "Organization",
        "@id": "https://codexcryptica.com/#organization",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://codexcryptica.com/#organization",
      name: "Codex Cryptica",
      url: "https://codexcryptica.com",
      logo: "https://codexcryptica.com/logo.png",
      sameAs: [
        "https://github.com/eserlan/Codex-Cryptica",
        DISCORD_URL,
        PATREON_URL,
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://codexcryptica.com/#website",
      url: "https://codexcryptica.com",
      name: "Codex Cryptica",
      publisher: {
        "@id": "https://codexcryptica.com/#organization",
      },
      about: {
        "@id": "https://codexcryptica.com/#software",
      },
    },
  ],
};
