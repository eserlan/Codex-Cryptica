import { nameGeneratorConfig } from "$lib/services/seo/generator-config";

/** How many names a Quick Names batch shows. */
export const QUICK_NAMES_COUNT = 10;

/**
 * Low-cardinality analytics properties for a Quick Names action. Only preset
 * options are reported; anything the visitor typed becomes "custom", so their
 * own text never reaches analytics.
 */
export function quickNamesAnalytics(
  generatorType: string,
  culture: string,
  nameType: string,
): Record<string, string> {
  return {
    generator_type: generatorType,
    generator_mode: "quick_names",
    name_culture: nameGeneratorConfig.cultures.includes(culture)
      ? culture
      : "custom",
    name_type: nameGeneratorConfig.nameTypes.includes(nameType)
      ? nameType
      : "custom",
  };
}

/** Plain one-name-per-line text for "Copy all", without lore or Markdown. */
export function formatQuickNameList(names: readonly string[]): string {
  return names.join("\n");
}
