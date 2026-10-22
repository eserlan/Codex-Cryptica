import { formatRange, listBiomeSources } from "./format";
import type {
  BiomeConditions,
  BiomeOwnFields,
  BiomeProfile,
  BiomeSource,
  ReferenceBiome,
  Statement,
} from "./model";

const bullets = (statements: readonly Statement[]): string[] =>
  statements.map((s) => `- ${s.text}`);

function block(heading: string, lines: string[]): string[] {
  return lines.length > 0 ? [`### ${heading}`, "", ...lines, ""] : [];
}

function conditionLines(conditions: BiomeConditions): string[] {
  const lines: string[] = [];
  if (conditions.temperature)
    lines.push(
      `- Temperature (yearly average): ${formatRange(conditions.temperature)}`,
    );
  if (conditions.precipitation)
    lines.push(`- Rainfall and snow: ${formatRange(conditions.precipitation)}`);
  if (conditions.elevation)
    lines.push(
      `- Height above sea level: ${formatRange(conditions.elevation)}`,
    );
  lines.push(
    ...bullets(conditions.seasonality),
    ...bullets(conditions.waterAvailability),
    ...bullets(conditions.notes),
  );
  return lines;
}

function sourceLine(source: BiomeSource, index: number): string {
  const parts = [`${index + 1}. ${source.title}`];
  if (source.author) parts.push(source.author);
  if (source.year) parts.push(String(source.year));
  const line = parts.join(", ");
  return source.url ? `${line} (${source.url})` : line;
}

interface ReferenceParts {
  conditions: BiomeConditions;
  landscape: Statement[];
  vegetation: Statement[];
  wildlife: Statement[];
  resources: Statement[];
  hazards: Statement[];
}

function referenceBlocks(parts: ReferenceParts): string[] {
  return [
    ...block("Climate", conditionLines(parts.conditions)),
    ...block("Landscape", bullets(parts.landscape)),
    ...block("Plants", bullets(parts.vegetation)),
    ...block("Wildlife", bullets(parts.wildlife)),
    ...block("Resources", bullets(parts.resources)),
    ...block("Hazards", bullets(parts.hazards)),
  ];
}

function ownLines(own: BiomeOwnFields): string[] {
  const climate: string[] = [];
  if (own.climate.temperature)
    climate.push(
      `Temperature (yearly average): ${formatRange(own.climate.temperature)}`,
    );
  if (own.climate.precipitation)
    climate.push(
      `Rainfall and snow: ${formatRange(own.climate.precipitation)}`,
    );
  if (own.climate.seasonality?.trim())
    climate.push(own.climate.seasonality.trim());
  const fields: [string, string][] = [
    ["Terrain", own.terrain],
    ["Plants", own.vegetation],
    ["Water", own.water],
    ["Pressures", own.pressures],
    ["Notes", own.notes],
  ];
  return [
    ...block("Climate", climate),
    ...fields.flatMap(([heading, text]) =>
      text.trim() ? block(heading, [text.trim()]) : [],
    ),
  ];
}

const ASPECT_LABELS: Record<string, string> = {
  climate: "Climate",
  terrain: "Terrain",
  vegetation: "Plants",
  water: "Water",
  pressures: "Pressures",
  other: "Other",
};

function alterationLines(profile: BiomeProfile): string[] {
  return profile.alterations.flatMap((alteration) => [
    `- **${ASPECT_LABELS[alteration.aspect] ?? alteration.aspect}:** ${alteration.description}`,
    `  - Cause: ${alteration.cause.trim() || "not written yet"}`,
    ...(alteration.effects.length > 0
      ? [`  - Effects: ${alteration.effects.join("; ")}`]
      : []),
  ]);
}

const tidy = (lines: string[]): string =>
  lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

/**
 * Markdown for a saved profile. Reference-derived and user-written content stay
 * under separate headings.
 */
export function renderProfileMarkdown(
  title: string,
  profile: BiomeProfile,
): string {
  const lines: string[] = [`# ${title.trim()}`, ""];

  if (profile.reference) {
    lines.push(
      "## Reference",
      "",
      `Based on ${profile.reference.name}.`,
      "",
      ...referenceBlocks(profile.reference),
    );
  }

  const own = ownLines(profile.own);
  if (own.length > 0) lines.push("## My changes", "", ...own);

  if (profile.alterations.length > 0) {
    lines.push("## Fictional alterations", "", ...alterationLines(profile), "");
  }

  if (profile.illustrationPrompt?.trim()) {
    lines.push(
      "## Illustration prompt",
      "",
      profile.illustrationPrompt.trim(),
      "",
    );
  }

  if (profile.referenceLinks.length > 0) {
    lines.push(
      "## Reference links",
      "",
      ...profile.referenceLinks.map(
        (link) => `- [${link.label || link.url}](${link.url})`,
      ),
      "",
    );
  }

  if (profile.reference && profile.reference.sources.length > 0) {
    lines.push(
      "## Sources",
      "",
      ...profile.reference.sources.map(sourceLine),
      "",
    );
  }
  return tidy(lines);
}

/** Markdown for a library biome (read-only copy from the Library). */
export function renderReferenceMarkdown(biome: ReferenceBiome): string {
  const lines: string[] = [
    `# ${biome.name}`,
    "",
    biome.summary,
    "",
    ...referenceBlocks(biome),
    ...block("Variations", bullets(biome.variations)),
    "## Sources",
    "",
    ...listBiomeSources(biome).map(sourceLine),
    "",
  ];
  return tidy(lines);
}
