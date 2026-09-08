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

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
  generatePlaceholderName as generateName,
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

/**
 * The faction being rostered, as a binding block distinct from the generic
 * "campaign context" block — mirrors `formatDelveContextBlock` in
 * `public-npc.ts`. Proper nouns already named in the faction (its leaders,
 * base, rivals) are pinned so the roster promotes them rather than inventing
 * a parallel cast.
 */
function formatFactionContextBlock(factionContext?: string): string {
  const trimmed = factionContext?.trim();
  if (!trimmed) return "";
  const properNouns = extractProperNouns(trimmed);
  return [
    ``,
    ``,
    `[Source Faction — the roster must inherit its ideology, goals, methods, culture, resources, and internal tensions]`,
    trimmed,
    ``,
    `Every member must fit this specific faction, not a generic organisation of the same type.`,
    ...(properNouns.length > 0
      ? [
          `If any of these names from the faction already name a person rather than the faction itself, promote that person into the roster instead of inventing a duplicate: ${properNouns.join(", ")}.`,
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
- ${NAME_BAN_PROMPT}${nameRestrictions}
${sessionContext}
- Before finalising, run a consistency pass: every "connection.member" value names another member actually present in this same "members" array (never the faction itself, never a member's own name, never someone outside the array); at least two members' priorities genuinely conflict; no member's motive duplicates the faction's own goal; every role and duty fits a ${structure.toLowerCase()}, not a generic hierarchy; every name fits ${theme}. Fix any mismatch before responding.`;

  const userMessage = `Generate a faction roster of ${size} notable members.
- Theme/Genre: ${theme}
- Structure: ${structure}
- Emphasis: ${emphasis}${formatFactionContextBlock(resolved.factionContext)}${formatCampaignContextBlock(campaignContext)}`;

  return { systemInstruction, userMessage, resolved };
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

const ROSTER_ARCHETYPES = [
  {
    role: "Authority figure",
    stance: "Loyalist",
    trait: "Speaks softly and expects to be obeyed anyway.",
    leverage:
      "Everyone assumes their word is final; it hasn't been tested in years.",
  },
  {
    role: "True believer",
    stance: "Zealot",
    trait: "Quotes the founding cause word for word, unprompted.",
    leverage:
      "Would do something reckless if the cause were ever publicly doubted.",
  },
  {
    role: "Practical operator",
    stance: "Opportunist",
    trait:
      "Solves problems nobody else wants solved, and remembers who owes them.",
    leverage:
      "Keeps a private ledger of favours that could ruin several other members.",
  },
  {
    role: "Conflicted member",
    stance: "Reformer",
    trait: "Agrees out loud and hesitates in private.",
    leverage: "One more compromise from walking away, and everyone can tell.",
  },
  {
    role: "Recent recruit",
    stance: "Trapped",
    trait: "Still learning the unwritten rules, and getting them wrong.",
    leverage: "Owes a debt that got them in the door and isn't repaid yet.",
  },
  {
    role: "Internal problem",
    stance: "Secret traitor",
    trait: "The most reliable person in the room, which is the problem.",
    leverage:
      "Has already made contact with someone the faction would call an enemy.",
  },
] as const;

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

export function generateFactionRosterLocal(
  options: FactionRosterGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveFactionRoster(options, rng);
  const { size, structure, emphasis } = resolved;
  const factionName = extractFactionName(resolved.factionContext);
  const factionLabel = factionName ?? "the faction";

  const archetypes = pickRandomItems(ROSTER_ARCHETYPES, size, rng);
  const names = Array.from({ length: size }, () => generateName(rng));

  const members: FactionRosterMember[] = archetypes.map((archetype, i) => {
    // Each member connects to the next in the shuffled order (circular), so
    // every member has exactly one outward connection into the roster.
    const nextIndex = (i + 1) % size;
    return {
      name: names[i],
      role: archetype.role,
      duty: `Handles what a ${archetype.role.toLowerCase()} handles for ${factionLabel}, organised as a ${structure.toLowerCase()} — the work nobody minutes.`,
      motive: `Wants something for themselves out of this, separate from what ${factionLabel} claims to want.`,
      stance: archetype.stance,
      trait: archetype.trait,
      wantNow: `Needs a decision made before the next ${structure.toLowerCase()} meeting forces one on them.`,
      leverage: archetype.leverage,
      connection: {
        member: names[nextIndex],
        nature: "works closely with, and doesn't fully trust",
      },
    };
  });

  const content = members.map(formatMemberSection).join("\n\n");
  const summary = `${size} notable members of ${factionLabel}, organised as a ${structure.toLowerCase()} and weighted toward ${emphasis.toLowerCase()}.`;

  const lore = `### At a Glance
- **Structure**: ${structure}
- **Emphasis**: ${emphasis}
- **Immediate Hook**: The roster's internal tension is one bad decision from spilling into the open.

### How This Roster Divides
Loyalty to ${factionLabel} is not the same as loyalty to each other — the ${emphasis.toLowerCase()} in this group means the fault line runs through people who each think they are the reasonable one.`;

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
