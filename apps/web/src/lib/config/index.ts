/**
 * Application-wide configuration and metadata
 */

const versionFromBuild =
  typeof __APP_VERSION__ === "string"
    ? __APP_VERSION__.split("+")[0]
    : undefined;

export const VERSION =
  import.meta.env.VITE_APP_VERSION ?? versionFromBuild ?? "0.10.1";
export const CODENAME = import.meta.env.VITE_APP_CODENAME ?? "Cryptica";

export const APP_NAME = "Codex Cryptica";
export const PATREON_URL = "https://patreon.com/EspenE";
export const DISCORD_URL = "https://discord.gg/5UUMCChF2u";
