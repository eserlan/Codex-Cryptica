import { nameGeneratorConfig } from "$lib/services/seo/generator-config";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

/** How many names a Quick Names batch shows. */
export const QUICK_NAMES_COUNT = 10;

/** Longest line kept as a name from AI output; longer ones are prose. */
const MAX_NAME_LENGTH = 60;

/** Fantasy cultures only, so the fantasy page stays genre-specific. */
export const FANTASY_NAME_THEME = "Classic Fantasy";

const KNOWN_CULTURES = new Set<string>([
  ...nameGeneratorConfig.cultures,
  ...Object.values(nameGeneratorConfig.culturesByTheme).flat(),
]);

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
    name_culture: KNOWN_CULTURES.has(culture) ? culture : "custom",
    name_type: nameGeneratorConfig.nameTypes.includes(nameType)
      ? nameType
      : "custom",
  };
}

/** Plain one-name-per-line text for "Copy all", without lore or Markdown. */
export function formatQuickNameList(names: readonly string[]): string {
  return names.join("\n");
}

/**
 * Pull the names out of a names write-up ("- **Name**: note"). Lines that are
 * not list items, empty or overlong are dropped, and repeats are removed.
 */
export function extractQuickNames(content: unknown): string[] {
  if (typeof content !== "string") return [];
  const names: string[] = [];
  for (const line of content.split("\n")) {
    const match = /^\s*[-*]\s+\*\*(.+?)\*\*/.exec(line);
    const name = match?.[1].replace(/[*_`]/g, "").trim();
    if (!name || name.length > MAX_NAME_LENGTH || names.includes(name))
      continue;
    names.push(name);
    if (names.length === QUICK_NAMES_COUNT) break;
  }
  return names;
}

export interface QuickNamesAiResult {
  names: string[];
  /** True when AI was unavailable and the names came from local tables. */
  fallback: boolean;
}

export interface QuickNamesAiOptions {
  theme: string;
  culture: string;
  gender: string;
  nameType: string;
  /** The visitor's description; falls back to the form's campaign context. */
  query: string;
  context: string;
}

/** Ask the AI for one batch of names through the page's names generator. */
export async function askQuickNamesAi(
  generateNames: (options: Record<string, unknown>) => Promise<GeneratorOutput>,
  options: QuickNamesAiOptions,
): Promise<QuickNamesAiResult> {
  const { query, context, ...rest } = options;
  const output = await generateNames({
    ...rest,
    context: query.trim() || context,
    count: String(QUICK_NAMES_COUNT),
    useAI: true,
  });
  return {
    names: extractQuickNames(output.content),
    fallback: Boolean(output.aiFallback),
  };
}

/**
 * The AI's names, or null when it failed, fell back to local tables or
 * returned nothing usable, so the caller can roll locally instead.
 */
export async function usableAiNames(
  askAi: (query: string) => Promise<QuickNamesAiResult>,
  query: string,
): Promise<string[] | null> {
  try {
    const result = await askAi(query);
    return !result.fallback && result.names.length > 0 ? result.names : null;
  } catch {
    return null;
  }
}
