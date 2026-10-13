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

function resolveTomeEra(genre: string, rng: Rng): string {
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
  const setting = genre.toLowerCase();
  if (/sci-fi|space opera|lancer/.test(setting)) {
    return pickFrom(["Pre-Collapse era", "Second Age of Strife"], rng);
  }
  if (/cyberpunk/.test(setting)) {
    return pickFrom(["Late 21st century", "Near-future era"], rng);
  }
  if (/modern conspiracy/.test(setting)) {
    return pickFrom(
      ["Interwar period, 1924", "Late 20th century", "Early 21st century"],
      rng,
    );
  }
  if (/post-apocalyptic/.test(setting)) {
    return pickFrom(["Pre-Collapse era", "Interwar period, 1924"], rng);
  }
  return pickFrom(eras, rng);
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
  const era = resolveTomeEra(genre, rng);
  const eraCompatibleTitles = sampleTitles.filter((sampleTitle) => {
    const titleYear = sampleTitle.match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/)?.[0];
    return !titleYear || era.includes(titleYear);
  });
  const title =
    concept ||
    pickFrom(
      eraCompatibleTitles.filter((t) => !options.avoidNames?.includes(t)),
      rng,
    ) ||
    eraCompatibleTitles[0] ||
    sampleTitles[0];

  const author = generateName(rng);

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
- **Composition Era**: ${resolved.era}
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

function isAdvancedSetting(genre: string): boolean {
  return /cyberpunk|sci-fi|space opera|lancer|modern|post-apocalyptic/i.test(
    genre,
  );
}

function describeBody(format: string): string {
  const normalized = format.toLowerCase();
  if (/vellum|parchment/.test(normalized)) return "vellum or parchment leaves";
  if (/leather/.test(normalized)) return "paper leaves beneath a leather cover";
  if (/notebook/.test(normalized)) return "stitched paper leaves";
  if (/sheaves/.test(normalized))
    return "loose paper sheets held together as a set";
  return "printed paper leaves";
}

function describeAnnotations(
  resolved: ResolvedTome,
  advanced: boolean,
): string {
  if (!advanced) {
    return `The writing is in ${resolved.language}; later owners added marginal notes, corrections, and a few deliberate redactions.`;
  }
  const translation = /alien|precursor|glyph/i.test(resolved.language)
    ? "; an incomplete machine translation sits beside unfamiliar glyphs"
    : ".";
  return `The copy bears access codes, redactions, and later notes${translation}`;
}

function describeMaterial(resolved: ResolvedTome, advanced: boolean): string {
  const isDigitalSource =
    /datapad|data-slate|telemetry|digital|protocol|file|archive|transcript/i.test(
      resolved.tomeType,
    );
  const sourceMedium = isDigitalSource
    ? ` It reproduces material from a ${/slate|datapad/i.test(resolved.tomeType) ? "data-slate" : "digital record"}, with missing entries and signs of repeated copying.`
    : "";
  const production = advanced
    ? "Its text was copied or printed for the institutions of its setting."
    : "Its text was copied by hand or set for print in keeping with its period.";
  return `The ${resolved.format.toLowerCase()} has ${describeBody(resolved.format)} and a binding consistent with its stated format. ${production}${sourceMedium} ${describeAnnotations(resolved, advanced)}`;
}

function describeOrigin(resolved: ResolvedTome, advanced: boolean): string {
  if (advanced) {
    return `Compiled in the ${resolved.era} by ${resolved.author}, the work records material suppressed by the authorities or organisation that controlled its original access. Its surviving copy passed through several owners before reaching the ${resolved.custodian.toLowerCase()}.`;
  }
  return `Authored in the ${resolved.era} by ${resolved.author}, the work was suppressed after its claims challenged the beliefs or interests of its original authorities. This ${resolved.rarity.toLowerCase()} passed through several owners before reaching the ${resolved.custodian.toLowerCase()}.`;
}

function describeClue(resolved: ResolvedTome, advanced: boolean): string {
  const method = advanced
    ? "cross-checking the dates and damaged entries reveals when the evidence can be recovered"
    : "comparing its dated entries with the marginal corrections reveals when the evidence can be found";
  return `The records point to a specific hidden site or event tied to ${resolved.tomeType.toLowerCase()}; ${method}. One account is deliberately altered to protect the original source.`;
}

function describeRisk(resolved: ResolvedTome): string {
  const hazard = resolved.primaryHazard.toLowerCase();
  if (/physical|environmental/.test(hazard)) {
    return `Handling or operating the damaged ${resolved.format.toLowerCase()} exposes the reader to a concrete hazard: its compromised casing, contaminated pages, or unstable components can cause injury unless inspected and secured first.`;
  }
  if (/social|investigation/.test(hazard)) {
    return `Accessing the material leaves an audit trail. The ${resolved.custodian.toLowerCase()} and interested parties can identify readers, creating a risk of surveillance, questioning, or confiscation.`;
  }
  if (/mental|obsessive/.test(hazard)) {
    return "Repeated study encourages fixation: the reader starts treating an unresolved pattern in the text as urgent evidence, risking lost sleep and poor decisions until they step away or verify it independently.";
  }
  if (/supernatural|entity/.test(hazard)) {
    return "Studying the material draws the attention of something connected to its subject. Each attempt to decode or use it can reveal the reader's location or intentions to that presence.";
  }
  return `Study carries the stated risk of ${resolved.primaryHazard.toLowerCase()}; investigators should identify who or what enforces it before sharing, handling, or acting on the text.`;
}

function describeAdventureHooks(
  resolved: ResolvedTome,
  advanced: boolean,
): string[] {
  if (advanced) {
    return [
      `A source hires the party to recover a missing data partition before the ${resolved.custodian.toLowerCase()} erases its access logs.`,
      `The party discovers that a planned operation relies on the document's falsified date and must find the authentic record.`,
      `A rival offers the party a copy of the ${resolved.tomeType.toLowerCase()} in exchange for identifying who altered its findings.`,
    ];
  }
  return [
    `An agent of the ${resolved.custodian.toLowerCase()} hires the party to recover a missing section before a rival collector does.`,
    "A local group is acting on the author's false conclusion; the party must find the original passage before its next gathering.",
    "The party inherits an uncatalogued copy and must identify its owner before interested buyers arrive.",
  ];
}

function localTomeDetails(resolved: ResolvedTome) {
  const advanced = isAdvancedSetting(resolved.genre);
  const material = describeMaterial(resolved, advanced);
  const origin = describeOrigin(resolved, advanced);
  const clue = describeClue(resolved, advanced);
  const risk = describeRisk(resolved);
  const faction = advanced
    ? "The Information Control Bureau"
    : "The Silt Brotherhood";
  const location = advanced
    ? "The restricted facility identified in the source records"
    : "The archive or ruin where the original account was made";
  const hooks = describeAdventureHooks(resolved, advanced);

  return { material, origin, clue, risk, faction, location, hooks };
}

export function generateTomeLocal(
  options: TomeGeneratorOptions,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveTome(options, rng);

  const authorName = resolved.author;
  const details = localTomeDetails(resolved);

  const content = `### Physical Description & Format
${details.material}

### Provenance & Transmission
${details.origin}

### Contents & Revelations
The work purports to be an analytical exposition of ${resolved.tomeType.toLowerCase()}, composed in ${resolved.language}, within a ${resolved.genre} setting. Its account combines observations, claims, and records relevant to its chosen subject and setting.

> *"The record is incomplete where the original account should name its source; compare the surviving entries before trusting the conclusion."*
> — *${resolved.format}, annotated copy*

${details.clue} The author's central interpretation remains unverified and should be treated as a claim, not established fact.

### Risks & Costs of Study
- **Primary hazard (${resolved.primaryHazard})**: ${details.risk}
- **Social / Legal**: The current custodian has restricted access, and a rival interested party is seeking the same material.
- **Mental**: The text's contradictions make premature conclusions tempting; investigators who do not verify its claims may act on false information.

### Adventure Hooks
1. **Recover the Missing Section**: ${details.hooks[0]}
2. **Correct the Record**: ${details.hooks[1]}
3. **Trace the Copy**: ${details.hooks[2]}`;

  const lore = `### At the Table Reference

### Connected Entities
- **${authorName}** (Author / Origin): Compiled the work in the ${resolved.era}; their account reflects the limits and pressures of its time.
- **${resolved.custodian}** (Current Custodian / Archive): Holds the access or accession record for this copy.
- **${details.faction}** (Interested Faction): Seeks the withheld information in the manuscript.
- **${details.location}** (Associated Location): Tied to the original records and their missing context.

### Quick Checks & Mechanics
- **Deciphering**: Requires fluency in ${resolved.language} or two days of laborious reference translation with an academic lexicon.
- **The Deception / Flaw**: ${details.clue}
- **Safe Handling**: Account for the primary hazard (${resolved.primaryHazard}) before studying or sharing the material.`;

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
        targetTitle: resolved.custodian,
        relationship: "catalogued in collection of",
      },
    ],
    status: "active",
  };
}
