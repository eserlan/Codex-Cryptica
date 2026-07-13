/**
 * Public Faction + Vampire Clan generators — framework-free port of the SEO
 * faction generator (`apps/web/src/lib/services/seo/generators/faction.ts`).
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with the parse* helpers, and falls back to the
 * generate*Local helpers on failure. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";

// ---------------------------------------------------------------------------
// Config (ported verbatim from seo faction.ts; extracted to public-faction-constants.ts)
// ---------------------------------------------------------------------------
import {
  factionConfig,
  themeIdToLabel,
  vampireConfig,
  nomadClanConfig,
  FACTION_THEME_VOICE,
  factionBase,
  FACTION_NAMING_STYLES,
  FACTION_NPC_NAMING_STYLES,
  factionResource,
} from "./public-faction-constants";

export { factionConfig, themeIdToLabel, vampireConfig, nomadClanConfig };

export interface FactionGeneratorOptions {
  type?: string;
  scope?: string;
  alignment?: string;
  campaignContext?: string;
  theme?: string;
}

interface ResolvedFaction {
  theme: string;
  factionType: string;
  scope: string;
  alignment: string;
  campaignContext?: string;
  name: string;
}

function resolveFaction(
  options: FactionGeneratorOptions,
  rng: Rng,
): ResolvedFaction {
  const theme = options.theme || factionConfig.themes[0];
  const typePool =
    factionConfig.typesByTheme[theme] ??
    factionConfig.typesByTheme["Classic Fantasy"];
  return {
    theme,
    factionType: options.type || pickFrom(typePool, rng),
    scope:
      options.scope ||
      pickFrom(
        factionConfig.scopesByTheme[theme] ??
          factionConfig.scopesByTheme["Classic Fantasy"],
        rng,
      ),
    alignment: options.alignment || pickFrom(factionConfig.alignments, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    name: `${generateName(rng)} Compact`,
  };
}

export interface FactionPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedFaction;
}

export function buildFactionPrompt(
  options: FactionGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): FactionPrompt {
  const resolved = resolveFaction(options, rng);
  const { theme, factionType, scope, alignment, campaignContext } = resolved;
  const voice = FACTION_THEME_VOICE[theme] ?? "tabletop RPG";
  const chosenNamingStyle = pickFrom(FACTION_NAMING_STYLES, rng);
  const chosenNpcStyle = pickFrom(FACTION_NPC_NAMING_STYLES, rng);
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original faction drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "Faction name (follow the naming directive in the user message)",
  "summary": "One sentence: what this faction is and what makes them interesting (e.g. 'A sanitation cult-technocracy that controls clean water in a poisoned city.').",
  "content": "Markdown. Use exactly these four section headers in order: '### What they control', '### What they want', '### Why they are dangerous', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At the Table\\n- **📍 Base**: specific named location\\n- **Resource**: what they control that others need\\n- **Symbol**: identifying mark or emblem\\n- **Secret**: hidden truth that would destroy them\\n- **Immediate Hook**: one-sentence GM hook\\n### Notable NPCs\\n- **👤 Name**: one-line description (2-3 NPCs)\\n### Internal Conflict\\none paragraph\\n### Rival Faction\\n- **👥 Name**: one-line rivalry",
  "labels": ["2-5 lowercase tags for the faction's theme and activities, plus 'rpg-faction', 'faction-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every generation must feel like a completely different faction — avoid repeating names, concepts, or structures from prior outputs.
- Avoid generic RPG naming clichés (no 'Gilded Ledger', 'Iron Brotherhood', 'Shadow Hand', etc.).
- ${NAME_BAN_PROMPT}
${sessionContext}
- Before finalising, silently critique for: name originality, internal consistency (NPCs don't contradict each other), logical alignment between public face and secret agenda. Rewrite if issues found.`;

  const userMessage = `Generate a faction. Variation seed: ${varianceSeed}.
- Theme/Genre: ${theme}
- Faction Type: ${factionType}
- Scope: ${scope}
- Moral Posture: ${alignment}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Faction Naming Directive: ${chosenNamingStyle}
- NPC Naming Directive: ${chosenNpcStyle}`;

  return { systemInstruction, userMessage, resolved };
}

export function parseFactionResponse(
  text: string,
  resolved: ResolvedFaction,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "faction",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-faction", "faction-generator", "imported-draft"],
    status: "active",
  };
}

export function generateFactionLocal(
  options: FactionGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const { theme, factionType, scope, alignment, campaignContext, name } =
    resolveFaction(options, rng);
  const goal = pickFrom(
    factionConfig.goalsByTheme[theme] ??
      factionConfig.goalsByTheme["Classic Fantasy"],
    rng,
  );
  const conflict = pickFrom(factionConfig.conflicts, rng);
  const hook = pickFrom(factionConfig.hooks, rng);
  const rival = `${generateName(rng)} Covenant`;
  const leader = generateName(rng);
  const agent = generateName(rng);

  const summary = `A ${alignment.toLowerCase()} ${factionType.toLowerCase()} operating at the ${scope.toLowerCase()} level.`;

  const factionControlClosers = [
    `Their reach is felt in every trade deal, guarded rumor, and carefully placed favor.`,
    `Nothing moves through this ${scope.toLowerCase()} without them knowing about it — or taking a cut.`,
    `They do not need to be visible to be powerful; their influence runs through the people who handle money, information, and access.`,
    `The faction operates through proxies, debts, and well-timed silences rather than open displays of strength.`,
    `Ask who benefits from the current arrangement in this ${scope.toLowerCase()} and the answer loops back to them.`,
  ] as const;

  const factionWantClosers = [
    `Every action the faction takes, however charitable it appears, serves this underlying drive.`,
    `Their apparent generosity, their public neutrality, their occasional concessions — all of it is navigation toward this goal.`,
    `Understanding this is the key to predicting what they will do next and who they will sacrifice to do it.`,
    `The faction has never lost sight of this, even when circumstances forced temporary retreats.`,
    `Everything else — alliances, conflicts, charitable gestures — is positioning toward this end.`,
  ] as const;

  const factionDangerClosers = [
    `Beyond their internal tensions, they will negotiate before striking — but they do not forget.`,
    `What makes them dangerous is not the threat they represent today but the patience they have shown over years.`,
    `They have survived worse. What they cannot survive is being underestimated by the wrong people at the wrong time.`,
    `The faction does not escalate without cause. When they do, the response is disproportionate by design.`,
    `They play long games. A slight that seems forgotten rarely is.`,
  ] as const;

  const factionHowToUse = [
    (n: string) =>
      `Bring ${n} into play when the party needs leverage, pressure, a sponsor, or a rival who can operate in daylight. They reward players who deal in favors and punish those who make public enemies.`,
    (n: string) =>
      `${n} works best as a recurring power — one the party keeps needing and never fully trusts. Let them be useful before revealing the full cost of their help.`,
    (n: string) =>
      `Use ${n} as the faction the party can never quite get ahead of. Every concession they win should quietly shift something else in the faction's favor.`,
    (n: string) =>
      `${n} is most effective when the party is not sure whether they are an ally, a tool, or a threat. Let that ambiguity persist as long as possible.`,
    (n: string) =>
      `Introduce ${n} through a representative, not the faction itself — let the players build a relationship before they understand what they have walked into.`,
  ] as const;

  const content = `### What they control
${name} is a ${factionType.toLowerCase()} with a firm grip on key resources across the ${scope.toLowerCase()}. ${pickFrom(factionControlClosers, rng)}${campaignContext ? ` In ${campaignContext}, they already have fingers in the most contested disputes.` : ""}

### What they want
${goal} ${pickFrom(factionWantClosers, rng)}

### Why they are dangerous
${conflict} ${pickFrom(factionDangerClosers, rng)}

### How to use them at the table
${pickFrom(factionHowToUse, rng)(name)}`;

  const lore = `### At the Table
- **Theme / Genre**: ${theme}
- **📍 Base**: ${factionBase(factionType, rng)}
- **Resource**: ${factionResource(factionType, rng)}
- **Symbol**: ${name.split(" ")[0]} iconography worn by inner-circle members
- **Secret**: ${conflict}
- **Immediate Hook**: ${hook}

### Notable NPCs
- **👤 ${leader}**: Public face who insists every deal serves the common good.
- **👤 ${agent}**: Field operative who knows where the faction buries its failures.

### Internal Conflict
${conflict}

### Rival Faction
- **👥 ${rival}**: Pursuing the same influence, relic, or route — and will reach it first if the party does nothing.`;

  return {
    type: "faction",
    title: name,
    summary,
    content,
    lore,
    labels: ["rpg-faction", "faction-generator", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Nomad Clan (Cyberpunk) public API
// ---------------------------------------------------------------------------

export type NomadClanGeneratorOptions = {
  role?: string;
  tone?: string;
  territory?: string;
  conflict?: string;
  campaignContext?: string;
};

interface ResolvedNomadClan {
  role: string;
  tone: string;
  territory: string;
  conflict: string;
  campaignContext?: string;
  name: string;
}

function generateNomadName(rng: Rng = defaultRng): string {
  const prefixes = [
    "Dustborn",
    "Ironroad",
    "Ashtrack",
    "Gritline",
    "Burnpath",
    "Scorchway",
    "Cinder",
    "Driftwall",
    "Gridlock",
    "Razorway",
  ];
  const suffixes = [
    "Collective",
    "Convoy",
    "Pack",
    "Riders",
    "Run",
    "Circuit",
    "Syndicate",
    "Compact",
    "Brotherhood",
    "Crew",
  ];
  return `${pickFrom(prefixes, rng)} ${pickFrom(suffixes, rng)}`;
}

function resolveNomadClan(
  options: NomadClanGeneratorOptions,
  rng: Rng,
): ResolvedNomadClan {
  return {
    role: options.role || pickFrom(nomadClanConfig.roles, rng),
    tone: options.tone || pickFrom(nomadClanConfig.tones, rng),
    territory: options.territory || pickFrom(nomadClanConfig.territories, rng),
    conflict: options.conflict || pickFrom(nomadClanConfig.conflicts, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    name: generateNomadName(rng),
  };
}

export interface NomadClanPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedNomadClan;
}

export function buildNomadClanPrompt(
  options: NomadClanGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): NomadClanPrompt {
  const resolved = resolveNomadClan(options, rng);
  const { name, role, tone, territory, conflict, campaignContext } = resolved;
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const systemInstruction = `You are an expert RPG campaign writer specialising in cyberpunk worldbuilding — nomadic road communities, convoy culture, corporate enemies, and survival on the margins. You generate detailed, original nomad clan drafts in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "Clan name (a short, punchy road-culture name — avoid generic fantasy naming)",
  "summary": "One sentence: what this clan is and what makes them memorable as a faction.",
  "content": "Markdown. Use exactly these four section headers in order: '### Who they are', '### How they survive', '### What threatens them', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### Clan Profile\\n- **📍 Territory**: their primary routes and stopping points\\n- **Fleet**: convoy composition and vehicle types\\n- **Code**: one-line clan law or initiation rite\\n- **Secret**: hidden truth about the clan\\n- **Immediate Hook**: one-sentence GM hook\\n### Notable Members\\n- **👤 Name**: one-line description (2-3 members)\\n### Current Crisis\\none paragraph\\n### Rival Faction\\n- **👥 Name**: one-line rivalry summary",
  "labels": ["2-5 lowercase tags, plus 'rpg-faction', 'nomad-clan', 'imported-draft'"]
}

QUALITY RULES:
- Every generation must feel like a distinct clan — avoid repeating names, vehicle types, or crisis types from prior outputs.
- Tone should match: ${tone}.
- ${NAME_BAN_PROMPT}
${sessionContext}
- Before finalising, silently check: does the clan feel road-worn and specific? Are the NPCs distinct? Does the crisis create immediate play pressure? Rewrite if not.`;

  const userMessage = `Generate a cyberpunk nomad clan. Variation seed: ${varianceSeed}.
- Clan Name: ${name}
- Role: ${role}
- Tone: ${tone}
- Territory: ${territory}
- Current Conflict: ${conflict}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}`;

  return { systemInstruction, userMessage, resolved };
}

export function parseNomadClanResponse(
  text: string,
  resolved: ResolvedNomadClan,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "faction",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-faction", "nomad-clan", "imported-draft"],
    status: "active",
  };
}

export function generateNomadClanLocal(
  options: NomadClanGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const { role, tone, territory, conflict, campaignContext, name } =
    resolveNomadClan(options, rng);
  const goal = pickFrom(nomadClanConfig.goals, rng);
  const hook = pickFrom(nomadClanConfig.hooks, rng);
  const rival = generateNomadName(rng);
  const leader = generateName(rng);
  const mechanic = generateName(rng);
  const scout = generateName(rng);

  const content = `### Who they are
${name} is a ${role.toLowerCase()} operating across ${territory.toLowerCase()}. Their tone is ${tone.toLowerCase()} — every decision is shaped by the road and the people who depend on the convoy.${campaignContext ? ` In ${campaignContext}, they are a known presence: respected by those who need them, watched by those who profit from stability.` : ""}

### How they survive
${goal} Their economy runs on what the roads provide — cargo runs, repairs, protection contracts, and trade at waystation markets. Nothing is wasted; everything has a price.

### What threatens them
${conflict} This is the crisis that cannot be deferred. The clan must resolve it before it costs them a route, a vehicle, or a member.

### How to use them at the table
${name} works best as a faction the party keeps running into — on the road, at fuel stops, in waystation bars. They are reliable in a way most factions are not, but their code has limits and their patience for outsiders who cause problems is short.`;

  const lore = `### Clan Profile
- **📍 Territory**: ${territory}
- **Fleet**: Mixed convoy — a lead rig, two cargo haulers, and two scout bikes. Plus whatever they have salvaged this season.
- **Code**: ${tone.split(",")[0]} — don't burn bridges you might need to cross again.
- **Secret**: ${conflict}
- **Immediate Hook**: ${hook}

### Notable Members
- **👤 ${leader}**: Convoy lead who makes the calls and takes the blame when they go wrong.
- **👤 ${mechanic}**: Head mechanic whose hands keep the fleet running; knows every vehicle's secrets.
- **👤 ${scout}**: Point rider who has memorised three hundred kilometres of road and is running out of safe routes.

### Current Crisis
${conflict} The clan is managing it — for now — but every day without a resolution narrows their options.

### Rival Faction
- **👥 ${rival}**: Competing for the same routes, safe stops, or cargo contracts. The rivalry is old enough to have its own code of conduct — and new enough that someone recently broke it.`;

  return {
    type: "faction",
    title: name,
    summary: `A ${role.toLowerCase()} convoy operating across ${territory.toLowerCase()}.`,
    content,
    lore,
    labels: ["rpg-faction", "nomad-clan", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Vampire Clan public API
// ---------------------------------------------------------------------------

export interface VampireGeneratorOptions {
  archetype?: string;
  bloodline?: string;
  feedingHabit?: string;
  weakness?: string;
  scope?: string;
  alignment?: string;
  campaignContext?: string;
}

interface ResolvedVampire {
  archetype: string;
  bloodline: string;
  feedingHabit: string;
  weakness: string;
  scope: string;
  alignment: string;
  campaignContext?: string;
  name: string;
}

function resolveVampire(
  options: VampireGeneratorOptions,
  rng: Rng,
): ResolvedVampire {
  const prefixes = ["House ", "The ", "Covenant of ", "Order of ", "Clan "];
  const roots = [
    "Dracul",
    "Karnstein",
    "Von Carstein",
    "Orlok",
    "Bathory",
    "Tepes",
    "Morbius",
    "Sanguis",
    "Vargo",
    "Ruthven",
  ];
  return {
    archetype: options.archetype || pickFrom(vampireConfig.archetypes, rng),
    bloodline: options.bloodline || pickFrom(vampireConfig.bloodlines, rng),
    feedingHabit:
      options.feedingHabit || pickFrom(vampireConfig.feedingHabits, rng),
    weakness: options.weakness || pickFrom(vampireConfig.weaknesses, rng),
    scope: options.scope || pickFrom(vampireConfig.scopes, rng),
    alignment: options.alignment || pickFrom(vampireConfig.alignments, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    name: pickFrom(prefixes, rng) + pickFrom(roots, rng),
  };
}

export interface VampirePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedVampire;
}

export function buildVampirePrompt(
  options: VampireGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): VampirePrompt {
  const resolved = resolveVampire(options, rng);
  const {
    name,
    archetype,
    bloodline,
    feedingHabit,
    weakness,
    scope,
    alignment,
    campaignContext,
  } = resolved;

  const userMessage = `Generate a detailed RPG vampire clan/faction in JSON format.
Options:
- Name: ${name}
- Clan Archetype: ${archetype}
- Bloodline: ${bloodline}
- Feeding Habit: ${feedingHabit}
- Clan Weakness: ${weakness}
- Scope of Influence: ${scope}
- Moral Posture: ${alignment}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the vampire clan/house name",
  "content": "A detailed multi-paragraph overview (markdown formatted) describing its history, public facade in mortal society, dark haven, and how it fits the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted). Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\n### GM Reference Information\n- **Faction Type**: Vampire Clan (archetype)\n- **Bloodline**: bloodline summary\n- **Scope**: scope of influence\n- **Moral Posture**: moral posture\n- **Feeding Habit**: feeding habit\n- **Clan Weakness**: weakness\n- **Entity Type**: Faction\n\n### Dark Agenda\none paragraph\n\n### Internal Conflict\none paragraph\n\n### Notable NPCs\n- **👤 Sire Name**: one-line description\n- **👤 Thrall Name**: one-line description\n\n### Rival Faction\n- **👥 Rival Name**: one-line rivalry summary\n\n### Adventure Hook\none paragraph",
  "labels": ["rpg-faction", "vampire-clan", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseVampireResponse(
  text: string,
  resolved: ResolvedVampire,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "faction",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-faction", "vampire-clan", "imported-draft"],
    status: "active",
  };
}

export function generateVampireLocal(
  options: VampireGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const {
    archetype,
    bloodline,
    feedingHabit,
    weakness,
    scope,
    alignment,
    campaignContext,
    name,
  } = resolveVampire(options, rng);
  const goal = pickFrom(vampireConfig.goals, rng);
  const conflict = pickFrom(vampireConfig.conflicts, rng);
  const hook = pickFrom(vampireConfig.hooks, rng);
  const rival = `${generateName(rng)} Inquisition`;
  const sire = generateName(rng);
  const thrall = generateName(rng);

  const content = `### Overview
${name} is a powerful vampire clan of the ${bloodline.toLowerCase()} lineage, operating as a ${archetype.toLowerCase()} across ${scope.toLowerCase()}. They hide their predatory activities behind a carefully crafted mortal facade, manipulating events from the dark.

${campaignContext ? `### Campaign Fit\nUse ${name} in ${campaignContext}. Their influence should touch the local halls of power, forgotten catacombs, or ongoing dark mysteries.\n` : ""}### Public Facade
To the mortal world, members of ${name} present themselves as wealthy philanthropists, eccentric scholars, or influential patrons. Very few suspect that behind this elegant mask lies a highly organized coven of undead hunters.

### Table Use
Introduce ${name} when the party enters high-society intrigue, investigates occult occurrences, or needs a powerful but dangerous ally who demands blood or secrets as currency.`;

  const lore = `### GM Reference Information
- **Faction Type**: Vampire Clan (${archetype})
- **Bloodline**: ${bloodline}
- **Scope**: ${scope}
- **Moral Posture**: ${alignment}
- **Feeding Habit**: ${feedingHabit}
- **Clan Weakness**: ${weakness}
- **Entity Type**: Faction

### Dark Agenda
${goal}

### Internal Conflict
${conflict}

### Notable NPCs
- **👤 Sire ${sire}**: The ancient leader of the clan who has survived centuries of inquisitions and power struggles.
- **👤 Thrall ${thrall}**: A high-ranking mortal puppet who manages the clan's daytime assets and legal matters.

### Rival Faction
- **👥 The ${rival}**: Seeks to expose, purge, or take control of the secrets and assets held by ${name}.

### Adventure Hook
${hook}`;

  return {
    type: "faction",
    title: name,
    summary: "",
    content,
    lore,
    labels: ["rpg-faction", "vampire-clan", "imported-draft"],
    status: "active",
  };
}
