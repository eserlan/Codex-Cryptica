/**
 * Public names generator — framework-free port of the SEO names generator.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { nameGeneratorConfig } from "./public-names-constants";
export { nameGeneratorConfig } from "./public-names-constants";

export interface NamesGeneratorOptions {
  theme?: string;
  culture?: string;
  gender?: string;
  nameType?: string;
  count?: string;
  context?: string;
}

export interface ResolvedNames {
  culture: string;
  gender: string;
  nameType: string;
  count: number;
  context?: string;
  entityType: PublicGeneratorOutput["type"];
  title: string;
}

export interface NamesPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedNames;
}

function entityTypeForNameType(
  nameType: string,
): PublicGeneratorOutput["type"] {
  return nameType === "Place"
    ? "location"
    : nameType === "Faction"
      ? "faction"
      : nameType === "Item"
        ? "item"
        : "character";
}

function resolveNames(options: NamesGeneratorOptions): ResolvedNames {
  const culture = options.culture || nameGeneratorConfig.cultures[0];
  const gender = options.gender || nameGeneratorConfig.genders[0];
  const nameType = options.nameType || nameGeneratorConfig.nameTypes[0];
  const count = Math.max(1, parseInt(options.count || "10", 10) || 10);
  return {
    culture,
    gender,
    nameType,
    count,
    context: options.context?.trim() || undefined,
    entityType: entityTypeForNameType(nameType),
    title: `${culture} Names — ${nameType}`,
  };
}

export function buildNamesPrompt(
  options: NamesGeneratorOptions = {},
): NamesPrompt {
  const resolved = resolveNames(options);
  const { culture, gender, nameType, count, context } = resolved;
  const userMessage = `Generate ${count} ${nameType.toLowerCase()} names for a tabletop RPG in JSON format.
Options:
${options.theme ? `- Setting / Genre: ${options.theme} — names must fit this genre's conventions.\n` : ""}- Culture / Style: ${culture}
- Gender / Presentation: ${gender}
- Name Type: ${nameType}
- Count: ${count}
${context ? `- Context: ${context}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "content": "A brief lead sentence describing the naming style, followed by a markdown list of all ${count} names. Format each name as '- **Name**: one-sentence flavour note'.",
  "lore": "GM notes (markdown formatted) with sections for Culture, Style, and Usage Suggestions covering how to use these names in a campaign.",
  "labels": ["fantasy-name", "name-generator", "imported-draft"]
}
${NAME_BAN_PROMPT}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseNamesResponse(
  text: string,
  resolved: ResolvedNames,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: resolved.entityType,
    title: resolved.title,
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["fantasy-name", "name-generator", "imported-draft"],
    status: "active",
  };
}

export function generateNamesLocal(
  options: NamesGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveNames(options);
  const prefixes =
    nameGeneratorConfig.culturePrefixes[resolved.culture] ||
    nameGeneratorConfig.culturePrefixes["Generic Fantasy"];
  const suffixes =
    nameGeneratorConfig.cultureSuffixes[resolved.culture] ||
    nameGeneratorConfig.cultureSuffixes["Generic Fantasy"];

  const generated: string[] = [];
  for (let i = 0; i < resolved.count; i++) {
    const prefix = pickFrom(prefixes, rng);
    const suffix = pickFrom(suffixes, rng);
    generated.push(prefix.charAt(0).toUpperCase() + prefix.slice(1) + suffix);
  }

  const nameList = generated
    .map(
      (n) =>
        `- **${n}**: Traditional ${resolved.culture} style ${resolved.nameType.toLowerCase()} name.`,
    )
    .join("\n");

  const content = `These names represent the traditional ${resolved.culture} style for ${resolved.nameType.toLowerCase()}s, filtered for a ${resolved.gender.toLowerCase()} register.\n\n${nameList}`;

  const lore = `### Generator Settings
- **Culture**: ${resolved.culture}
- **Gender / Presentation**: ${resolved.gender}
- **Name Type**: ${resolved.nameType}

### Usage Suggestions
Use these names for any ${resolved.nameType.toLowerCase()} in a ${resolved.culture.toLowerCase()}-influenced setting. Combine or modify them freely — drop a syllable, add a prefix, or append a title or epithet for variation.`;

  return {
    type: resolved.entityType,
    title: resolved.title,
    content,
    lore,
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "active",
  };
}
