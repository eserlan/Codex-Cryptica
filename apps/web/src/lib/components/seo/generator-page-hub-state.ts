// Hub-derived initial theme and mount-state helpers for GeneratorPageContent.
// Extracted to keep GeneratorPageContent focused on view wiring while hub
// reconciliation (theme / genre seeding) remains unit-testable.

import {
  alienRaceConfig,
  languageConfig,
  newsSheetConfig,
  settlementConfig,
  shipConfig,
  starSystemConfig,
} from "$lib/services/seo/generator-engine";
import { themeIdToLabel } from "$lib/services/seo/generator-engine";
import { UIPersistence, UI_STORAGE_KEYS } from "$lib/stores/ui/persistence";
import {
  HUB_SLUG_TO_THEME_ID,
  SETTLEMENT_GENRE_FOR_HUB,
  SLUGS_USING_STORED_THEME,
  SOCIAL_HUB_GENRE_TO_THEME,
  mapHubGenreToShipGenre,
  mapStarSystemGenreToTheme,
  mapAlienRaceGenreToTheme,
  mapWorldGenreToTheme,
  resolveHubGeneratorGenre,
} from "./generator-theme-maps";
import { worldGenreForHub } from "./generator-page-world-handoff";

// ---------------------------------------------------------------------------
// Initial activeTheme resolution (mirrors the `_initStoredThemeId` /
// `_worldInitialTheme` / `activeTheme` block in GeneratorPageContent).
// ---------------------------------------------------------------------------

export function resolveInitialActiveTheme(opts: {
  urlHubTheme?: string | null;
  slug: string;
  persistence?: UIPersistence;
  browser?: boolean;
  fallbackTheme: string;
}): string {
  const urlHubTheme = opts.urlHubTheme ?? null;
  const persistence = opts.persistence ?? new UIPersistence();
  const browser = opts.browser ?? false;
  const effectiveStoredId =
    (urlHubTheme ? (HUB_SLUG_TO_THEME_ID[urlHubTheme] ?? null) : null) ??
    (browser && SLUGS_USING_STORED_THEME.has(opts.slug)
      ? persistence.read(UI_STORAGE_KEYS.ACTIVE_THEME, (v) => v, null)
      : null);

  const worldInitialTheme = urlHubTheme
    ? (SOCIAL_HUB_GENRE_TO_THEME[resolveHubGeneratorGenre(urlHubTheme) ?? ""] ??
      null)
    : null;

  const storedLabel =
    effectiveStoredId && themeIdToLabel[effectiveStoredId]
      ? themeIdToLabel[effectiveStoredId]
      : null;

  return worldInitialTheme || storedLabel || opts.fallbackTheme;
}

export function getEffectiveStoredThemeId(opts: {
  urlHubTheme?: string | null;
  slug: string;
  persistence?: UIPersistence;
  browser?: boolean;
}): string | null {
  const persistence = opts.persistence ?? new UIPersistence();
  const browser = opts.browser ?? false;
  return (
    (opts.urlHubTheme
      ? (HUB_SLUG_TO_THEME_ID[opts.urlHubTheme] ?? null)
      : null) ??
    (browser && SLUGS_USING_STORED_THEME.has(opts.slug)
      ? persistence.read(UI_STORAGE_KEYS.ACTIVE_THEME, (v) => v, null)
      : null)
  );
}

// ---------------------------------------------------------------------------
// Hub-mount patch — describes the state mutations `onMount` applies when the
// page is visited with a hub theme (e.g. /generators/fantasy/settlement).
// Returned as a plain patch so callers can apply via Object.assign / direct
// assignment and remain framework-agnostic.
// ---------------------------------------------------------------------------

export interface HubMountPatch {
  activeTheme?: string;
  settlement?: {
    genre?: string;
    size?: string;
    environment?: string;
    primaryFunction?: string;
    tone?: string;
    mainTension?: string;
  };
  nation?: { genre?: string };
  socialHub?: { genre?: string };
  ship?: { genre?: string; role?: string };
  world?: { genre?: string };
  starSystem?: { genre?: string };
  alienRace?: { genre?: string };
  newsSheet?: { genre?: string; publicationType?: string };
  language?: { genre?: string };
  // null when the slug/hub combination has no hub-derived seeding to apply
  // beyond the optional fallback stored-theme activeTheme.
  _fallbackStoredTheme?: string | null;
}

export function getHubMountPatch(opts: {
  slug: string;
  hubTheme: string | null;
  urlHubTheme?: string | null;
  persistence?: UIPersistence;
  browser?: boolean;
  currentState?: {
    pantheonGenre?: string;
    newsSheetGenre?: string;
    starSystemGenre?: string;
    alienRaceGenre?: string;
  };
}): HubMountPatch | null {
  const { slug, hubTheme, urlHubTheme } = opts;
  const hubGenre = resolveHubGeneratorGenre(hubTheme);
  const rawHubGenre = hubGenre;

  // Fixed-theme slugs (no hubGenre dependency beyond early return).
  if (slug === "nation") {
    if (hubGenre) {
      const activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[hubGenre] ?? "Classic Fantasy";
      return {
        nation: { genre: hubGenre },
        activeTheme,
      };
    }
    return {
      activeTheme:
        SOCIAL_HUB_GENRE_TO_THEME[hubGenre ?? ""] ?? "Classic Fantasy",
    };
  }
  if (slug === "social-hub") {
    if (hubGenre) {
      const activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[hubGenre] ?? "Classic Fantasy";
      return { socialHub: { genre: hubGenre }, activeTheme };
    }
    return {
      activeTheme:
        SOCIAL_HUB_GENRE_TO_THEME[hubGenre ?? ""] ?? "Classic Fantasy",
    };
  }
  if (slug === "settlement") {
    if (hubGenre) {
      const settlementGenre = SETTLEMENT_GENRE_FOR_HUB[hubGenre] ?? hubGenre;
      const sizes =
        settlementConfig.sizesByGenre[settlementGenre] ??
        settlementConfig.sizesByGenre["Fantasy"];
      const settlement = {
        genre: settlementGenre,
        size: sizes[2].name,
        environment: (settlementConfig.environmentsByGenre[settlementGenre] ??
          settlementConfig.environmentsByGenre["Fantasy"])[0],
        primaryFunction: (settlementConfig.primaryFunctionsByGenre[
          settlementGenre
        ] ?? settlementConfig.primaryFunctionsByGenre["Fantasy"])[0],
        tone: (settlementConfig.tonesByGenre[settlementGenre] ??
          settlementConfig.tonesByGenre["Fantasy"])[0],
        mainTension: (settlementConfig.mainTensionsByGenre[settlementGenre] ??
          settlementConfig.mainTensionsByGenre["Fantasy"])[0],
      };
      const activeTheme =
        (rawHubGenre ? SOCIAL_HUB_GENRE_TO_THEME[rawHubGenre] : "") ||
        SOCIAL_HUB_GENRE_TO_THEME[settlementGenre] ||
        "Classic Fantasy";
      return { settlement, activeTheme };
    }
    // No hubGenre: still derive activeTheme from default settlement genre path.
    return { activeTheme: "Classic Fantasy" };
  }
  if (slug === "vampire-clan") {
    return { activeTheme: "Vampire / Gothic Noir" };
  }
  if (slug === "nomad-clan") {
    return { activeTheme: "Cyberpunk / Corporate" };
  }
  if (slug === "dark-fantasy-faction") {
    return { activeTheme: "Classic Fantasy" };
  }
  if (slug === "pantheon-generator" || slug === "god-generator") {
    return {
      activeTheme: opts.currentState?.pantheonGenre ?? "Classic Fantasy",
    };
  }
  if (slug === "dnd-npc" || slug === "fantasy-names" || slug === "tavern") {
    return { activeTheme: "Classic Fantasy" };
  }
  if (slug === "ship-generator") {
    if (hubGenre) {
      const mapped = mapHubGenreToShipGenre(hubGenre);
      const role = (shipConfig.rolesByGenre[mapped] ??
        shipConfig.rolesByGenre["Sci-Fi"])[0];
      const activeTheme =
        (hubGenre ? SOCIAL_HUB_GENRE_TO_THEME[hubGenre] : "") ||
        "Sci-Fi / Space Opera";
      return { ship: { genre: mapped, role }, activeTheme };
    }
    return { activeTheme: "Sci-Fi / Space Opera" };
  }
  if (slug === "world") {
    const worldGenre = worldGenreForHub(hubGenre);
    const activeTheme = mapWorldGenreToTheme(worldGenre);
    return { world: { genre: worldGenre }, activeTheme };
  }
  if (slug === "star-system") {
    if (
      hubGenre &&
      (starSystemConfig.genres as readonly string[]).includes(hubGenre)
    ) {
      const activeTheme = mapStarSystemGenreToTheme(hubGenre);
      return { starSystem: { genre: hubGenre }, activeTheme };
    }
    const fallbackGenre = opts.currentState?.starSystemGenre ?? "Sci-Fi";
    return { activeTheme: mapStarSystemGenreToTheme(fallbackGenre) };
  }
  if (slug === "alien-race") {
    if (
      hubGenre &&
      (alienRaceConfig.genres as readonly string[]).includes(hubGenre)
    ) {
      const activeTheme = mapAlienRaceGenreToTheme(hubGenre);
      return { alienRace: { genre: hubGenre }, activeTheme };
    }
    const fallbackGenre = opts.currentState?.alienRaceGenre ?? "Sci-Fi";
    return { activeTheme: mapAlienRaceGenreToTheme(fallbackGenre) };
  }
  if (slug === "news-sheet-generator") {
    if (hubGenre && newsSheetConfig.genres.includes(hubGenre)) {
      const publicationType = (newsSheetConfig.publicationTypesByGenre[
        hubGenre
      ] ?? newsSheetConfig.publicationTypesByGenre["Fantasy"])[0];
      const activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[hubGenre] ?? "Classic Fantasy";
      return {
        newsSheet: { genre: hubGenre, publicationType },
        activeTheme,
      };
    }
    const fallbackGenre = opts.currentState?.newsSheetGenre ?? "Fantasy";
    return {
      activeTheme:
        SOCIAL_HUB_GENRE_TO_THEME[fallbackGenre] ?? "Classic Fantasy",
    };
  }
  if (slug === "language-generator") {
    if (hubGenre) {
      const mapped = SOCIAL_HUB_GENRE_TO_THEME[hubGenre] ?? hubGenre;
      if ((languageConfig.genres as string[]).includes(mapped)) {
        return { language: { genre: mapped } };
      }
    }
    return null;
  }

  // Generic fallback: for slugs without a specific hub seeding, if visiting
  // via a flat URL (no urlHubTheme) the component reads localStorage for the
  // last active theme. Encode that as a patch so callers can apply it.
  if (!urlHubTheme) {
    const persistence = opts.persistence ?? new UIPersistence();
    const browser = opts.browser ?? false;
    if (browser) {
      const stored = persistence.read(
        UI_STORAGE_KEYS.ACTIVE_THEME,
        (v) => v,
        null,
      );
      if (stored && themeIdToLabel[stored]) {
        return { activeTheme: themeIdToLabel[stored] };
      }
    }
  }

  return null;
}
