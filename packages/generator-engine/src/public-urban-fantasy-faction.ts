import { withPublicCreativeCue } from "./public-creative-diversity";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { asRecord, asString, parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";
import {
  resolveSmart,
  type LockedValue,
  type SmartGeneratorSchema,
} from "./smart";

export const urbanFantasyFactionConfig = {
  modes: [
    "Hidden-world city politics",
    "Occult crime",
    "Monster diplomacy",
    "Magical bureaucracy",
    "Street-level magic",
    "Paranormal investigation",
    "Corporate occult",
  ],
  types: [
    "Mage Cabal",
    "Monster Court",
    "Paranormal Agency",
    "Occult Gang",
    "Hunter Lodge",
    "Fae Market",
    "Supernatural Corporation",
    "Secret Council",
  ],
  scopes: [
    "Neighbourhood",
    "City District",
    "Whole City",
    "Transit Network",
    "University",
    "Corporate Campus",
    "Hidden Market",
    "Regional Network",
  ],
  moralPostures: [
    "Protective but secretive",
    "Predatory but lawful",
    "Pragmatic brokers",
    "Idealistic investigators",
    "Ancient aristocrats",
    "Street-level survivors",
  ],
  goals: [
    "Keep a threatened block of affordable homes from being cleared after its residents discover the ward beneath it.",
    "Secure quiet access to the transit control records before a missing-person pattern becomes public.",
    "Win formal recognition for supernatural residents without exposing the people who depend on anonymity.",
    "Take control of a redevelopment project that would uncover a buried crossing used by several hidden communities.",
    "Stop a chain of counterfeit charms from putting ordinary residents in danger while keeping the source inside the faction.",
    "Make the city honour an old agreement before a new agency replaces it with rules no one can safely follow.",
  ],
  conflicts: [
    "A junior investigator has found evidence that the faction's public safety reports were altered to protect a powerful ally.",
    "The night-shift workers who keep the faction informed are organising for fair pay and threatening to walk out together.",
    "Two neighbourhood representatives disagree over whether a dangerous newcomer should be sheltered or reported.",
    "A promised transit route is closing for construction, cutting off the faction's safest connection to its allies.",
    "The faction's legal adviser wants to disclose one supernatural incident to secure protection for everyone else.",
    "A rival has offered the faction's youngest members a safer deal, but the contract transfers control of a shared resource.",
  ],
  hooks: [
    "A routine building inspection finds a sealed room that appears on no city plan, and both the faction and its rival arrive before dawn.",
    "A commuter leaves the same impossible voicemail at three different stations; the faction asks the party to find who is listening.",
    "A neighbourhood clinic has lost power every night for a week, and its patients know the outage follows a pattern.",
    "A city records clerk offers proof that a supernatural eviction is already approved, but refuses to say who signed it.",
    "A missing street vendor is due to testify at a hidden-world council meeting, and the faction needs the party to find them first.",
    "A corporate security team has confiscated a charm that keeps a whole apartment building's residents safe from a nearby crossing.",
  ],
  bases: [
    "the locked mezzanine of a municipal records office",
    "an unlisted platform beneath the central rail interchange",
    "a neighbourhood clinic's overnight reception and sealed records room",
    "a union hall above a late-night laundrette",
    "the basement archive of a city university",
    "the service floor of a mixed-use corporate tower",
    "a market that appears in loading bays after the last bus",
    "an emergency-management office with one blank map drawer",
  ],
  resources: [
    "inspection schedules and building-access records that reveal when a ward has been disturbed",
    "a trusted network of night-shift drivers, porters and dispatchers",
    "the only reliable route through a transit interchange after midnight",
    "legal aid and temporary housing for people forced to leave a hidden community",
    "a private archive of incident reports that never made it into the public record",
    "the permits and contractors needed to keep a supernatural site out of a redevelopment plan",
    "a supply of carefully verified charms traded through ordinary corner shops",
    "the right to call a meeting between communities that refuse to share a room",
  ],
  symbols: [
    "a brass key stamped with a district code no longer used by the city",
    "two parallel white lines drawn on a service door",
    "a blue enamel transit token with a hole punched through its centre",
    "a paper lantern mark hidden on official maintenance notices",
    "a hand-drawn map grid with one block left deliberately blank",
    "a small green thread tied around an employee badge",
  ],
  npcNames: [
    "Mara Venn",
    "Theo Barrow",
    "Imani Calder",
    "Kiran Vale",
    "Nell Mercer",
    "Rafi Okafor",
    "June Park",
    "Sasha Bell",
    "Ari Navarro",
    "Dev Malik",
  ],
  npcRoles: [
    "a municipal planner who can read the city by the gaps in its records",
    "a night dispatcher who knows which calls are being quietly rerouted",
    "a community organiser who insists hidden residents still need public services",
    "an investigator who keeps a second notebook for evidence the agency will not log",
    "a facilities manager who can get anyone into a building once, for a price",
    "a mediator who remembers every promise made at the last district meeting",
  ],
} as const;

export interface UrbanFantasyFactionGeneratorOptions {
  mode?: string;
  factionType?: string;
  scope?: string;
  moralPosture?: string;
  campaignContext?: string;
}

export interface ResolvedUrbanFantasyFaction {
  mode: string;
  factionType: string;
  scope: string;
  moralPosture: string;
  goal: string;
  conflict: string;
  hook: string;
  campaignContext?: string;
  name: string;
}

export const urbanFantasyFactionSchema: SmartGeneratorSchema = {
  id: "urban-fantasy-faction",
  axes: [
    {
      id: "mode",
      label: "Urban Fantasy Mode",
      pool: () => urbanFantasyFactionConfig.modes,
    },
    {
      id: "factionType",
      label: "Faction Type",
      pool: () => urbanFantasyFactionConfig.types,
    },
    {
      id: "scope",
      label: "Operating Scope",
      pool: () => urbanFantasyFactionConfig.scopes,
    },
    {
      id: "moralPosture",
      label: "Moral Posture",
      pool: () => urbanFantasyFactionConfig.moralPostures,
    },
    {
      id: "goal",
      label: "Primary Goal",
      pool: () => urbanFantasyFactionConfig.goals,
    },
    {
      id: "conflict",
      label: "Internal Conflict",
      pool: () => urbanFantasyFactionConfig.conflicts,
    },
    {
      id: "hook",
      label: "Immediate Hook",
      pool: () => urbanFantasyFactionConfig.hooks,
    },
  ],
};

const URBAN_FANTASY_LABELS = [
  "urban-fantasy",
  "modern-fantasy",
  "supernatural-faction",
  "hidden-world",
] as const;

const FACTION_NAMES = [
  "The Night Registry",
  "Ninth Platform Assembly",
  "Borough Lantern Office",
  "The Afterhours Union",
  "Civic Threshold Commission",
  "Lumen Street Accord",
  "The Unlisted Department",
  "Blue Route Compact",
  "The Open Door Committee",
  "Northside Mutual",
  "The Crossing Desk",
  "Midcity Lantern Council",
] as const;

function stripUntrustedMediaMarkup(text: string): string {
  return text
    .replace(/!\[([^\]]*)\](?:\([^)]*\)|\[[^\]]*\])?/g, "$1")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<style\b[^>]*\/?>/gi, "")
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /<\/?(?:img|image|picture|video|audio|source|track|iframe|embed|object|link)\b[^>]*>/gi,
      "",
    );
}

function sanitizeCustomOption(value: string | undefined): string | undefined {
  const sanitized = stripUntrustedMediaMarkup(value?.trim() ?? "").trim();
  return sanitized || undefined;
}

function generateFactionName(rng: Rng): string {
  return pickFrom(FACTION_NAMES, rng);
}

export function resolveUrbanFantasyFaction(
  options: UrbanFantasyFactionGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedUrbanFantasyFaction {
  const locked: Record<string, LockedValue> = {};
  const mode = sanitizeCustomOption(options.mode);
  const factionType = sanitizeCustomOption(options.factionType);
  const scope = sanitizeCustomOption(options.scope);
  const moralPosture = sanitizeCustomOption(options.moralPosture);
  if (mode) locked.mode = { value: mode, source: "manual" };
  if (factionType)
    locked.factionType = { value: factionType, source: "manual" };
  if (scope) locked.scope = { value: scope, source: "manual" };
  if (moralPosture)
    locked.moralPosture = { value: moralPosture, source: "manual" };

  const { values } = resolveSmart(urbanFantasyFactionSchema, { locked }, rng);
  return {
    mode: values.mode,
    factionType: values.factionType,
    scope: values.scope,
    moralPosture: values.moralPosture,
    goal: values.goal,
    conflict: values.conflict,
    hook: values.hook,
    campaignContext:
      stripUntrustedMediaMarkup(options.campaignContext?.trim() ?? "").trim() ||
      undefined,
    name: generateFactionName(rng),
  };
}

export interface UrbanFantasyFactionPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedUrbanFantasyFaction;
}

export function buildUrbanFantasyFactionPrompt(
  options: UrbanFantasyFactionGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): UrbanFantasyFactionPrompt {
  const resolved = resolveUrbanFantasyFaction(options, rng);
  const { mode, factionType, scope, moralPosture, campaignContext } = resolved;
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const systemInstruction = `You are an expert, system-agnostic RPG campaign writer specialising in urban fantasy: supernatural communities, hidden-world politics, occult crime, street-level magic, investigation, diplomacy and modern institutions. Create original city factions that are grounded in present-day civic life, not default vampire or horror tropes. Return only a valid JSON object with this shape:
{
  "title": "Faction name",
  "summary": "One concise sentence describing the faction and its pressure on the city.",
  "content": "Markdown with exactly these section headers: ### Genre labels, ### What they control, ### What they want, ### Why they are dangerous, ### How to use them at the table.",
  "lore": "Markdown with exactly these sections: ### At a Glance with - **📍 Base**:, - **Resource**:, - **Symbol**:, - **Secret**:, - **Immediate Hook**:; ### Notable NPCs with 2-3 - **👤 Name**: one-line description bullets; ### Internal Conflict with one paragraph; ### Rival Faction with - **👥 Name**: one-line rivalry.",
  "labels": ["urban-fantasy", "modern-fantasy", "supernatural-faction", "hidden-world", "faction-generator", "rpg-faction", "imported-draft"]
}

QUALITY RULES:
- Use modern city systems such as transit, housing, records, emergency services, universities, labour, neighbourhood businesses or corporate facilities as real sources of power.
- Make the selected faction type, mode, scope and moral posture shape the result. Include a playable pressure or choice, not just atmosphere.
- Support street-level, investigative, diplomatic, criminal and corporate conflicts across different generations. Do not default to vampires, feeding, gothic courts or horror.
- Give every section a substantive body, all five cheat-sheet fields a value, two or three named NPC bullets, and one named rival faction.
- Use clear, neutral language. Do not name or imply official affiliation with a third-party game or setting.
- Every generation should feel distinct. Avoid generic shadow councils, iron orders and gilded ledgers.
- ${NAME_BAN_PROMPT}
${sessionContext}
- Before finalising, silently check that every requested section and cheat-sheet field is present and that the faction belongs in a modern city.`;

  const userMessage = `Generate an urban-fantasy city faction. Variation seed: ${varianceSeed}.
- Urban Fantasy Mode: ${mode}
- Faction Type: ${factionType}
- Operating Scope: ${scope}
- Moral Posture: ${moralPosture}${formatCampaignContextBlock(campaignContext)}
- Faction Name: ${resolved.name}`;

  return {
    systemInstruction,
    userMessage: withPublicCreativeCue(userMessage, "organisation", rng),
    resolved,
  };
}

const REQUIRED_CONTENT_SECTIONS = [
  "### Genre labels",
  "### What they control",
  "### What they want",
  "### Why they are dangerous",
  "### How to use them at the table",
] as const;

const REQUIRED_LORE_SECTIONS = [
  "### At a Glance",
  "### Notable NPCs",
  "### Internal Conflict",
  "### Rival Faction",
] as const;

const REQUIRED_CHEAT_SHEET_FIELDS = [
  "**📍 Base**:",
  "**Resource**:",
  "**Symbol**:",
  "**Secret**:",
  "**Immediate Hook**:",
] as const;

function sectionBodies(
  markdown: string,
  requiredSections: readonly string[],
): Map<string, string[]> {
  const bodies = new Map<string, string[]>();
  const headings = [...markdown.matchAll(/^### .+$/gm)];

  for (const [index, match] of headings.entries()) {
    const heading = match[0].trim();
    if (!requiredSections.includes(heading)) continue;
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;
    const existing = bodies.get(heading) ?? [];
    existing.push(markdown.slice(bodyStart, bodyEnd).trim());
    bodies.set(heading, existing);
  }

  return bodies;
}

function missingSectionBodies(
  bodies: ReadonlyMap<string, readonly string[]>,
  requiredSections: readonly string[],
): string[] {
  return requiredSections.filter((heading) => {
    const matches = bodies.get(heading);
    return matches?.length !== 1 || !matches[0]?.trim();
  });
}

function hasCheatSheetValue(
  section: string | undefined,
  field: string,
): boolean {
  if (!section) return false;
  const prefix = `- ${field}`;
  return section.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith(prefix) && !!trimmed.slice(prefix.length).trim();
  });
}

export function parseUrbanFantasyFactionResponse(
  text: string,
  resolved: ResolvedUrbanFantasyFaction,
): PublicGeneratorOutput {
  const data = asRecord(parseFencedJson<unknown>(text));
  const title =
    stripUntrustedMediaMarkup(asString(data.title)).trim() || resolved.name;
  const summary = stripUntrustedMediaMarkup(asString(data.summary))
    .trim()
    .replace(/\s+/g, " ");
  const content = stripUntrustedMediaMarkup(asString(data.content));
  const lore = stripUntrustedMediaMarkup(asString(data.lore));
  const contentBodies = sectionBodies(content, REQUIRED_CONTENT_SECTIONS);
  const loreBodies = sectionBodies(lore, REQUIRED_LORE_SECTIONS);
  const glance = loreBodies.get("### At a Glance")?.[0];
  const notableNpcs = loreBodies.get("### Notable NPCs")?.[0] ?? "";
  const rivalFaction = loreBodies.get("### Rival Faction")?.[0] ?? "";
  const missing = [
    ...missingSectionBodies(contentBodies, REQUIRED_CONTENT_SECTIONS),
    ...missingSectionBodies(loreBodies, REQUIRED_LORE_SECTIONS),
    ...REQUIRED_CHEAT_SHEET_FIELDS.filter(
      (field) => !hasCheatSheetValue(glance, field),
    ),
  ];
  const npcBullets = notableNpcs
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\*\*👤\s+[^*]+\*\*:\s*\S/.test(line));
  if (npcBullets.length < 2 || npcBullets.length > 3) {
    missing.push("2-3 named Notable NPC bullets");
  }
  const hasNamedRival = rivalFaction
    .split(/\r?\n/)
    .some((line) => /^\s*-\s+\*\*👥\s+[^*]+\*\*:\s*\S/.test(line));
  if (!hasNamedRival) missing.push("named Rival Faction");
  if (!summary) missing.unshift("summary");
  if (missing.length > 0) {
    throw new Error(
      `Urban fantasy faction response is missing required content: ${missing.join(", ")}`,
    );
  }

  const modelLabels = Array.isArray(data.labels)
    ? data.labels
        .filter((label): label is string => typeof label === "string")
        .map(stripUntrustedMediaMarkup)
        .filter((label) => label.trim().length > 0)
    : [];
  return {
    type: "faction",
    title,
    summary,
    content,
    lore,
    labels: [
      ...new Set([
        ...modelLabels,
        ...URBAN_FANTASY_LABELS,
        "faction-generator",
        "rpg-faction",
        "imported-draft",
      ]),
    ],
    status: "active",
  };
}

export function generateUrbanFantasyFactionLocal(
  options: UrbanFantasyFactionGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveUrbanFantasyFaction(options, rng);
  const rival = pickFrom(
    FACTION_NAMES.filter((name) => name !== resolved.name),
    rng,
  );
  const npcNames = [...urbanFantasyFactionConfig.npcNames];
  const firstNpc = pickFrom(npcNames, rng);
  const remainingNpcNames = npcNames.filter((name) => name !== firstNpc);
  const secondNpc = pickFrom(remainingNpcNames, rng);
  const firstRole = pickFrom(urbanFantasyFactionConfig.npcRoles, rng);
  const secondRole = pickFrom(urbanFantasyFactionConfig.npcRoles, rng);
  const base = pickFrom(urbanFantasyFactionConfig.bases, rng);
  const resource = pickFrom(urbanFantasyFactionConfig.resources, rng);
  const symbol = pickFrom(urbanFantasyFactionConfig.symbols, rng);
  const summary = `${resolved.name} is a ${resolved.factionType.toLowerCase()} operating through ${resolved.mode.toLowerCase()} and holding influence across the ${resolved.scope.toLowerCase()}.`;
  const campaignContext = resolved.campaignContext
    ? ` The faction's choices are shaped by ${resolved.campaignContext}.`
    : "";

  const content = `### Genre labels
Urban fantasy · modern fantasy · supernatural faction · hidden-world politics

### What they control
${resolved.name} is a ${resolved.factionType.toLowerCase()} with a foothold in ${base}. Across the ${resolved.scope.toLowerCase()}, they control ${resource}. Their public-facing work makes them legible to city employees and residents while their supernatural role stays out of ordinary records.${campaignContext}

### What they want
${resolved.goal}

### Why they are dangerous
Their posture is ${resolved.moralPosture.toLowerCase()}, and the current strain is simple to name: ${resolved.conflict} They can turn routine access, permits, schedules or trusted relationships into leverage before anyone realises a hidden-world dispute has reached the whole city.

### How to use them at the table
Bring ${resolved.name} in when a civic problem has a supernatural cause or when a hidden community needs something from the party. Let the players investigate the records, negotiate between groups, disrupt an illicit exchange or decide who should control a public resource; the faction can be an ally, obstacle or employer without becoming the only source of danger.`;

  const lore = `### At a Glance
- **📍 Base**: ${base}
- **Resource**: ${resource}
- **Symbol**: ${symbol}
- **Secret**: ${resolved.conflict}
- **Immediate Hook**: ${resolved.hook}

### Notable NPCs
- **👤 ${firstNpc}**: ${firstRole}.
- **👤 ${secondNpc}**: ${secondRole}.

### Internal Conflict
${resolved.conflict} The faction's leaders disagree on whether its ${resolved.moralPosture.toLowerCase()} instincts still protect the people it claims to serve.

### Rival Faction
- **👥 ${rival}**: Competes for influence over the ${resolved.scope.toLowerCase()} and is offering residents a more open deal, though it expects control of the resource in return.`;

  return {
    type: "faction",
    title: resolved.name,
    summary,
    content,
    lore,
    labels: [
      ...URBAN_FANTASY_LABELS,
      "faction-generator",
      "rpg-faction",
      "imported-draft",
    ],
    status: "active",
  };
}
