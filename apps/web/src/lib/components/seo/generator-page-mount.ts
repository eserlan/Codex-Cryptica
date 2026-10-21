import { themeIdToLabel } from "$lib/services/seo/generator-config";
import {
  UI_STORAGE_KEYS,
  type UIPersistence,
} from "$lib/stores/ui/persistence";
import type { createCharacterDefaults } from "./generator-page-character-defaults";
import type { createSettingDefaults } from "./generator-page-setting-defaults";
import {
  getHubMountPatch,
  type HubMountPatch,
} from "./generator-page-hub-state";

type MountForms = ReturnType<typeof createSettingDefaults> &
  Pick<ReturnType<typeof createCharacterDefaults>, "pantheon">;

interface GeneratorMountOptions {
  slug: string;
  hubTheme: string | null;
  urlHubTheme?: string;
  persistence: UIPersistence;
  browser: boolean;
  forms: MountForms;
  setActiveTheme: (theme: string) => void;
  applyWorldHandoff: () => void;
}

const PATCHED_FORMS = [
  "settlement",
  "nation",
  "socialHub",
  "ship",
  "world",
  "starSystem",
  "alienRace",
  "newsSheet",
  "language",
] as const;

const HUB_HANDLED_SLUGS = new Set([
  "pantheon-generator",
  "god-generator",
  "vampire-clan",
  "nomad-clan",
  "dark-fantasy-faction",
  "dnd-npc",
  "fantasy-names",
  "tavern",
  "settlement",
  "nation",
  "social-hub",
  "ship-generator",
  "world",
  "star-system",
  "alien-race",
  "news-sheet-generator",
]);

function applyMountPatch(
  options: GeneratorMountOptions,
  patch: HubMountPatch,
): void {
  for (const key of PATCHED_FORMS) {
    if (patch[key]) Object.assign(options.forms[key], patch[key]);
  }
  if (patch.activeTheme) options.setActiveTheme(patch.activeTheme);
  // The develop-world query handoff follows the hub patch.
  if (options.slug === "world") options.applyWorldHandoff();
}

function restoreStoredTheme(
  options: GeneratorMountOptions,
  patch: HubMountPatch | null,
): void {
  if (options.urlHubTheme || patch?.activeTheme) return;
  const stored = options.persistence.read(
    UI_STORAGE_KEYS.ACTIVE_THEME,
    (value) => value,
    null,
  );
  if (stored && themeIdToLabel[stored])
    options.setActiveTheme(themeIdToLabel[stored]);
}

/** Reconcile hub state on mount, preserving the fixed-slug and language exits. */
export function mountGeneratorPage(options: GeneratorMountOptions): void {
  const { forms } = options;
  const patch = getHubMountPatch({
    ...options,
    currentState: {
      pantheonGenre: forms.pantheon.genre,
      newsSheetGenre: forms.newsSheet.genre,
      starSystemGenre: forms.starSystem.genre,
      alienRaceGenre: forms.alienRace.genre,
    },
  });
  if (patch) {
    applyMountPatch(options, patch);
    if (HUB_HANDLED_SLUGS.has(options.slug)) return;
  }
  if (options.slug === "language-generator" && patch?.language) return;
  restoreStoredTheme(options, patch);
}
