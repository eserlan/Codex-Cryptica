/**
 * Public Settlement / Location generator — framework-free, genre-aware.
 *
 * Every generated settlement answers three questions:
 *   1. Why does this place exist? (function, environment, origin)
 *   2. Who really controls it? (authority, hidden vs official power)
 *   3. What is about to go wrong? (dominant tension)
 *
 * Genre is derived from the hub context by the caller; defaults to "Fantasy".
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems as getRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { settlementConfig } from "./public-settlement-constants";
export { settlementConfig };

function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return record[genre] ?? record["Fantasy"];
}

export interface SettlementGeneratorOptions {
  genre?: string;
  size?: string;
  environment?: string;
  primaryFunction?: string;
  tone?: string;
  mainTension?: string;
  campaignContext?: string;
  /** @deprecated Use primaryFunction instead. Kept for backwards compatibility. */
  economy?: string;
}

interface ResolvedSettlement {
  genre: string;
  size: string;
  population: string;
  pointsOfInterestCount: number;
  environment: string;
  primaryFunction: string;
  tone: string;
  mainTension: string;
  authorityType: string;
  name: string;
}

function resolveSettlement(
  options: SettlementGeneratorOptions,
  rng: Rng,
): ResolvedSettlement {
  const genre = options.genre || "Fantasy";
  const sizes = forGenre(settlementConfig.sizesByGenre, genre);
  const sizeConfig =
    sizes.find((s) => s.name === options.size) || pickFrom(sizes, rng);
  const environment =
    options.environment ||
    pickFrom(forGenre(settlementConfig.environmentsByGenre, genre), rng);

  const primaryFunction =
    options.primaryFunction ||
    options.economy ||
    pickFrom(forGenre(settlementConfig.primaryFunctionsByGenre, genre), rng);
  const tone =
    options.tone ||
    pickFrom(forGenre(settlementConfig.tonesByGenre, genre), rng);
  const mainTension =
    options.mainTension ||
    pickFrom(forGenre(settlementConfig.mainTensionsByGenre, genre), rng);
  const authorityType = pickFrom(
    forGenre(settlementConfig.authorityTypesByGenre, genre),
    rng,
  );
  const prefixes = forGenre(settlementConfig.namePrefixesByGenre, genre);
  const suffixes = forGenre(settlementConfig.nameSuffixesByGenre, genre);
  const name = pickFrom(prefixes, rng) + pickFrom(suffixes, rng);

  return {
    genre,
    size: sizeConfig.name,
    population: sizeConfig.range,
    pointsOfInterestCount: sizeConfig.pointsOfInterestCount,
    environment,
    primaryFunction,
    tone,
    mainTension,
    authorityType,
    name,
  };
}

export interface SettlementPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedSettlement;
}

export function buildSettlementPrompt(
  options: SettlementGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): SettlementPrompt {
  const resolved = resolveSettlement(options, rng);
  const {
    name,
    genre,
    size,
    population,
    pointsOfInterestCount,
    environment,
    primaryFunction,
    tone,
    mainTension,
    authorityType,
  } = resolved;

  const userMessage = `Generate a campaign-ready inhabited place for a tabletop RPG session. Answer these three questions through the output:
1. Why does this place exist? (its function, environment, and origin)
2. Who really controls it? (official authority vs. hidden power)
3. What is about to go wrong? (the dominant tension that makes it adventure-ready)

Parameters:
- Name: ${name}
- Genre / Setting: ${genre}
- Scale: ${size} (${population})
- Environment: ${environment}
- Primary Function: ${primaryFunction}
- Official Authority: ${authorityType}
- Tone: ${tone}
- Dominant Tension: ${mainTension}

Return a valid JSON object matching this structure exactly:
{
  "title": "A single string for the settlement name",
  "summary": "One sentence: what this settlement is and what makes it interesting (e.g. 'A sunbaked salt-mining town built into a dormant volcano, ruled by a cartel of water-merchants.').",
  "content": "Prose description (markdown). Include these sections:\\n## Core Concept\\n[What makes this place distinct — 2–3 sentences answering why it exists]\\n\\n## First Impression\\n[What visitors notice first — sensory, atmospheric, genre-appropriate]\\n\\n## History\\n[How the settlement came to be and what shaped it — 2–3 sentences]",
  "lore": "Structured GM reference (markdown). Use EXACTLY this structure:\\n### GM Reference Information\\n- **Scale**: ${size} (${population})\\n- **Genre / Setting**: ${genre}\\n- **Environment**: ${environment}\\n- **Primary Function**: ${primaryFunction}\\n- **Official Authority**: ${authorityType}\\n- **Tone**: ${tone}\\n\\n### Points of Interest\\n- **📍 Location Name**: one-line purpose or detail (exactly ${pointsOfInterestCount} item${pointsOfInterestCount === 1 ? "" : "s"}, genre-appropriate)\\n\\n### Controlling Factions\\n- **👥 Faction Name**: one-line influence summary (2–3 factions)\\n\\n### Current Tension\\n[2–3 sentences on the dominant tension and what makes it escalate. Name real people or groups involved.]\\n\\n### Adventure Hooks\\n- [Hook tied to the tension]\\n- [Hook tied to the power structure or hidden authority]\\n- [Hook tied to the location or function of the settlement]",
  "labels": ["rpg-location", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
${options.campaignContext?.trim() ? `Campaign context from the user: ${options.campaignContext.trim()}` : ""}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed, genre-aware RPG campaign elements in JSON format. Match the genre, tone, and setting precisely — a cyberpunk district must feel nothing like a fantasy town.",
    userMessage,
    resolved,
  };
}

export function parseSettlementResponse(
  text: string,
  resolved: ResolvedSettlement,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "location",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-location", "imported-draft"],
    status: "active",
  };
}

const FIRST_IMPRESSION_BY_GENRE: Record<string, string> = {
  Fantasy:
    "The smell of woodsmoke and damp earth greets travellers at the gate. Eyes follow newcomers from doorways and market stalls.",
  "Dark Fantasy":
    "The silence is the first warning. Shuttered windows, empty streets, and the faint smell of rot on the wind.",
  Cyberpunk:
    "Neon bleeds across wet pavement. Drones hum overhead. Surveillance cameras track every face.",
  "Sci-Fi":
    "The hiss of airlocks. Recycled air with a faint tang of ozone. The hum of life support beneath everything.",
  "Post-Apocalyptic":
    "The first thing is the wall. Then the armed sentries. Then the eyes of people who have seen too much loss.",
  Modern:
    "A place that looks ordinary until you stay long enough to notice the cracks in the surface.",
  Horror:
    "Everything looks normal. That is the problem. The smiles are too practiced, the quiet too deliberate.",
  Western:
    "Dust. Heat. The creak of a sign. A town that watches strangers ride in and makes no move to welcome them.",
  Steampunk:
    "Smoke stacks, the clank of pistons, and the acrid smell of coal tar. The city never quite stops moving.",
  "Space Opera Resistance":
    "The roar of a shuttle taking off, the chatter of alien tongues, and the ever-present gaze of imperial stormtroopers on patrol.",
};

const CORE_CONCEPT_VARIANTS = [
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} is a ${size.toLowerCase()} built around ${primaryFunction.toLowerCase()} in a ${environment.toLowerCase()} setting. ${tone} in character, it draws people who need what it offers and repels those who threaten it. Beneath the surface, ${mainTension.toLowerCase()} is shaping everything.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} is a ${size.toLowerCase()} ${environment.toLowerCase()} settlement whose entire identity runs through ${primaryFunction.toLowerCase()}. The ${tone.toLowerCase()} atmosphere is partly genuine and partly maintained — and ${mainTension.toLowerCase()} is testing both.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `A ${size.toLowerCase()} place shaped by ${environment.toLowerCase()} terrain and the demands of ${primaryFunction.toLowerCase()}, ${name} has the ${tone.toLowerCase()} quality of somewhere that knows what it is. What it does not know is how much longer that remains true, given ${mainTension.toLowerCase()}.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} exists because ${primaryFunction.toLowerCase()} required a permanent presence in this ${environment.toLowerCase()} location. It is ${size.toLowerCase()}, ${tone.toLowerCase()}, and quietly under strain: ${mainTension.toLowerCase()} runs through everything here.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `Everything about ${name} — its ${size.toLowerCase()} scale, its ${environment.toLowerCase()} setting, its ${tone.toLowerCase()} reputation — traces back to ${primaryFunction.toLowerCase()}. And ${mainTension.toLowerCase()} threatens to unravel all of it.`,
] as const;

const CORE_CONCEPT_TEMPLATE = (
  name: string,
  size: string,
  environment: string,
  primaryFunction: string,
  tone: string,
  mainTension: string,
  rng: () => number,
) =>
  CORE_CONCEPT_VARIANTS[Math.floor(rng() * CORE_CONCEPT_VARIANTS.length)](
    name,
    size,
    environment,
    primaryFunction,
    tone,
    mainTension,
  );

export function generateSettlementLocal(
  options: SettlementGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveSettlement(options, rng);
  const {
    genre,
    size,
    population,
    environment,
    primaryFunction,
    tone,
    mainTension,
    authorityType,
    pointsOfInterestCount,
    name,
  } = resolved;

  const locations = getRandomItems(
    forGenre(settlementConfig.notableLocationsByGenre, genre),
    pointsOfInterestCount,
    rng,
  );
  const [faction1, faction2] = getRandomItems(
    forGenre(settlementConfig.factionsByGenre, genre),
    2,
    rng,
  );
  const firstImpression =
    FIRST_IMPRESSION_BY_GENRE[genre] ?? FIRST_IMPRESSION_BY_GENRE["Fantasy"];

  const historyVariants = [
    `${name} was established as a ${primaryFunction.toLowerCase()} and grew to serve that purpose above all else. The ${authorityType.toLowerCase()} has held power long enough for cracks to form. How those cracks spread is the story.`,
    `The original reason for ${name}'s existence was ${primaryFunction.toLowerCase()}. Everything else — the layout, the social order, the current tensions — grew from that. The ${authorityType.toLowerCase()} that governs it inherited a settlement already shaped by decisions made before them.`,
    `${name} predates its current ${authorityType.toLowerCase()} by enough time that the original arrangement and the current reality have diverged in ways nobody officially acknowledges.`,
    `The settlement formed around ${primaryFunction.toLowerCase()} and has never fully outgrown that original purpose. The ${authorityType.toLowerCase()} manages what that purpose attracts — which is both the settlement's strength and its persistent vulnerability.`,
    `Early records describe ${name} as a temporary installation. It became permanent when ${primaryFunction.toLowerCase()} proved too valuable to abandon. The ${authorityType.toLowerCase()} that solidified over time are a later development, and not everyone accepts their legitimacy equally.`,
  ] as const;

  const content = `## Core Concept
${CORE_CONCEPT_TEMPLATE(name, size, environment, primaryFunction, tone, mainTension, rng)}

## First Impression
${firstImpression}

## History
${historyVariants[Math.floor(rng() * historyVariants.length)]}`;

  const lore = `### GM Reference Information
- **Scale**: ${size} (${population})
- **Genre / Setting**: ${genre}
- **Environment**: ${environment}
- **Primary Function**: ${primaryFunction}
- **Official Authority**: ${authorityType}
- **Tone**: ${tone}

### Points of Interest
${locations.map((l) => `- **📍 ${l}**: A key location tied to the settlement's primary function.`).join("\n")}

### Controlling Factions
- **👥 ${faction1}**: Holds influence through proximity to the official authority.
- **👥 ${faction2}**: Operates in the spaces the authority cannot or will not control.

### Current Tension
${mainTension} is the open secret nobody is addressing. The longer it goes unresolved, the worse the outcome for everyone — including the people in power.

### Adventure Hooks
- Someone with information about ${mainTension.toLowerCase()} has gone missing.
- The ${authorityType.toLowerCase()} wants outside help to deal with ${faction2.toLowerCase()} without showing weakness.
- Something tied to the settlement's history as a ${primaryFunction.toLowerCase()} has surfaced — and whoever controls it controls the settlement.`;

  const summary = `A ${tone.toLowerCase()} ${size.toLowerCase()} built around ${primaryFunction.toLowerCase()} in a ${environment.toLowerCase()} setting.`;

  return {
    type: "location",
    title: name,
    summary,
    content,
    lore,
    labels: ["rpg-location", "imported-draft"],
    status: "active",
  };
}
