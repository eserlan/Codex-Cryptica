import { withPublicCreativeCue } from "./public-creative-diversity";
/**
 * Public Faction Roster generator — framework-free port following the
 * `public-faction.ts` / `public-pantheon.ts` shape (#2808).
 *
 * A roster turns a faction from an organisation-level concept into people the
 * party can meet, recruit, threaten, investigate, betray, or negotiate with.
 * It is deliberately a *separate* generator from the faction generator
 * itself (mirroring the Quest → Plot Twist follow-on pattern) rather than a
 * mode of it, and it is driven by a `factionContext` blob handed over from a
 * completed faction generation (or pasted in directly).
 *
 * The model returns structured `members[]` (one entry per notable member,
 * each carrying a `connection` naming another member on the same roster) so
 * the roster reads as a small social network rather than isolated NPC cards.
 * `content` is then rendered deterministically from that array — one `###`
 * section per member — rather than trusting the model to format headings
 * consistently, since the per-member "Open as Character" handoff depends on
 * that heading being exact.
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client,
 * no sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseFactionRosterResponse, and falls back to
 * generateFactionRosterLocal on failure. Session context is injected as a
 * string.
 */

import type { PublicGeneratorOutput } from "./public-generator-types";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
} from "./random-utils";
import {
  parseFencedJson,
  asString as str,
  asRecord as rec,
  asArray as arr,
} from "./llm-response-utils";
import {
  formatCampaignContextBlock,
  extractProperNouns,
  avoidNamesExcludingContext,
} from "./campaign-context";
import { factionConfig, FACTION_THEME_VOICE } from "./public-faction-constants";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";

export const factionRosterConfig = {
  // Strings, matching councilVoteConfig.sizes — form selects bind to string
  // values, and the numeric value is only needed once resolved.
  sizes: ["3", "4", "5", "6"],
  structures: [
    "Hierarchy",
    "Cell network",
    "Council",
    "Warband",
    "Corporate ladder",
    "Congregation",
  ],
  emphases: ["Internal dissent", "Public face", "Field operators", "New blood"],
};

export interface FactionRosterMember {
  name: string;
  role: string;
  duty: string;
  motive: string;
  stance: string;
  trait: string;
  wantNow: string;
  leverage: string;
  connection?: { member: string; nature: string };
}

export interface FactionRosterGeneratorOptions {
  factionContext?: string;
  size?: string;
  structure?: string;
  emphasis?: string;
  theme?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

export interface ResolvedFactionRoster {
  factionContext?: string;
  size: number;
  structure: string;
  emphasis: string;
  theme: string;
  campaignContext?: string;
  avoidNames: string[];
}

export function resolveFactionRoster(
  options: FactionRosterGeneratorOptions,
  rng: Rng,
): ResolvedFactionRoster {
  const theme = options.theme || factionConfig.themes[0];
  const size = factionRosterConfig.sizes.includes(options.size ?? "")
    ? Number(options.size)
    : Number(pickFrom(factionRosterConfig.sizes, rng));

  return {
    factionContext: options.factionContext?.trim() || undefined,
    size,
    structure:
      options.structure || pickFrom(factionRosterConfig.structures, rng),
    emphasis: options.emphasis || pickFrom(factionRosterConfig.emphases, rng),
    theme,
    campaignContext: options.campaignContext?.trim() || undefined,
    avoidNames: options.avoidNames ?? [],
  };
}

/** One person the faction generator already named, extracted from its output. */
export interface FactionNotableNpc {
  name: string;
  description: string;
}

/**
 * Every faction sub-generator (public-faction.ts and its variants) renders
 * its named people as "- **👤 Name**: description" under a "### Notable
 * NPCs"/"### Notable Members" heading — the 👤 marker is used only for an
 * actual person (a rival *faction* uses 👥 instead), so matching on it
 * directly is more precise than the generic `extractProperNouns` (which
 * would also pick up the faction's own name, its rival's name, and genre
 * labels). Exported so the local fallback and the AI prompt can share one
 * extraction instead of drifting.
 */
export function extractFactionNotableNpcs(
  factionContext?: string,
): FactionNotableNpc[] {
  if (!factionContext) return [];
  const pattern = /^-\s*\*\*👤\s*([^*]+?)\*\*:\s*(.+)$/gm;
  const results: FactionNotableNpc[] = [];
  for (const match of factionContext.matchAll(pattern)) {
    const name = match[1].trim();
    const description = match[2].trim();
    if (name && description) results.push({ name, description });
  }
  return results;
}

/**
 * The faction being rostered, as a binding block distinct from the generic
 * "campaign context" block — mirrors `formatDelveContextBlock` in
 * `public-npc.ts`. The faction's already-named people (its Notable NPCs) are
 * pinned as a hard requirement, not a suggestion — the whole point of a
 * roster is the people already tied to this specific faction, so the two
 * most obvious candidates must not be silently dropped or duplicated under a
 * different name.
 */
function formatFactionContextBlock(
  factionContext: string | undefined,
  notableNpcs: FactionNotableNpc[],
): string {
  const trimmed = factionContext?.trim();
  if (!trimmed) return "";
  return [
    ``,
    ``,
    `[Source Faction — the roster must inherit its ideology, goals, methods, culture, resources, and internal tensions]`,
    trimmed,
    ``,
    `Every member must fit this specific faction, not a generic organisation of the same type.`,
    ...(notableNpcs.length > 0
      ? [
          `This faction already has named people on record: ${notableNpcs.map((n) => n.name).join(", ")}. Every one of them MUST appear as a member of this roster, using their exact name and their existing description (given above) as the starting point for that member's duty and role — never invent a duplicate or a renamed stand-in, and never omit one. Fill any remaining roster slots beyond these with new members.`,
        ]
      : []),
    ``,
  ].join("\n");
}

export interface FactionRosterPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedFactionRoster;
}

export function buildFactionRosterPrompt(
  options: FactionRosterGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): FactionRosterPrompt {
  const resolved = resolveFactionRoster(options, rng);
  const { size, structure, emphasis, theme, campaignContext } = resolved;
  const voice = FACTION_THEME_VOICE[theme] ?? "tabletop RPG";
  const notableNpcs = extractFactionNotableNpcs(resolved.factionContext);
  // The campaign-context block above already tells the model that names
  // introduced by the handed-over faction are established and must be kept —
  // listing those same names under "do not use" would contradict it.
  const extraAvoidedNames = avoidNamesExcludingContext(
    resolved.avoidNames,
    resolved.factionContext,
  )
    .map((name) => name.trim())
    .filter(Boolean);
  const nameRestrictions = extraAvoidedNames.length
    ? ` Also do not use these already-used names: ${extraAvoidedNames.join(", ")}.`
    : "";
  const notableNpcRule =
    notableNpcs.length > 0
      ? `\n- This faction's already-named people (${notableNpcs.map((n) => n.name).join(", ")}) must each appear in "members" under their exact name.`
      : "";
  const notableNpcConsistencyClause =
    notableNpcs.length > 0
      ? ` confirm every already-named person from the source faction (${notableNpcs.map((n) => n.name).join(", ")}) appears in "members" under their exact name;`
      : "";

  const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You turn factions into the specific people who make them up, in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "A short title for this roster, naming the faction (e.g. 'The Compact's Inner Circle').",
  "summary": "One sentence describing what kind of group this roster reveals about the faction.",
  "members": [
    {
      "name": "Member name, fitting the ${theme} setting",
      "role": "Their role or position in the faction",
      "duty": "What they actually do for the faction day to day",
      "motive": "Their PERSONAL motive for being part of this faction — must not simply restate the faction's own goal",
      "stance": "Their relationship to the faction: loyalist, zealot, opportunist, trapped, reformer, secret traitor, or similar",
      "trait": "One distinctive, playable trait",
      "wantNow": "What they want right now, in this specific moment — an immediate hook",
      "leverage": "A leverage point or vulnerability someone could use against them",
      "connection": { "member": "The exact name of another member in this same members array", "nature": "How the two are connected" }
    }
  ],
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Structure**: ${structure}\\n- **Emphasis**: ${emphasis}\\n- **Immediate Hook**: one sentence tying the roster's internal tension to something the party can walk into\\n### How This Roster Divides\\none paragraph on the fault line running through the group",
  "labels": ["2-5 lowercase tags for the roster, plus 'rpg-faction', 'faction-roster', 'faction-roster-generator', 'imported-draft'"]
}

STRUCTURE: this faction organises as a ${structure.toLowerCase()}. Do not default every roster to a leader-plus-generic-underlings hierarchy — a cell network, council, warband, corporate ladder, or congregation each produce a genuinely different shape of "notable members".

EMPHASIS: bias the roster toward ${emphasis.toLowerCase()}.

QUALITY RULES:
- Generate exactly ${size} members.
- Give the roster useful internal disagreement: at least two members must hold conflicting priorities, loyalties, or opinions about the faction's direction.
- No member's "motive" may simply restate the faction's own stated goal — it must be personal.
- Every member needs a genuine immediate hook in "wantNow" — something a GM can use the moment the party meets them, not a vague ambition.
- Avoid generic RPG naming clichés.
- ${NAME_BAN_PROMPT}${nameRestrictions}${notableNpcRule}
${sessionContext}
- Before finalising, run a consistency pass: every "connection.member" value names another member actually present in this same "members" array (never the faction itself, never a member's own name, never someone outside the array); at least two members' priorities genuinely conflict; no member's motive duplicates the faction's own goal; every role and duty fits a ${structure.toLowerCase()}, not a generic hierarchy; every name fits ${theme};${notableNpcConsistencyClause} Fix any mismatch before responding.`;

  const userMessage = `Generate a faction roster of ${size} notable members.
- Theme/Genre: ${theme}
- Structure: ${structure}
- Emphasis: ${emphasis}${formatFactionContextBlock(resolved.factionContext, notableNpcs)}${formatCampaignContextBlock(campaignContext)}`;

  return {
    systemInstruction,
    userMessage: withPublicCreativeCue(userMessage, "character", rng),
    resolved,
  };
}

function formatMemberSection(member: FactionRosterMember): string {
  const connectionLine = member.connection
    ? `\n- **Connection**: ${member.connection.nature} (${member.connection.member})`
    : "";
  return `### ${member.name} — ${member.role}
- **Duty**: ${member.duty}
- **Motive**: ${member.motive}
- **Stance**: ${member.stance}
- **Trait**: ${member.trait}
- **Wants right now**: ${member.wantNow}
- **Leverage**: ${member.leverage}${connectionLine}`;
}

export function parseFactionRosterResponse(
  text: string,
  resolved: ResolvedFactionRoster,
): PublicGeneratorOutput {
  const data = rec(parseFencedJson(text));

  const rawMembers = arr(data.members)
    .map((m) => rec(m))
    .filter((m) => str(m.name).trim())
    .slice(0, resolved.size);
  const validNames = new Set(
    rawMembers.map((m) => str(m.name).trim().toLowerCase()),
  );

  const members: FactionRosterMember[] = rawMembers.map((m) => {
    const name = str(m.name).trim();
    const connectionRaw = rec(m.connection);
    const connectionMember = str(connectionRaw.member).trim();
    const connection =
      connectionMember &&
      connectionMember.toLowerCase() !== name.toLowerCase() &&
      validNames.has(connectionMember.toLowerCase())
        ? { member: connectionMember, nature: str(connectionRaw.nature) }
        : undefined;
    return {
      name,
      role: str(m.role),
      duty: str(m.duty),
      motive: str(m.motive),
      stance: str(m.stance),
      trait: str(m.trait),
      wantNow: str(m.wantNow),
      leverage: str(m.leverage),
      connection,
    };
  });

  const content = members.map(formatMemberSection).join("\n\n");

  return {
    // A roster is a document *about* several people tied to a faction, not
    // the faction itself or a single character — "note" matches the in-app
    // registry's GENERATOR_ENTITY_TYPE["faction-roster"] mapping, so a
    // roster imports as the same vault entity type on both surfaces.
    type: "note",
    title: str(data.title) || "Notable Members",
    summary: str(data.summary),
    content,
    lore: str(data.lore),
    labels: Array.isArray(data.labels)
      ? (data.labels as string[])
      : [
          "rpg-faction",
          "faction-roster",
          "faction-roster-generator",
          "imported-draft",
        ],
    status: "active",
  };
}

interface RosterArchetype {
  role: string;
  /** The role with its article, for the "Handles what … handles" duty line. */
  roleWithArticle: string;
  stance: string;
  trait: string;
  leverage: string;
  /** Roster emphases this archetype is drawn for first. */
  emphases: readonly string[];
  motive: (faction: string) => string;
  wantNow: string;
}

const ROSTER_ARCHETYPES: readonly RosterArchetype[] = [
  {
    role: "Authority figure",
    roleWithArticle: "an authority figure",
    stance: "Loyalist",
    trait: "Speaks softly and expects to be obeyed anyway.",
    leverage:
      "Everyone assumes their word is final; it hasn't been tested in years.",
    emphases: ["Public face"],
    motive: (faction) =>
      `Wants to keep the public voice of ${faction} theirs, even after the real decisions have moved elsewhere.`,
    wantNow: "Needs the next meeting to end with their decision on the record.",
  },
  {
    role: "True believer",
    roleWithArticle: "a true believer",
    stance: "Zealot",
    trait: "Quotes the founding cause word for word, unprompted.",
    leverage:
      "Would do something reckless if the cause were ever publicly doubted.",
    emphases: ["Public face"],
    motive: (faction) =>
      `Wants ${faction} to be seen living out its founding cause, whatever that costs the people who joined for it.`,
    wantNow:
      "Needs proof that the founding cause still matters before someone else publicly doubts it.",
  },
  {
    role: "Practical operator",
    roleWithArticle: "a practical operator",
    stance: "Opportunist",
    trait:
      "Solves problems nobody else wants solved, and remembers who owes them.",
    leverage:
      "Keeps a private ledger of favours that could ruin several other members.",
    emphases: ["Field operators"],
    motive: (faction) =>
      `Wants a larger share of what ${faction} earns in the field than the leadership is willing to pay.`,
    wantNow:
      "Needs a supply run or contract signed before a rival offers better terms.",
  },
  {
    role: "Conflicted member",
    roleWithArticle: "a conflicted member",
    stance: "Reformer",
    trait: "Agrees out loud and hesitates in private.",
    leverage: "One more compromise from walking away, and everyone can tell.",
    emphases: ["Internal dissent", "New blood"],
    motive: (faction) =>
      `Wants ${faction} to change its methods quietly, so nobody has to admit the old ones failed.`,
    wantNow:
      "Needs one vote to pass before their doubts become visible to the rest of the membership.",
  },
  {
    role: "Recent recruit",
    roleWithArticle: "a recent recruit",
    stance: "Trapped",
    trait: "Still learning the unwritten rules, and getting them wrong.",
    leverage: "Owes a debt that got them in the door and isn't repaid yet.",
    emphases: ["New blood", "Field operators"],
    motive: (faction) =>
      `Wants out of ${faction} with their debt cleared and their name kept out of its records.`,
    wantNow:
      "Needs to learn who really gives the orders before they make a mistake in front of them.",
  },
  {
    role: "Internal problem",
    roleWithArticle: "an internal problem",
    stance: "Secret traitor",
    trait: "The most reliable person in the room, which is the problem.",
    leverage:
      "Has already made contact with someone the faction would call an enemy.",
    emphases: ["Internal dissent"],
    motive: (faction) =>
      `Wants ${faction} to lose its next fight, on terms the enemy has already agreed to.`,
    wantNow:
      "Needs to get a message to their contact before the next meeting asks where they have been.",
  },
];

/**
 * Best-effort faction name from a handed-over `factionContext` blob, so the
 * local (no-AI) fallback still reflects which faction was rostered rather
 * than reading as generic filler — matching how `generatePlotTwistLocal`
 * incorporates a handed-over premise even offline. Prefers the exact
 * "Faction: X" line `buildFactionRosterContext` produces, and falls back to
 * the first proper noun for context pasted in free-form.
 */
function extractFactionName(factionContext?: string): string | undefined {
  if (!factionContext?.trim()) return undefined;
  const labeled = factionContext.match(/^Faction:\s*(.+)$/m);
  if (labeled?.[1]?.trim()) return labeled[1].trim();
  return extractProperNouns(factionContext)[0];
}

/**
 * Name pool for the fresh members, keyed by the vibe, so a Cyberpunk roster
 * reads as Nyx and Jax rather than fantasy names. Tries the exact vibe, then
 * the part before " / ", then the first word, then falls back to Fantasy.
 */
function rosterNamePool(theme: string): readonly string[] {
  const candidates = [
    theme,
    theme.replace(/^Classic /, ""),
    theme.replace(/ \/ .*/, ""),
    theme.split(" ")[0],
  ];
  for (const key of candidates) {
    const pool = INHABITANT_NAMES_BY_GENRE[key];
    if (pool) return pool;
  }
  return INHABITANT_NAMES_BY_GENRE.Fantasy;
}

/**
 * Roster emphasis decides which archetypes come first, so the roster really
 * leans that way and not only the summary. Matching archetypes are drawn
 * first and any remaining slots are filled from the rest. A custom emphasis
 * matches nothing and gives an unweighted roster.
 */
function pickRosterArchetypes(
  emphasis: string,
  size: number,
  rng: Rng,
): RosterArchetype[] {
  const emphasised = ROSTER_ARCHETYPES.filter((a) =>
    a.emphases.includes(emphasis),
  );
  const others = ROSTER_ARCHETYPES.filter(
    (a) => !a.emphases.includes(emphasis),
  );
  const fromEmphasis = pickRandomItems(
    emphasised,
    Math.min(emphasised.length, size),
    rng,
  );
  return [
    ...fromEmphasis,
    ...pickRandomItems(others, size - fromEmphasis.length, rng),
  ];
}

export function generateFactionRosterLocal(
  options: FactionRosterGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveFactionRoster(options, rng);
  const { size, structure, emphasis, theme, campaignContext } = resolved;
  const factionName = extractFactionName(resolved.factionContext);
  const factionLabel = factionName ?? "the faction";

  // Promote the faction's own already-named people onto the roster first —
  // they're exactly who a roster should surface — before filling any
  // remaining slots with fresh members named from the vibe's pool.
  const notableNpcs = extractFactionNotableNpcs(resolved.factionContext).slice(
    0,
    size,
  );
  const takenNames = new Set(
    notableNpcs.map((npc) => npc.name.trim().toLowerCase()),
  );
  const freshPool = rosterNamePool(theme).filter(
    (name) => !takenNames.has(name.trim().toLowerCase()),
  );
  const names = [
    ...notableNpcs.map((npc) => npc.name),
    ...pickRandomItems(freshPool, size - notableNpcs.length, rng),
  ];
  const archetypes = pickRosterArchetypes(emphasis, size, rng);
  const structureLabel = structure.toLowerCase();

  const members: FactionRosterMember[] = archetypes.map((archetype, i) => {
    // Each member connects to the next in the shuffled order (circular), so
    // every member has exactly one outward connection into the roster.
    const nextIndex = (i + 1) % size;
    const notable = notableNpcs[i];
    return {
      name: names[i],
      role: archetype.role,
      duty:
        notable?.description ??
        `Handles what ${archetype.roleWithArticle} handles for ${factionLabel}, organised as a ${structureLabel}. Nobody minutes this work.`,
      motive: archetype.motive(factionLabel),
      stance: archetype.stance,
      trait: archetype.trait,
      wantNow: archetype.wantNow,
      leverage: archetype.leverage,
      connection: {
        member: names[nextIndex],
        nature: "works closely with, and doesn't fully trust",
      },
    };
  });

  const content = members.map(formatMemberSection).join("\n\n");
  const summary = `${size} notable members of ${factionLabel}, organised as a ${structureLabel} and weighted toward ${emphasis.toLowerCase()}.`;
  const campaignSection = campaignContext
    ? `\n\n### Campaign Context\n${campaignContext}`
    : "";

  const lore = `### At a Glance
- **Structure**: ${structure}
- **Emphasis**: ${emphasis}
- **Immediate Hook**: The roster's internal tension is one bad decision from spilling into the open.

### How This Roster Divides
Loyalty to ${factionLabel} is not the same as loyalty to each other, and the ${emphasis.toLowerCase()} in this group means the fault line runs through people who each think they are the reasonable one.${campaignSection}`;

  return {
    type: "note",
    title: factionName ? `${factionName}'s Notable Members` : "Notable Members",
    summary,
    content,
    lore,
    labels: [
      "rpg-faction",
      "faction-roster",
      "faction-roster-generator",
      "imported-draft",
    ],
    status: "active",
  };
}
