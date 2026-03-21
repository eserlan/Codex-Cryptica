/**
 * Application-wide configuration and metadata
 */

const versionFromBuild =
  typeof __APP_VERSION__ === "string"
    ? __APP_VERSION__.split("+")[0]
    : undefined;

export const VERSION =
  import.meta.env.VITE_APP_VERSION ?? versionFromBuild ?? "0.16.57";
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
  "@type": "SoftwareApplication",
  name: APP_NAME,
  applicationCategory: "Tabletop RPG Utility",
  operatingSystem: "Web, Local-First",
  featureList: [
    "AI Lore Oracle",
    "Interactive Knowledge Graphs",
    "Tactical Map Mode",
    "Spatial Canvas & Flowcharts",
    "Era-based Timelines",
    "Local-First Privacy",
    "Google Drive Syncing",
  ],
  storageRequirements: "Origin Private File System (OPFS)",
  softwareVersion: VERSION,
  isAccessibleForFree: "True",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "Eserlan",
    url: "https://github.com/eserlan",
  },
};
