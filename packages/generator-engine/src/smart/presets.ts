import type { SmartGeneratorConfig } from "./types";

/**
 * A named starting point for a generator (#2340).
 *
 * A preset is not a separate generation path. It writes ordinary axis values
 * into the same config the form and the semantic layer write into, so
 * everything it chooses stays visible in the form and editable afterwards.
 *
 * Presets deliberately sketch rather than specify: naming two or three axes and
 * leaving the rest to roll produces a coherent settlement, because the axes that
 * are left open now follow the ones the preset pinned.
 *
 * There is no weighting field on purpose. A preset that quietly tilted the odds
 * would break the rule that everything it does is visible in the form.
 */
export interface SmartPreset {
  id: string;
  /** Shown on the chip. Plain language, two or three words. */
  label: string;
  /** One line, shown as the chip's tooltip and its accessible description. */
  description: string;
  /** Genres this preset makes sense in. Omit for a genre-neutral preset. */
  genres?: readonly string[];
  /** Axis id to value. Every value must exist in that axis's pool. */
  set: Readonly<Record<string, string>>;
}

/** The presets offered for one genre, in declaration order. */
export function presetsFor(
  presets: readonly SmartPreset[],
  genre: string,
): SmartPreset[] {
  return presets.filter(
    (preset) => preset.genres === undefined || preset.genres.includes(genre),
  );
}

/**
 * Apply a preset onto a config. Values already locked by the user win, since
 * they chose those deliberately and a preset is a starting point.
 */
export function applyPreset(
  config: SmartGeneratorConfig,
  preset: SmartPreset,
): SmartGeneratorConfig {
  const locked = { ...(config.locked ?? {}) };
  for (const [axisId, value] of Object.entries(preset.set)) {
    if (locked[axisId]?.source === "manual") continue;
    locked[axisId] = { value, source: "preset" };
  }
  return { ...config, locked };
}
