/**
 * Public Tome / Forbidden Book generator — framework-free, for the
 * marketing/SEO generator surface (no login, no vault context) and in-vault
 * campaign generator reuse (#2221).
 *
 * Generates occult treatises, grimoires, research logs, heretical chronicles,
 * and dangerous manuscripts with physical provenance, actionable excerpts,
 * hazardous study costs, and adventure hooks.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { SuggestedConnection } from "./campaign-generator-types";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import {
  formatCampaignContextBlock,
  avoidNamesExcludingContext,
} from "./campaign-context";
import { tomeConfig } from "./public-tome-constants";

export { tomeConfig };

export interface TomeGeneratorOptions {
  genre?: string;
  theme?: string;
  tomeType?: string;
  format?: string;
  rarity?: string;
  custodian?: string;
  primaryHazard?: string;
  language?: string;
  concept?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

export interface ResolvedTome {
  genre: string;
  tomeType: string;
  format: string;
  rarity: string;
  custodian: string;
  primaryHazard: string;
  language: string;
  concept?: string;
  campaignContext?: string;
  title: string;
  author: string;
  era: string;
}

export function resolveTome(
  options: TomeGeneratorOptions,
  rng: Rng = defaultRng,
): ResolvedTome {
  const genre =
    options.theme?.trim() || options.genre?.trim() || "Cosmic Horror";
  const themeTypes = tomeConfig.tomeTypesByTheme[genre] ?? tomeConfig.tomeTypes;
  const tomeType = options.tomeType?.trim() || pickFrom(themeTypes, rng);
  const format = options.format?.trim() || pickFrom(tomeConfig.formats, rng);
  const rarity = options.rarity?.trim() || pickFrom(tomeConfig.rarities, rng);
  const custodian =
    options.custodian?.trim() || pickFrom(tomeConfig.custodians, rng);
  const primaryHazard =
    options.primaryHazard?.trim() || pickFrom(tomeConfig.primaryHazards, rng);
  const language =
    options.language?.trim() || pickFrom(tomeConfig.languages, rng);
  const concept = options.concept?.trim() || undefined;
  const campaignContext = options.campaignContext?.trim() || undefined;

  const sampleTitles =
    tomeConfig.sampleTitlesByTheme[genre] ??
    tomeConfig.sampleTitlesByTheme["Cosmic Horror"];
  const title =
    concept ||
    pickFrom(
      sampleTitles.filter((t) => !options.avoidNames?.includes(t)),
      rng,
    ) ||
    sampleTitles[0];

  const author = generateName(rng);
  const eras = [
    "Late 14th century",
    "Mid-16th century",
    "Winter of 1684",
    "Early 18th century",
    "Autumn of 1888",
    "Interwar period, 1924",
    "Pre-Collapse era",
    "Second Age of Strife",
  ];
  const era = pickFrom(eras, rng);

  return {
    genre,
    tomeType,
    format,
    rarity,
    custodian,
    primaryHazard,
    language,
    concept,
    campaignContext,
    title,
    author,
    era,
  };
}

export interface TomePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedTome;
}

export function buildTomePrompt(
  options: TomeGeneratorOptions,
  sessionContext?: string,
  rng: Rng = defaultRng,
): TomePrompt {
  const resolved = resolveTome(options, rng);

  const systemInstruction = `You are an expert TTRPG worldbuilder, occult scholar, and game designer. You generate detailed, evocative, system-neutral tomes, grimoires, forbidden books, research logs, and dangerous manuscripts.

Follow these strict writing guidelines:
1. British English spelling and grammar throughout (e.g., mould, colour, catalogue, travelling, harbour).
2. Avoid purple-prose clichés. Books must feel historically grounded, material, and tangible.
3. Avoid formulaic titles like "The [Colour] [Noun]" or "Codex of [Doom]". Use authentic period naming (treatises, ledgers, confessions, liturgical commentaries, field notebooks, letters).
4. Physical descriptions must describe binding, materials, smell, marks, marginalia, and physical condition convincingly.
5. Provenance must be a coherent historical chain of transmission, not a disconnected list of spooky events.
6. The contents must contain a playable revelation or clue alongside a notable translated excerpt.
7. Include genuine contradictions, deceptive passages, or author biases that create consequences if believed.
8. Hazards and risks must present concrete, actionable tabletop stakes (physical, investigative, psychological).
9. Adventure hooks must stem directly from the book's specific nature, custodians, or missing fragments.
10. System-neutral: Do not hard-code mechanical stats (no Sanity point costs, D&D spell slots, or CoC dice math); frame costs in narrative and procedural terms.`;

  const avoidBlock =
    options.avoidNames && options.avoidNames.length > 0
      ? avoidNamesExcludingContext(options.avoidNames, resolved.campaignContext)
      : "";

  const userMessage = `Generate a comprehensive, system-neutral Tome / Forbidden Book entry for a TTRPG campaign.

### Requested Parameters:
- **Genre / Setting Vibe**: ${resolved.genre}
- **Type of Book**: ${resolved.tomeType}
- **Physical Format**: ${resolved.format}
- **Rarity / Edition**: ${resolved.rarity}
- **Current Custodian / Archive**: ${resolved.custodian}
- **Primary Hazard / Cost**: ${resolved.primaryHazard}
- **Original Language / Script**: ${resolved.language}
${resolved.concept ? `- **User Concept / Working Title**: ${resolved.concept}` : ""}
${formatCampaignContextBlock(resolved.campaignContext)}
${sessionContext ? `### Recent Session Context:\n${sessionContext}\n` : ""}
${avoidBlock}
${NAME_BAN_PROMPT}

Return a valid JSON object matching this schema exactly:
{
  "title": "Historical title of the work, with alternate vernacular name or catalog number if applicable",
  "summary": "A concise 1-2 sentence overview: format, author, subject, and current significance.",
  "content": "Full markdown document containing these exact sections in order:
### Physical Description & Format
Describe binding material, paper/vellum/slate, ink, handwriting or type, seals, physical damage, and marginalia.

### Provenance & Transmission
Detail the author/origin, era of composition, translation and suppression history, surviving copies, and current custodian.

### Contents & Revelations
Detail the core subject matter, a translated excerpt or notable passage, the actionable secret or clue it provides, and what parts are erroneous, biased, or deliberately deceptive.

### Risks & Costs of Study
Actionable hazards: physical contamination or traps, social/legal scrutiny from authorities or factions, and the mental or supernatural toll of prolonged reading.

### Adventure Hooks
At least three concrete, numbered adventure hooks connecting investigators to the tome.",
  "lore": "Markdown reference notes for the GM:
### At the Table Reference

### Connected Entities
- **Author / Compiler**: (Name and role)
- **Current Custodian / Owner**: (Name, archive, or institution)
- **Interested Faction**: (Cult, society, or rival collector pursuing it)
- **Associated Location**: (Archive, ruin, estate, or shrine)

### Quick Checks & Mechanics
- **Deciphering**: Skill or language required to read or translate.
- **The Deception / Flaw**: What the author misunderstood or lied about.
- **Safe Handling**: Practical rule to mitigate or avoid the primary hazard.",
  "labels": ["tome", "forbidden-book", "grimoire", "item"],
  "connections": [
    { "targetTitle": "Name of custodian or faction", "relationship": "relationship description" }
  ]
}

Before returning, run a consistency pass: the volume's title must feel historically grounded within the world without cliché formulas; the physical materials, binding, and condition must align with its stated age and transmission history; the excerpt must reflect the stated language and translation state; the risks and costs of study must provide actionable play stakes rather than abstract flavor; the adventure hooks must directly involve the specific tome, its custodian, or its missing fragments; and the errors or deceptive passages must be distinct from the true revelation.

Return ONLY the raw JSON object. Do not wrap in markdown code blocks like \`\`\`json.`;

  return {
    systemInstruction,
    userMessage,
    resolved,
  };
}

function parseTextString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeLabels(raw: unknown, genre?: string): string[] {
  const list = Array.isArray(raw)
    ? raw.filter(
        (l: unknown): l is string => typeof l === "string" && Boolean(l.trim()),
      )
    : [];
  if (!list.includes("tome")) list.unshift("tome");
  if (!list.includes("item")) list.push("item");
  if (genre && !list.includes(genre.toLowerCase())) {
    list.push(genre.toLowerCase());
  }
  return list;
}

function parseConnections(
  raw: unknown,
  fallback?: SuggestedConnection[],
): SuggestedConnection[] | undefined {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .filter(
      (c: any): c is { targetTitle: string; relationship: string } =>
        Boolean(c) &&
        typeof c.targetTitle === "string" &&
        typeof c.relationship === "string",
    )
    .map((c) => ({
      targetTitle: c.targetTitle.trim(),
      relationship: c.relationship.trim(),
    }));
}

export function parseTomeResponse(
  text: string,
  resolved?: ResolvedTome,
): PublicGeneratorOutput {
  const fallback = generateTomeLocal(
    resolved ?? {
      genre: "Cosmic Horror",
      tomeType: "Occult Treatise / Cosmology",
      format: "Leather-bound Quarto",
      rarity: "Unique Original Manuscript",
      custodian: "University Restricted Archive",
      primaryHazard: "Mental / Obsessive Toll",
      language: "Archaic Latin",
    },
  );

  try {
    const data = parseFencedJson<Record<string, unknown>>(text);
    if (!data || typeof data !== "object") return fallback;

    return {
      type: "item",
      title: parseTextString(data.title, fallback.title),
      summary: parseTextString(data.summary, fallback.summary ?? ""),
      content: parseTextString(data.content, fallback.content),
      lore: parseTextString(data.lore, fallback.lore),
      labels: normalizeLabels(data.labels, resolved?.genre),
      connections: parseConnections(data.connections, fallback.connections),
      status: "active",
    };
  } catch {
    return fallback;
  }
}

export function generateTomeLocal(
  options: TomeGeneratorOptions,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveTome(options, rng);

  const custodianName = `${generateName(rng)} Antiquarian Society`;
  const authorName = resolved.author;

  const content = `### Physical Description & Format
Bound in ${resolved.format.toLowerCase()} with tarnished brass corners and secure clasp fastenings. The volume comprises roughly eighty leaves of heavy, unevenly trimmed parchment, displaying noticeable water-staining along the lower margins. The principal text is penned in a disciplined, upright clerical hand using sepia iron-gall ink. Frequent marginal glosses in at least three distinct later hands are visible throughout, executed in faded red ochre and carbon ink, with several passages scored through and amended in the margins.

### Provenance & Transmission
Authored during the ${resolved.era.toLowerCase()} by ${authorName}, a renegade scholar whose radical astronomical observations were formally suppressed by the governing synod. Only a handful of hand-copied transcriptions survived the purge of the author's scriptorium. This specific volume represents a ${resolved.rarity.toLowerCase()}, preserved for over a century within a secluded monastic library before entering private circulation. It is currently held in the ${resolved.custodian.toLowerCase()}, catalogued under private provenance.

### Contents & Revelations
The work purports to be an analytical exposition of ${resolved.tomeType.toLowerCase()}, composed in ${resolved.language}. It collates seasonal planetary conjunctions with subterranean acoustic phenomena recorded across deep coastal fissures.

> *"When the tide forsakes the eastern shoals beneath the unblinking eye of the red wanderer, the hollow stones shall drink what the priests refused to pour."*
> — *Section IV, Folio 22r*

The text provides an actionable clue: a verified timetable predicting the exact opening of the drowned lower sluice gates beneath the bay. However, the author was mistaken regarding the nature of the entity inhabiting the trench, falsely assuming it could be appeased through classical liturgical repetition.

### Risks & Costs of Study
- **Physical**: The parchment leaves are coated in a volatile dusting of toxic mould; handling without dry protective cloths induces burning of the mucous membranes and blurred vision.
- **Social / Legal**: The current custodian has reported this edition as stolen property, and antiquarian agents are actively pursuing leads among regional bookbinders.
- **Mental**: Prolonged translation of the third discourse causes persistent auditory fixation, leaving the reader unable to sleep without hearing the rhythm of breaking surf.

### Adventure Hooks
1. **The Missing Gathering**: An agent representing the ${custodianName} hires the party to recover a detached gathering of four leaves stolen during transit between private collections.
2. **The Erroneous Chant**: A local fraternal lodge is preparing to perform the appeasement rite on the upcoming equinox, completely unaware that the author's translation inverts the sealing verses.
3. **The Collector's Bequest**: The party inherits an uncatalogued trunk containing this manuscript, along with a sealed letter warning that three rival purchasers will arrive before nightfall.`;

  const lore = `### At the Table Reference

### Connected Entities
- **${authorName}** (Author / Origin): The seventeenth-century scholar who documented the coastal rites.
- **${custodianName}** (Current Custodian / Archive): Holds the institutional accession record and security lease.
- **The Silt Brotherhood** (Interested Faction): Seeks the unredacted cipher notes in the margins.
- **Saint Orra's Undercroft** (Associated Location): Where the original observations were recorded.

### Quick Checks & Mechanics
- **Deciphering**: Requires fluency in ${resolved.language} or two days of laborious reference translation with an academic lexicon.
- **The Deception / Flaw**: The author's ritual chant does not banish the entity; it pacifies it for only an hour while increasing its territorial aggression.
- **Safe Handling**: Keep enclosed in a dry cedar box with desiccating salts; touching damp margins bare-handed requires immediate cleansing with alcohol.`;

  return {
    type: "item",
    title: resolved.title,
    summary: `${resolved.title}: A ${resolved.rarity.toLowerCase()} of ${resolved.tomeType.toLowerCase()} in ${resolved.language}, currently located in the ${resolved.custodian.toLowerCase()}.`,
    content,
    lore,
    labels: [
      "tome",
      "forbidden-book",
      "grimoire",
      "item",
      resolved.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    ],
    connections: [
      {
        targetTitle: custodianName,
        relationship: "catalogued in collection of",
      },
    ],
    status: "active",
  };
}
