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
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { settlementConfig } from "./public-settlement-constants";
import { settlementSchema } from "./public-settlement-schema";
import {
  buildAdventureHooks,
  buildCurrentTensionParagraph,
  buildInhabitants,
  buildLifeHere,
  buildNotableInhabitants,
  institutionalNote,
  rungFor,
  scaleFor,
  scaleFunctionPhrase,
  selectDiverseFactions,
  selectDiversePoi,
  settlementFactionCategoryPool,
  settlementLocationCategoryPool,
  withArticle,
  type FactionCategory,
  type PoiCategory,
} from "./public-settlement-community";
import { FUNCTION_TRAITS } from "./public-settlement-traits";
import { resolveSmart, type LockedValue, type ResolveContext } from "./smart";
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
  /** Not exposed by the public form yet; presets and free text will set it (#2340, #2338). */
  authorityType?: string;
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
  /** Traits of everything resolved, so derived lists can stay consistent. */
  traits: readonly string[];
  /** Where size falls on the genre's own ladder, driving every other count (#2536). */
  rung: number;
}

/**
 * Resolve the settlement's parameters through the smart framework (#2341).
 *
 * The axes resolve in the schema's declared order, so what the place is for can
 * follow where it is, and who runs it can follow both. Anything the caller
 * supplies is locked and taken verbatim, including a value the user typed that
 * is not in the pool.
 */
function resolveSettlement(
  options: SettlementGeneratorOptions,
  rng: Rng,
): ResolvedSettlement {
  const genre = options.genre || "Fantasy";

  const locked: Record<string, LockedValue> = {};
  const lock = (axisId: string, value: string | undefined) => {
    if (value) locked[axisId] = { value, source: "manual" };
  };
  lock("environment", options.environment);
  lock("primaryFunction", options.primaryFunction || options.economy);
  lock("authorityType", options.authorityType);
  lock("tone", options.tone);
  lock("mainTension", options.mainTension);
  lock("size", options.size);

  const { values, traits } = resolveSmart(
    settlementSchema,
    { genre, locked },
    rng,
  );

  const sizes = forGenre(settlementConfig.sizesByGenre, genre);
  // A custom scale the user typed keeps its name and borrows the population and
  // points-of-interest count of the middle rung of the genre's own ladder.
  const sizeConfig =
    sizes.find((s) => s.name === values.size) ??
    sizes[Math.floor((sizes.length - 1) / 2)];
  const rung = rungFor(sizes, values.size);

  const prefixes = forGenre(settlementConfig.namePrefixesByGenre, genre);
  const suffixes = forGenre(settlementConfig.nameSuffixesByGenre, genre);
  const name = pickFrom(prefixes, rng) + pickFrom(suffixes, rng);

  return {
    genre,
    size: values.size,
    population: sizeConfig.range,
    pointsOfInterestCount: sizeConfig.pointsOfInterestCount,
    environment: values.environment,
    primaryFunction: values.primaryFunction,
    tone: values.tone,
    mainTension: values.mainTension,
    authorityType: values.authorityType,
    name,
    traits,
    rung,
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
    rung,
  } = resolved;
  const scale = scaleFor(rung);

  const userMessage = `Generate a settlement for a tabletop RPG session that reads as a functioning community, not a location built entirely around one plot or mystery. It should answer four questions:
1. Why does this place exist? (its function, environment, and origin)
2. What is everyday life like here? (livelihoods, customs, ordinary concerns)
3. Who lives here? (a mix of notable residents, not just leaders and combatants)
4. What is happening here right now? (the dominant tension — one important thing, not the explanation for everything)

Parameters:
- Name: ${name}
- Genre / Setting: ${genre}
- Scale: ${size} (${population})
- Environment: ${environment}
- Primary Function: ${primaryFunction}
- Official Authority: ${authorityType}
- Tone: ${tone}
- Dominant Tension: ${mainTension}

Guidance that applies to every section below:
- The settlement should feel like it existed before the PCs arrived and will keep existing after the current tension resolves. Do not make every faction, notable inhabitant, secret, location and hook trace back to the same central concept.
- Avoid defaulting to hidden ledgers, forged records, missing documents, secret archives, inheritance paperwork, concealed bloodlines, bureaucratic conspiracies, or a merchant organisation secretly controlling all political authority, as the source of intrigue. Avoid defaulting to an ancient secret beneath the settlement, a missing heir, a dying ruler, a hidden cult, a prophecy, or an artefact everyone secretly wants. Use any of these only if the parameters above genuinely call for it.
- Use believable approximations for population ("~25% military personnel", "many herders and agricultural workers"), never fabricated precision ("exactly 17 blacksmiths").
- Scale constrains everything, not just the population figure. ${size} is a conceptual role for the Primary Function, not mandatory prose: describe an "Academic city" resolved at Hamlet scale as a scholarly community or academic enclave, never as a city, and give it the institutional footprint a place that size could plausibly support (one lecture hall and a handful of workshops, not a university district). Terminology, physical complexity, institutions, services, faction count and location count should all read as ${size}-scale.
- Prefer one or two strongly connected reasons the settlement exists over several unrelated ones stacked together (rare minerals AND a trade route AND ancient ruins AND unusual magic, all independently). Choose a causal chain instead — e.g. a mountain pass causes an unusual phenomenon, which causes an observatory, which causes an academic settlement, with trade arising naturally from the pass rather than as a separate special feature. Every major concept you introduce should affect the settlement somewhere else in the output (trade, crafts, faction interests, or daily life); otherwise leave it out.
- Reuse named people and places across sections instead of inventing new, disconnected ones. If Current Tension, History or a faction names a specific person, that same person (same name, same role) should also appear in Notable Inhabitants. If Life Here, History or Current Tension names a distinctive location — an inn, market, bridge, shrine, workshop, observatory, plaza or dock — that same location should appear in Points of Interest rather than a newly invented, unrelated one.
- Meet the requested counts for Points of Interest and Notable Inhabitants exactly; do not treat them as a loose suggestion when there is clearly enough material to reach them.

Return a valid JSON object matching this structure exactly:
{
  "title": "A single string for the settlement name",
  "summary": "One sentence: what this settlement is and what makes it interesting (e.g. 'A sunbaked salt-mining town built into a dormant volcano, ruled by a cartel of water-merchants.').",
  "content": "Prose description (markdown). Include these sections in order:\\n## Core Concept\\n[What makes this place distinct — 2-3 sentences answering why it exists]\\n\\n## First Impression\\n[What visitors notice first — sensory, atmospheric, genre-appropriate]\\n\\n## Inhabitants\\n[Approximate population and its broad occupational/economic composition, scaled to a ${size} — believable approximations, not a census; mention seasonal or transient population only where it fits; mention species/ancestry/cultural demographics only where the setting and concept make it relevant]\\n\\n## Life Here\\n[4-5 bullet points of concrete everyday-life detail — livelihoods, local custom, recreation, a common complaint, something locals discuss, something outsiders misunderstand — independent of the current tension]\\n\\n## History\\n[How the settlement came to be and what shaped it — 2-3 sentences, not solely in service of the current tension]",
  "lore": "Structured GM reference (markdown). Use EXACTLY this structure and order:\\n### Current Tension\\n[2-3 sentences on the dominant tension and what makes it escalate. Name real people or groups involved. This is one important thing happening, not the explanation for the rest of the settlement.]\\n\\n### Points of Interest\\n- **📍 Location Name**: one-line purpose or detail (exactly ${pointsOfInterestCount} items, spanning distinct purposes — government/authority, trade/craft/market, social/communal, religious/cultural, an unusual landmark, and a dangerous/forbidden/secret location — not all tied to the current tension)\\n\\n### Notable Inhabitants\\n- **Name** (Role): one concise sentence on personality, relevance, knowledge or a distinctive trait (exactly ${scale.notableInhabitants} people; at most 1-2 are authority or faction figures, the rest are working professions, socially useful roles like an innkeeper or healer, an ordinary resident with a distinctive viewpoint, and optionally one memorable eccentric)\\n\\n### Controlling / Important Factions\\n- **👥 Faction Name**: one-line motivation (${scale.factions} factions, each with an independent purpose — political, economic, or cultural/religious/environmental/historical — not all restatements of the same dispute; each should still make sense if the current tension vanished tomorrow)\\n\\n### Adventure Hooks\\n- [One hook tied to the current tension]\\n- [One hook from ordinary settlement life — trade, work, crime, relationships, a shortage or an accident — independent of the tension]\\n- [One hook involving exploration, the surrounding region, history, or another independent mystery]\\n\\n### GM Reference Information\\n- **Scale**: ${size} (${population})\\n- **Genre / Setting**: ${genre}\\n- **Environment**: ${environment}\\n- **Primary Function**: ${primaryFunction}\\n- **Official Authority**: ${authorityType}\\n- **Tone**: ${tone}",
  "labels": ["rpg-location", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
${options.campaignContext?.trim() ? `Campaign context from the user: ${options.campaignContext.trim()}` : ""}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed, genre-aware RPG campaign elements in JSON format. Match the genre, tone, and setting precisely — a cyberpunk district must feel nothing like a fantasy town. Build settlements that would keep making sense as places even if their current plot were removed.",
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

/**
 * `scalePhrase` stands in for the old `size` + `primaryFunction` pairing.
 * "Academic city" resolved at hamlet scale used to print literally as "a
 * hamlet built around academic city", contradicting its own scale in the
 * same sentence; `scaleFunctionPhrase` already picked the honest noun
 * ("scholarly community"), so these templates just use it directly (#2536).
 */
const CORE_CONCEPT_VARIANTS = [
  (
    name: string,
    scalePhrase: string,
    environment: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} is ${withArticle(scalePhrase)} in a ${environment.toLowerCase()} setting. ${tone} in character, it draws people who need what it offers and repels those who threaten it. Beneath the surface, ${mainTension.toLowerCase()} is shaping everything.`,
  (
    name: string,
    scalePhrase: string,
    environment: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} is ${withArticle(scalePhrase)} in ${environment.toLowerCase()} country, and its entire identity runs through what that implies. The ${tone.toLowerCase()} atmosphere is partly genuine and partly maintained — and ${mainTension.toLowerCase()} is testing both.`,
  (
    name: string,
    scalePhrase: string,
    environment: string,
    tone: string,
    mainTension: string,
  ) =>
    `A place shaped by ${environment.toLowerCase()} terrain, ${name} is ${withArticle(scalePhrase)} with the ${tone.toLowerCase()} quality of somewhere that knows what it is. What it does not know is how much longer that remains true, given ${mainTension.toLowerCase()}.`,
  (
    name: string,
    scalePhrase: string,
    environment: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} exists because this ${environment.toLowerCase()} location needed ${withArticle(scalePhrase)}. It is ${tone.toLowerCase()} and quietly under strain: ${mainTension.toLowerCase()} runs through everything here.`,
  (
    name: string,
    scalePhrase: string,
    environment: string,
    tone: string,
    mainTension: string,
  ) =>
    `Everything about ${name} — its ${environment.toLowerCase()} setting, its ${tone.toLowerCase()} reputation — traces back to being ${withArticle(scalePhrase)}. And ${mainTension.toLowerCase()} threatens to unravel all of it.`,
] as const;

const CORE_CONCEPT_TEMPLATE = (
  name: string,
  scalePhrase: string,
  environment: string,
  tone: string,
  mainTension: string,
  rng: () => number,
) =>
  CORE_CONCEPT_VARIANTS[Math.floor(rng() * CORE_CONCEPT_VARIANTS.length)](
    name,
    scalePhrase,
    environment,
    tone,
    mainTension,
  );

const POI_BLURB_BY_CATEGORY: Record<PoiCategory, string> = {
  government: "Where the settlement's official business actually gets done.",
  trade: "A working hub of the settlement's economy, not a backdrop for it.",
  social:
    "Where residents actually gather, and disputes get settled as often as they escalate.",
  religious: "A site of genuine local devotion, not merely decoration.",
  unusual: "A landmark locals have their own stories about.",
  dangerous:
    "A place most residents give a wide berth, for reasons that make sense once you know them.",
};

const FACTION_BLURB_BY_CATEGORY: Record<FactionCategory, string> = {
  political:
    "Holds real influence over who has a say in how the settlement is run.",
  economic:
    "Controls enough of the settlement's trade or resources to matter, whoever is officially in charge.",
  cultural:
    "Represents a cultural, religious or historical interest with its own reasons, independent of current politics.",
};

/**
 * Every settlement answers four questions: why it exists, what everyday life
 * is like, who lives there, and what is happening right now (#2536). The
 * smart schema already answers the first and fourth through its resolved
 * axes; this function builds the other two from the trait-driven content in
 * `public-settlement-community.ts`, and diversifies the points of interest,
 * factions and hooks so the current tension reads as one thing happening
 * rather than the explanation for everything.
 */
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
    rung,
  } = resolved;
  const scale = scaleFor(rung);

  // The lists hang off what the axes already decided, so a mountain-pass
  // settlement stops listing a harbour (#2341).
  const context: ResolveContext = {
    genre,
    values: {
      environment,
      primaryFunction,
      authorityType,
      tone,
      mainTension,
      size,
    },
    traits: resolved.traits,
  };

  const { values: pois, categories: poiCategories } = selectDiversePoi(
    settlementLocationCategoryPool(genre),
    pointsOfInterestCount,
    context,
    rng,
  );
  const { values: factions, categories: factionCategories } =
    selectDiverseFactions(
      settlementFactionCategoryPool(genre),
      scale.factions,
      context,
      rng,
    );

  const functionTraits = FUNCTION_TRAITS[primaryFunction] ?? [];
  // primaryFunction is a conceptual role, not mandatory prose: an "Academic
  // city" resolved at hamlet scale reads as a scholarly community, not a
  // city (#2536).
  const scalePhrase = scaleFunctionPhrase(
    functionTraits,
    rung,
    primaryFunction,
  );

  const inhabitants = buildInhabitants(context.values, scale, rng);
  const notableInhabitants = buildNotableInhabitants(
    context.values,
    genre,
    scale.notableInhabitants,
    name,
    rng,
  );
  const lifeHere = buildLifeHere(context.values, rng, pois);
  const hooks = buildAdventureHooks(
    {
      environment,
      primaryFunction,
      authorityType,
      mainTension,
      factions,
      pois,
      inhabitants: notableInhabitants,
    },
    rng,
  );

  const firstImpression =
    FIRST_IMPRESSION_BY_GENRE[genre] ?? FIRST_IMPRESSION_BY_GENRE["Fantasy"];

  const historyVariants = [
    `${name} was established as ${withArticle(scalePhrase)} and grew to serve that purpose above all else. The ${authorityType.toLowerCase()} has held power long enough for cracks to form. How those cracks spread is the story.`,
    `The original reason for ${name}'s existence was being ${withArticle(scalePhrase)}. Everything else — the layout, the social order, the current tensions — grew from that. The ${authorityType.toLowerCase()} that governs it inherited a settlement already shaped by decisions made before them.`,
    `${name} predates its current ${authorityType.toLowerCase()} by enough time that the original arrangement and the current reality have diverged in ways nobody officially acknowledges.`,
    `The settlement formed around being ${withArticle(scalePhrase)} and has never fully outgrown that original purpose. The ${authorityType.toLowerCase()} manages what that purpose attracts — which is both the settlement's strength and its persistent vulnerability.`,
    `Early records describe ${name} as a temporary installation. It became permanent when being ${withArticle(scalePhrase)} proved too valuable to abandon. The ${authorityType.toLowerCase()} that solidified over time are a later development, and not everyone accepts their legitimacy equally.`,
  ] as const;

  const note = institutionalNote(functionTraits, rung);
  const inhabitantsSection = [
    `Roughly ${population.toLowerCase()}. ${inhabitants.economicGroups.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(". ")}.`,
    inhabitants.transient
      ? inhabitants.transient.charAt(0).toUpperCase() +
        inhabitants.transient.slice(1) +
        "."
      : undefined,
    // Small settlements do not get a large institution's footprint just
    // because they share its function (#2536).
    note ? `At this size, that means ${note}.` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const content = `## Core Concept
${CORE_CONCEPT_TEMPLATE(name, scalePhrase, environment, tone, mainTension, rng)}

## First Impression
${firstImpression}

## Inhabitants
${inhabitantsSection}

## Life Here
${lifeHere.map((line) => `- ${line}`).join("\n")}

## History
${historyVariants[Math.floor(rng() * historyVariants.length)]}`;

  const lore = `### Current Tension
${buildCurrentTensionParagraph(mainTension, notableInhabitants, rng)}

### Points of Interest
${pois
  .map(
    (poi, i) => `- **📍 ${poi}**: ${POI_BLURB_BY_CATEGORY[poiCategories[i]]}`,
  )
  .join("\n")}

### Notable Inhabitants
${notableInhabitants
  .map(
    (n) =>
      `- **${n.name}** (${n.role}): ${n.note.charAt(0).toUpperCase() + n.note.slice(1)}.`,
  )
  .join("\n")}

### Controlling / Important Factions
${factions
  .map(
    (f, i) =>
      `- **👥 ${f}**: ${FACTION_BLURB_BY_CATEGORY[factionCategories[i]]}`,
  )
  .join("\n")}

### Adventure Hooks
${hooks.map((h) => `- ${h}`).join("\n")}

### GM Reference Information
- **Scale**: ${size} (${population})
- **Genre / Setting**: ${genre}
- **Environment**: ${environment}
- **Primary Function**: ${primaryFunction}
- **Official Authority**: ${authorityType}
- **Tone**: ${tone}`;

  const summary = `A ${tone.toLowerCase()} ${scalePhrase} in a ${environment.toLowerCase()} setting.`;

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
