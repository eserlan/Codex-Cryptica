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
  exactDamage: string;
  associatedLocation: string;
  bookClaim: string;
  deceptionOrFlaw: string;
  objectiveTruth: string;
  actionableClue: string;
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

  const damageProfile = pickFrom(tomeConfig.damageProfiles, rng);
  const exactDamage = damageProfile.description;

  const locations = tomeConfig.locationsByTheme[genre] ??
    tomeConfig.locationsByTheme["Cosmic Horror"] ?? [
      "The archive or ruin where the original account was made",
    ];
  const associatedLocation = pickFrom(locations, rng);

  const deceptions = tomeConfig.deceptionProfilesByTheme[genre] ??
    tomeConfig.deceptionProfilesByTheme["Cosmic Horror"] ?? [
      {
        claim:
          "The central thesis asserts that repeating the ritual chant binds the threshold",
        deception:
          "The chant inverts the seal, pacifying the entity for only an hour while drawing it closer",
        truth:
          "The entity cannot be appeased by prayer; it must be turned aside by cold iron and salt-flame",
        clue: "A dated parish margin notes three drownings on the exact night of the claimed success",
      },
    ];
  const deceptionProfile = pickFrom(deceptions, rng);
  const bookClaim = deceptionProfile.claim;
  const deceptionOrFlaw = deceptionProfile.deception;
  const objectiveTruth = deceptionProfile.truth;
  const actionableClue = deceptionProfile.clue;

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
    exactDamage,
    associatedLocation,
    bookClaim,
    deceptionOrFlaw,
    objectiveTruth,
    actionableClue,
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
10. System-neutral: Do not hard-code mechanical stats (no Sanity point costs, D&D spell slots, or CoC dice math); frame costs in narrative and procedural terms.
11. Strict Cross-Section Consistency:
    - Physical Damage & Loss Continuity: Never contradict the exact damage, missing leaves, or missing gatherings established in the prompt. If seven leaves are removed, adventure hooks must refer to missing leaves, not gatherings (a gathering contains multiple leaves).
    - Procedure & Mechanics Continuity: If a ritual, procedure, or false instruction is described, the failure condition in Revelations and Quick Checks must match identically. If step 1 and step 2 inversion triggers the flaw, Quick Checks must not claim step 3 was the trigger.
    - Location Continuity: The physical site of the secret, ruin, or revelation must remain identical across Provenance, Contents, Adventure Hooks, and Lore.
    - Chronology & Lifespans: Historical figures from centuries past must not appear as living people in contemporary adventure hooks unless the text explicitly designates them as possessing an unnatural lifespan or supernatural trait.
    - Layered GM Ground Truth vs Intentional Unreliability: Distinguish intentional in-world unreliability (what the author claimed vs what the censor changed) from authorial continuity errors. In 'lore', provide a clean, non-redundant 'Ground Truth for the GM' cheat sheet rather than duplicating prose from 'content'.`;

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

### Canonical Ground Truth (All generated sections MUST derive consistently from these anchor facts):
- **Physical Damage & Missing Material**: ${resolved.exactDamage} (Do NOT contradict this quantity or unit elsewhere).
- **Associated Location**: ${resolved.associatedLocation} (Must remain consistent across all sections).
- **The Book's Surface Claim**: ${resolved.bookClaim}
- **The Deception / Flaw**: ${resolved.deceptionOrFlaw}
- **The Objective Reality**: ${resolved.objectiveTruth}
- **Actionable Clue**: ${resolved.actionableClue}

Return a valid JSON object matching this schema exactly:
{
  "title": "Historical title of the work, with alternate vernacular name or catalog number if applicable",
  "summary": "A concise 1-2 sentence overview: format, author, subject, and current significance.",
  "content": "Full markdown document containing these exact sections in order:
### Physical Description & Format
Describe binding material, paper/vellum/slate, ink, handwriting or type, seals, physical damage (${resolved.exactDamage}), and marginalia.

### Provenance & Transmission
Detail the author/origin, era of composition, translation and suppression history, surviving copies, and current custodian.

### Contents & Revelations
Detail the core subject matter, a translated excerpt or notable passage, the actionable secret or clue (${resolved.actionableClue}), and the flawed or deceptive surface claim (${resolved.bookClaim}).

### Risks & Costs of Study
Actionable hazards: physical contamination or traps, social/legal scrutiny from authorities or factions, and the mental or supernatural toll of prolonged reading.

### Adventure Hooks
At least three concrete, numbered adventure hooks connecting investigators to the tome, its missing material (${resolved.exactDamage}), or the associated location (${resolved.associatedLocation}).",
  "lore": "Markdown operational reference notes for the GM (concise, scannable, and non-redundant with content):
### At the Table Reference

### Ground Truth for the GM
- **What the Book Claims**: Concise summary of what the text purports or instructs.
- **The Deception / Flaw**: What the author misunderstood, falsified, or what a censor inserted.
- **The Objective Truth**: The underlying campaign reality that the GM knows.
- **Actionable Clue**: The specific clue, marginalia, or contradiction players can discover to uncover the deception.

### Connected Entities
- **Author / Compiler**: (Name and role)
- **Current Custodian / Owner**: (Name, archive, or institution)
- **Interested Faction**: (Cult, society, or rival collector pursuing it)
- **Associated Location**: ${resolved.associatedLocation}

### Quick Checks & Mechanics
- **Deciphering**: Skill, language, or time required to read or translate.
- **The Failure Condition**: Exact mechanical or narrative consequence if the flawed instruction is followed.
- **Safe Handling**: Practical rule to mitigate or avoid the primary hazard.",
  "labels": ["tome", "forbidden-book", "grimoire", "item"],
  "connections": [
    { "targetTitle": "Name of custodian or faction", "relationship": "relationship description" }
  ]
}

Before returning, run a consistency pass: the volume's title must feel historically grounded within the world without cliché formulas; the physical materials, binding, and condition must align with its stated age and transmission history; the excerpt must reflect the stated language and translation state; the risks and costs of study must provide actionable play stakes rather than abstract flavor; the adventure hooks must directly involve the specific tome, its custodian, or its missing fragments; and the errors or deceptive passages must be distinct from the true revelation.

Strict cross-section consistency audit:
1. Physical damage and missing leaf/gathering counts must match across all sections (${resolved.exactDamage}). Never say leaves in one section and gatherings in another without explanation.
2. The failure condition in Quick Checks must match the flawed instruction in Contents.
3. The associated location must match across Contents, Adventure Hooks, and Lore (${resolved.associatedLocation}).
4. Historical personages from past centuries must not appear alive without explanation.
5. In 'lore', provide a clean, non-redundant 'Ground Truth for the GM' cheat sheet rather than duplicating prose from 'content'.

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

export function ensureGroundTruthInLore(
  lore: string,
  resolved: Partial<ResolvedTome>,
): string {
  if (/### Ground Truth for the GM/i.test(lore)) {
    return lore;
  }

  const claim =
    resolved.bookClaim ??
    "The surface text asserts a ritual or historical premise";
  const deception =
    resolved.deceptionOrFlaw ??
    "The premise contains a critical author error or deliberate falsehood";
  const truth =
    resolved.objectiveTruth ??
    "The underlying reality directly contradicts the text's conclusion";
  const clue =
    resolved.actionableClue ??
    "A marginal note or physical anomaly reveals the inconsistency";

  const groundTruthBlock = `### Ground Truth for the GM
- **What the Book Claims**: ${claim}
- **The Deception / Flaw**: ${deception}
- **The Objective Truth**: ${truth}
- **Actionable Clue**: ${clue}\n\n`;

  if (/### At the Table Reference/i.test(lore)) {
    return lore.replace(
      /### At the Table Reference\s*/i,
      `### At the Table Reference\n\n${groundTruthBlock}`,
    );
  }

  return `${groundTruthBlock}${lore}`;
}

export function parseTomeResponse(
  text: string,
  resolved?: Partial<ResolvedTome>,
): PublicGeneratorOutput {
  const fallbackResolved = {
    ...resolveTome(resolved ?? {}),
    ...resolved,
  };
  const fallback = generateTomeFromResolved(fallbackResolved);

  try {
    const data = parseFencedJson<Record<string, unknown>>(text);
    if (!data || typeof data !== "object") return fallback;

    let rawLore = parseTextString(data.lore, fallback.lore);
    if (resolved) {
      rawLore = ensureGroundTruthInLore(rawLore, resolved);
    }

    return {
      type: "item",
      title: parseTextString(data.title, fallback.title),
      summary: parseTextString(data.summary, fallback.summary ?? ""),
      content: parseTextString(data.content, fallback.content),
      lore: rawLore,
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
  return `The ${resolved.format.toLowerCase()} has ${describeBody(resolved.format)} and a binding consistent with its stated format. ${production}${sourceMedium} Condition: ${resolved.exactDamage}. ${describeAnnotations(resolved, advanced)}`;
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
  return `The records point to ${resolved.associatedLocation}; ${method}. On the surface, ${resolved.bookClaim.toLowerCase().replace(/^(page \d+ asserts that|the central thesis asserts that|the text directs that)\s*/i, "")}. However, a key anomaly stands out: ${resolved.actionableClue.toLowerCase().replace(/^[a-z]/, (c) => c.toUpperCase())}.`;
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
      `A source hires the party to recover missing material (${resolved.exactDamage.toLowerCase()}) before the ${resolved.custodian.toLowerCase()} permanently purges access logs.`,
      `The party discovers that a planned operation at ${resolved.associatedLocation} relies on the document's falsified conclusion; they must verify the authentic record.`,
      `A rival faction offers the party unredacted files from the ${resolved.tomeType.toLowerCase()} in exchange for identifying who altered the records.`,
    ];
  }
  return [
    `An agent of the ${resolved.custodian.toLowerCase()} hires the party to recover missing material (${resolved.exactDamage.toLowerCase()}) before a rival collector does.`,
    `A local group is acting on the author's flawed conclusion near ${resolved.associatedLocation}; the party must intervene before the error triggers catastrophe.`,
    `The party inherits an uncatalogued copy whose marginalia reveals the true site beneath ${resolved.associatedLocation}, drawing immediate interest from collectors.`,
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
  const location = resolved.associatedLocation;
  const hooks = describeAdventureHooks(resolved, advanced);

  return { material, origin, clue, risk, faction, location, hooks };
}

export function generateTomeLocal(
  options: TomeGeneratorOptions,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return generateTomeFromResolved(resolveTome(options, rng));
}

function generateTomeFromResolved(
  resolved: ResolvedTome,
): PublicGeneratorOutput {
  const authorName = resolved.author;
  const details = localTomeDetails(resolved);

  const content = `### Physical Description & Format
${details.material}

### Provenance & Transmission
${details.origin}

### Contents & Revelations
The work purports to be an analytical exposition of ${resolved.tomeType.toLowerCase()}, composed in ${resolved.language}, within a ${resolved.genre} setting. Its account combines observations, technical or liturgical claims, and records relevant to its chosen subject and setting.

> *"The record is incomplete where the original account should name its source; compare the surviving entries before trusting the conclusion."*
> — *${resolved.format}, annotated copy*

${details.clue} The author's central interpretation is compromised by deliberate deception or fatal misunderstanding.

### Risks & Costs of Study
- **Primary hazard (${resolved.primaryHazard})**: ${details.risk}
- **Social / Legal**: The current custodian has restricted access, and an interested party (${details.faction}) is seeking the same material.
- **Mental**: The text's contradictions make premature conclusions tempting; investigators who do not verify its claims may act on false information.

### Adventure Hooks
1. **Recover the Missing Material**: ${details.hooks[0]}
2. **Prevent Catastrophe**: ${details.hooks[1]}
3. **Trace the Hidden Site**: ${details.hooks[2]}`;

  const lore = `### At the Table Reference

### Ground Truth for the GM
- **What the Book Claims**: ${resolved.bookClaim}.
- **The Deception / Flaw**: ${resolved.deceptionOrFlaw}.
- **The Objective Truth**: ${resolved.objectiveTruth}.
- **Actionable Clue**: ${resolved.actionableClue}.

### Connected Entities
- **${authorName}** (Author / Origin): Compiled the work in the ${resolved.era}; their account reflects the limits and pressures of its time.
- **${resolved.custodian}** (Current Custodian / Archive): Holds the access or accession record for this copy.
- **${details.faction}** (Interested Faction): Seeks the withheld information in the manuscript.
- **${details.location}** (Associated Location): Tied to the volume's secret and operational site.

### Quick Checks & Mechanics
- **Deciphering**: Requires fluency in ${resolved.language} or two days of laborious reference translation with an academic lexicon.
- **The Failure Condition**: If characters act on the flawed premise (${resolved.deceptionOrFlaw.toLowerCase()}), ${resolved.primaryHazard.toLowerCase()} triggers immediately and the operation fails.
- **Safe Handling**: Account for the primary hazard (${resolved.primaryHazard}) before studying, handling, or transporting the material.`;

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

export interface TomeConsistencyAuditResult {
  valid: boolean;
  issues: string[];
}

function checkRequiredSections(
  content: string,
  lore: string,
  issues: string[],
): void {
  const requiredContentSections = [
    "### Physical Description & Format",
    "### Provenance & Transmission",
    "### Contents & Revelations",
    "### Risks & Costs of Study",
    "### Adventure Hooks",
  ];
  for (const sec of requiredContentSections) {
    if (!content.includes(sec)) {
      issues.push(`Content is missing required section: ${sec}`);
    }
  }

  const requiredLoreSections = [
    "### At the Table Reference",
    "### Ground Truth for the GM",
    "### Connected Entities",
    "### Quick Checks & Mechanics",
  ];
  for (const sec of requiredLoreSections) {
    if (!lore.includes(sec)) {
      issues.push(`Lore is missing required section: ${sec}`);
    }
  }
}

function checkGroundTruthElements(lore: string, issues: string[]): void {
  if (!lore.includes("### Ground Truth for the GM")) return;

  const requiredFields = [
    { label: "What the Book Claims", pattern: /What the Book Claims/i },
    { label: "The Deception / Flaw", pattern: /The Deception \/ Flaw/i },
    { label: "The Objective Truth", pattern: /The Objective Truth/i },
    { label: "Actionable Clue", pattern: /Actionable Clue/i },
  ];

  for (const field of requiredFields) {
    if (!field.pattern.test(lore)) {
      issues.push(`Ground Truth for the GM missing '${field.label}'`);
    }
  }
}

function checkUnitContradictions(combined: string, issues: string[]): void {
  const leafMatch = combined.match(
    /(\w+|\d+)\s+leaves\s+(?:are\s+)?(?:missing|excised|removed|cut)/i,
  );
  const gatheringMatch = combined.match(
    /(\w+|\d+)\s+(?:gatherings|quires)\s+(?:are\s+)?(?:missing|excised|removed|passed into)/i,
  );
  if (leafMatch && gatheringMatch) {
    if (
      !combined.includes("comprising") &&
      !combined.includes("containing") &&
      !combined.includes("consisting of")
    ) {
      issues.push(
        `Potential unit contradiction: text mentions both "${leafMatch[0]}" and "${gatheringMatch[0]}" without explaining the relationship between leaves and gatherings.`,
      );
    }
  }
}

function checkParagraphRedundancy(
  content: string,
  lore: string,
  issues: string[],
): void {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split("\n")
        .filter(
          (line) =>
            !line.trim().startsWith("#") && !line.trim().startsWith(">"),
        )
        .join("\n")
        .trim(),
    )
    .filter((p) => p.length > 100);

  for (const para of paragraphs) {
    if (lore.includes(para)) {
      issues.push(
        `Lore contains duplicated prose paragraph from content: "${para.slice(0, 60)}..."`,
      );
    }
  }
}

export function auditTomeConsistency(
  output: PublicGeneratorOutput,
  _resolved?: ResolvedTome,
): TomeConsistencyAuditResult {
  const issues: string[] = [];
  const content = output.content;
  const lore = output.lore ?? "";

  checkRequiredSections(content, lore, issues);
  checkGroundTruthElements(lore, issues);
  checkUnitContradictions(`${content}\n${lore}`.toLowerCase(), issues);
  checkParagraphRedundancy(content, lore, issues);

  return {
    valid: issues.length === 0,
    issues,
  };
}
