/**
 * Public NPC generator — framework-free port of the SEO NPC generator
 * (`apps/web/src/lib/services/seo/generators/npc.ts`). Owns the rich,
 * theme-keyed content data, the local fallback generator, the AI prompt
 * builder, and response parsing.
 *
 * Migrated onto the smart deterministic framework (#2532).
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems as getRandomItems,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import {
  NAME_BAN_PROMPT,
  npcConfig,
  npcThemeConfig,
  dndNpcQuickStatsByRole,
  NPC_THEME_VOICE,
  NPC_NAMING_STYLES,
  DELVE_ROLES,
  DELVE_SECTOR_LOCATIONS,
  DELVE_INHABITANT_RELATIONS,
  DELVE_SECRET_TIES,
  DELVE_ALERT_STAGES,
  type MoralityAnchor,
} from "./public-npc-constants";
import { formatCampaignContextBlock } from "./campaign-context";
import {
  buildNpcSchema,
  LOCAL_CONTRADICTIONS,
  LOCAL_SENSORY_TAGS,
  LOCAL_IMMEDIATE_WANTS,
  LOCAL_RELATIONSHIP_HOOKS,
} from "./public-npc-schema";
import { resolveSmart, type LockedValue } from "./smart";

export {
  BANNED_NAMES,
  NAME_BAN_PROMPT,
  npcConfig,
  npcThemeConfig,
  DELVE_ROLES,
  DELVE_SECTOR_LOCATIONS,
  DELVE_INHABITANT_RELATIONS,
  DELVE_SECRET_TIES,
  DELVE_ALERT_STAGES,
} from "./public-npc-constants";

export {
  buildNpcSchema,
  LOCAL_MANNERISMS,
  LOCAL_FACTION_STANCES,
  LOCAL_LEVERAGE_PRICES,
  LOCAL_CONTRADICTIONS,
  LOCAL_SENSORY_TAGS,
  LOCAL_IMMEDIATE_WANTS,
  LOCAL_RELATIONSHIP_HOOKS,
} from "./public-npc-schema";

function getDndNpcQuickStats(role: string) {
  return (
    dndNpcQuickStatsByRole[role] ?? {
      archetype: `${role} / Level 3`,
      tableRating: "CR 1",
    }
  );
}

export function injectDndNpcQuickStats(lore: string, role: string): string {
  const { archetype, tableRating } = getDndNpcQuickStats(role);
  const quickStats = `- **Class / Archetype**: ${archetype}
- **Table Rating**: ${tableRating}`;

  if (lore.includes("- **Class / Archetype**:")) return lore;

  if (!lore.includes("### At a Glance")) {
    return `### At a Glance
${quickStats}

${lore}`.trim();
  }

  return lore.replace(
    /(### At a Glance\s*)/,
    `$1${quickStats}
`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DelveContextData {
  delveTitle?: string;
  theme?: string;
  sectors?: string[];
  secret?: string;
  inhabitants?: string;
  conflict?: string;
}

export type NpcMode = "dossier" | "table-card";

export interface NpcGeneratorOptions {
  race?: string;
  ancestry?: string;
  role?: string;
  alignment?: string;
  campaignContext?: string;
  delveContext?: DelveContextData | string;
  theme?: string;
  includeDndQuickStats?: boolean;
  mode?: "dossier" | "table-card" | "short";
}

export function isDelveContext(options: NpcGeneratorOptions): boolean {
  if (options.delveContext) return true;
  if (options.role && DELVE_ROLES.has(options.role)) return true;
  if (
    options.campaignContext &&
    (/\[Delve Context\]/i.test(options.campaignContext) ||
      /\[Dungeon Context\]/i.test(options.campaignContext) ||
      /\b(?:delve|dungeon|inhabitant factions|central secret|key sectors)\b/i.test(
        options.campaignContext,
      ))
  ) {
    return true;
  }
  return false;
}

/** Resolved inputs shared by the prompt builder and the local fallback. */
export interface ResolvedNpc {
  race: string;
  role: string;
  alignment: string;
  motive: string;
  mannerism: string;
  secret: string;
  faction: string;
  factionStance: string;
  leverage: string;
  plotHook: string;
  campaignContext?: string;
  delveContext?: DelveContextData | string;
  theme?: string;
  name: string;
  moralityAnchor?: MoralityAnchor;
  isDelve: boolean;
  traits: readonly string[];
  mode: NpcMode;
  immediateWant: string;
  contradiction: string;
  relationshipHook: string;
  sensoryTag: string;
}

export function resolveNpc(
  options: NpcGeneratorOptions,
  rng: Rng,
): ResolvedNpc {
  const isDelve = isDelveContext(options);
  const theme = options.theme;
  const locked: Record<string, LockedValue> = {};

  const requestedRace = options.ancestry || options.race;
  if (requestedRace) {
    locked.ancestry = { value: requestedRace, source: "manual" };
  }
  if (options.role) {
    locked.role = { value: options.role, source: "manual" };
  }
  if (options.alignment) {
    locked.alignment = { value: options.alignment, source: "manual" };
  }

  const schema = buildNpcSchema(isDelve);
  const { values, traits } = resolveSmart(
    schema,
    { genre: theme ?? "Classic Fantasy", locked },
    rng,
  );

  const race = values.ancestry;
  const role = values.role;
  const alignment = values.alignment;
  const motive = values.motive;
  const mannerism = values.mannerism;
  const secret = values.secret;
  const faction = values.faction;
  const factionStance = values.factionStance;
  const leverage = values.leverage;
  const plotHook = values.plotHook;

  const effectiveTheme = theme ?? "Classic Fantasy";
  const moralityAnchor = npcThemeConfig.moralities[effectiveTheme]?.find(
    (m) => m.id === alignment,
  );

  const mode: NpcMode =
    options.mode === "table-card" || options.mode === "short"
      ? "table-card"
      : "dossier";

  const immediateWant = pickFrom(LOCAL_IMMEDIATE_WANTS, rng);
  const contradiction = pickFrom(LOCAL_CONTRADICTIONS, rng);
  const relationshipHook = pickFrom(LOCAL_RELATIONSHIP_HOOKS, rng);
  const sensoryTag = pickFrom(LOCAL_SENSORY_TAGS, rng);

  return {
    race,
    role,
    alignment,
    motive,
    mannerism,
    secret,
    faction,
    factionStance,
    leverage,
    plotHook,
    campaignContext: options.campaignContext?.trim() || undefined,
    delveContext: options.delveContext,
    theme,
    name: generateName(rng),
    moralityAnchor,
    isDelve,
    traits,
    mode,
    immediateWant,
    contradiction,
    relationshipHook,
    sensoryTag,
  };
}

export interface NpcPrompt {
  systemInstruction: string;
  userMessage: string;
  /** Resolved inputs, so the caller can pass them to {@link parseNpcResponse}. */
  resolved: ResolvedNpc;
}

export function formatDelveContextBlock(
  delveContext?: DelveContextData | string,
): string {
  if (!delveContext) return "";
  if (typeof delveContext === "string") {
    return `\n- Delve/Dungeon Context: ${delveContext.trim()}`;
  }
  const lines: string[] = ["\n[Delve Source Context]"];
  if (delveContext.delveTitle)
    lines.push(`- Dungeon Location: ${delveContext.delveTitle}`);
  if (delveContext.theme) lines.push(`- Dungeon Theme: ${delveContext.theme}`);
  if (delveContext.conflict)
    lines.push(`- Current Conflict: ${delveContext.conflict}`);
  if (delveContext.inhabitants)
    lines.push(`- Inhabitants & Factions: ${delveContext.inhabitants}`);
  if (delveContext.secret)
    lines.push(`- Central Secret / Mystery: ${delveContext.secret}`);
  if (delveContext.sectors?.length)
    lines.push(`- Key Sectors: ${delveContext.sectors.join(", ")}`);
  return lines.join("\n");
}

/**
 * Build the AI prompt for an NPC. `sessionContext` is the Session Hub fragment
 * (built web-side from sessionStorage); pass "" when none.
 */
export function buildNpcPrompt(
  options: NpcGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): NpcPrompt {
  const resolved = resolveNpc(options, rng);
  const {
    race,
    role,
    theme,
    campaignContext,
    delveContext,
    moralityAnchor,
    alignment,
    isDelve,
  } = resolved;
  const voice = theme
    ? (NPC_THEME_VOICE[theme] ?? "tabletop RPG")
    : "tabletop RPG";
  const chosenNamingStyle = pickFrom(NPC_NAMING_STYLES, rng);
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const delvePromptInstruction = isDelve
    ? `\nDELVE / DUNGEON CONTEXT ACTIVE:
This character is a Key NPC, Boss, Guardian, or Inhabitant of the specified Dungeon/Delve location.
- '### Who they are': Establish their role, identity, and specific physical location or chamber inside the delve.
- '### What they want': Their active objective, struggle, or agenda within the site.
- '### Why they are useful': Key leverage, threat, or crucial knowledge they possess regarding the delve's sectors and secrets.
- '### How to use them at the table': Room/encounter dynamics, environmental lair leverage, negotiation terms, and consequences if defeated or rescued.
- In 'lore': In addition to standard fields:
  - Under '### At a Glance', include: '- **Delve Sector / Lair**: <specific sector/room>', '- **Relation to Inhabitants**: <how they lead, hunt, or interact with other occupants>', '- **Tie to Central Secret**: <how they guard, exploit, or are cursed by the central mystery>'.
  - Include a '### Alert & Lair Response' section with 3 escalating stages (Stage 1: Unaware/Routine, Stage 2: Alerted/Patrols & Hazard Arming, Stage 3: Direct Confrontation/Lair Defense).
`
    : "";

  const isTableCard = resolved.mode === "table-card";

  const systemInstruction = isTableCard
    ? `You are an expert RPG campaign writer specialising in ${voice}. You generate punchy, table-ready NPC reference cards in JSON format based on the 5-element memorable NPC anatomy (immediate want, physical mannerism, sharp contradiction, relationship hook, and sensory tag).${delvePromptInstruction}

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One punchy sentence capturing who this NPC is, their contradiction, and their immediate scene goal.",
  "content": "Markdown. Use exactly these two section headers in order: '### The Five Elements' and '### Table Delivery'.\\n\\nUnder '### The Five Elements', include exactly these 5 bullet points with bold labels:\\n- **Immediate Want**: One concrete, urgent desire for this scene or from the party right now (tangible and immediate, e.g. 'Needs 40 lbs of bog-iron before Friday' or 'Needs someone expendable to deliver a sealed pouch across the river').\\n- **Physical Mannerism**: One observable physical habit, gesture, or vocal cadence the GM can easily portray without vocal strain.\\n- **Sharp Contradiction**: One trait, habit, or vulnerability that breaks archetype fatigue and directly contradicts their occupation or appearance.\\n- **Relationship Hook**: One active link of debt, family, rivalry, or faction allegiance tying them into the wider local world.\\n- **Sensory Tag**: One vivid sensory detail (scent, sound, or striking visual mark) that sticks in players' memory.\\n\\nUnder '### Table Delivery', provide 2-3 sentences explaining how to introduce them in thirty seconds of table dialogue.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Immediate Want**: urgent scene desire\\n- **Mannerism / Vocal Tell**: physical habit or speech cadence\\n- **Contradiction**: trait subverting archetype\\n- **Relationship Hook**: tie to faction, rival, or NPC\\n- **Sensory Tag**: scent, sound, or visual detail\\n- **Moral Stance**: behavioral anchor${isDelve ? "\\n### Alert & Lair Response\\n- **Stage 1 (Unaware)**: routine in lair\\n- **Stage 2 (Alerted)**: defensive response\\n- **Stage 3 (Lair Defense / Confrontation)**: combat or negotiation leverage" : ""}\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": [${isDelve ? '"delve-boss", "dungeon-npc", ' : ""}"2-4 lowercase labels describing their role and traits, plus 'table-card', 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Ground the NPC in playable surface cues rather than hidden backstory. Every element must be demonstrable in 60 seconds of dialogue.
- The immediate want must be urgent and scene-level (something they demand or need from the party right now), not an abstract life ambition.
- The contradiction must genuinely subvert their archetype or role.
- ${NAME_BAN_PROMPT}
${sessionContext}
- Silently check that all five elements are present and distinctive before finalising.`
    : `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original NPC drafts for that setting in JSON format.${delvePromptInstruction}

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One sentence: who this NPC is and what makes them interesting (e.g. 'A disgraced noble archivist who sells secrets to fund a private obsession.').",
  "content": "Markdown. Use exactly these four section headers in order: '### Who they are', '### What they want', '### Why they are useful', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Mannerism / Vocal Tell**: distinctive physical habit, speech cadence, or behavioral quirk\\n- **Moral Stance**: behavioral anchor\\n- **Faction Stance & Biases**: sharp, biased opinion on relevant factions, institutions, or rival groups\\n- **Leverage & Price**: what buys their cooperation vs. what pressure point breaks them\\n- **Secret**: hidden truth that would change everything\\n- **Immediate Hook**: one-sentence GM hook${isDelve ? "\\n### Alert & Lair Response\\n- **Stage 1 (Unaware)**: routine in lair\\n- **Stage 2 (Alerted)**: defensive response\\n- **Stage 3 (Lair Defense / Confrontation)**: combat or negotiation leverage" : ""}\\n### Personality\\n- two distinct personality traits as bullet points\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": [${isDelve ? '"delve-boss", "dungeon-npc", ' : ""}"2-4 lowercase labels describing their role and traits, plus 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every NPC must feel like a completely different person — avoid repeating names, archetypes, or backstory structures.
- Give the NPC strong, opinionated stances rather than generic neutrality.
- ${NAME_BAN_PROMPT}
${sessionContext}
- The secret should be genuinely surprising and table-usable, not a generic "dark past."
- Before finalising, silently check for: name not on the forbidden list; mannerism is tangible and playable; faction stance and leverage are actionable for GM social encounters; secret is genuinely surprising and not contradicted by the stated role or faction connection; all four content sections are internally consistent (what they want should explain why they are useful; their secret should reframe who they are). Rewrite any section where a contradiction exists.`;

  const behavioralDirective = moralityAnchor?.aiPromptDirective ?? alignment;
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const userMessage = `Generate an NPC. Variation seed: ${varianceSeed}.
${theme ? `- Genre/Theme: ${theme}` : ""}
- Ancestry/Race: ${race}
- Role: ${role}
- Moral Stance: ${moralityLabel}
- Behavioral Directive: ${behavioralDirective}${formatCampaignContextBlock(campaignContext)}${formatDelveContextBlock(delveContext)}
- Naming Directive: ${chosenNamingStyle}`;

  return { systemInstruction, userMessage, resolved };
}

/**
 * Parse the AI's JSON response into a {@link PublicGeneratorOutput}. Tolerates
 * markdown code fences. Throws on invalid JSON so the caller can fall back to
 * {@link generateNpcLocal}.
 */
export function parseNpcResponse(
  text: string,
  options: NpcGeneratorOptions,
  resolved: ResolvedNpc,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  const { race, role, name, moralityAnchor, alignment, isDelve } = resolved;

  const labels = Array.isArray(data.labels)
    ? [...data.labels]
    : ["rpg-character", "npc-generator", "imported-draft"];

  if (isDelve) {
    if (!labels.includes("delve-boss")) labels.unshift("delve-boss");
    if (!labels.includes("dungeon-npc")) labels.unshift("dungeon-npc");
  }
  if (resolved.mode === "table-card" && !labels.includes("table-card")) {
    labels.unshift("table-card");
  }

  return {
    type: "character",
    title: data.title || name,
    summary:
      data.summary ||
      `A ${(moralityAnchor?.label ?? alignment).toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
    content: data.content || "",
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(data.lore || "", role)
      : data.lore || "",
    labels,
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Local-fallback content variation pools
// ---------------------------------------------------------------------------

const WHO_THEY_ARE_INTROS = [
  (name: string, race: string, role: string) =>
    `${name} is a ${race} ${role} whose public reputation is useful, incomplete, and just suspicious enough to matter. Locals know them as someone who gets results, even when the work requires favors, secrets, or a carefully timed lie.`,
  (name: string, race: string, role: string) =>
    `${name} is a ${race} ${role} who has cultivated an air of competent neutrality — the kind of person everyone has heard of but no one quite trusts. What they are known for publicly barely scratches the surface of what they are actually doing.`,
  (name: string, race: string, role: string) =>
    `${name} operates as a ${race} ${role} at the margins of polite society — known to some, avoided by others, and quietly indispensable to both. Their reputation has been carefully managed to open exactly the doors they need.`,
  (name: string, race: string, role: string) =>
    `Most people who encounter ${name} come away with an impression of a ${race} ${role} who is useful and slightly unknowable. That impression is not entirely wrong, but it is missing the part that matters.`,
  (name: string, race: string, role: string) =>
    `${name} has spent years building the particular kind of credibility a ${race} ${role} needs: enough reputation to be taken seriously, not so much that people look too closely.`,
] as const;

const WHAT_THEY_WANT_CLOSERS = [
  "Everything they do, however helpful it appears on the surface, is filtered through this underlying drive.",
  "This goal shapes every interaction they have — including the ones that appear to be about something else entirely.",
  "Even their moments of apparent generosity are positioning moves toward this end.",
  "Anyone paying close attention will eventually notice that all roads, for them, lead back here.",
  "They have gotten very good at appearing helpful while never losing sight of this.",
] as const;

const WHY_USEFUL_INTROS = [
  (role: string, faction: string) =>
    `As a ${role.toLowerCase()}, they move through circles the party cannot easily enter. Their ties to ${faction} give them access to information, favors, and doors that stay closed to strangers.`,
  (_role: string, faction: string) =>
    `Their value is in what they know and who they know it through. Connected to ${faction}, they can surface things the party would spend weeks trying to find on their own.`,
  (role: string, faction: string) =>
    `A ${role.toLowerCase()} with genuine reach: their affiliation with ${faction} means they can move requests through channels most people do not have access to.`,
  (role: string, faction: string) =>
    `What makes them worth the complications is their position — a ${role.toLowerCase()} embedded in ${faction}, which puts them adjacent to exactly the kind of leverage, intelligence, and access the party needs.`,
  (_role: string, faction: string) =>
    `They are useful because they are trusted in places the party is not. Their standing with ${faction} translates directly into things the party cannot acquire through force or coin alone.`,
] as const;

const HOW_TO_USE_INTROS = [
  (name: string) =>
    `Introduce ${name} when the party needs a social lead, a compromised witness, or a morally complicated ally.`,
  (name: string) =>
    `${name} works best as a recurring contact — someone the party keeps returning to, whose price keeps quietly shifting.`,
  (name: string) =>
    `Drop ${name} into a scene where the party is stuck: they will have an answer, but never a free one.`,
  (name: string) =>
    `Use ${name} as the face of a complication — someone who solves one problem and quietly creates another.`,
  (name: string) =>
    `${name} is most effective when the party genuinely needs them and vaguely suspects they should not.`,
] as const;

const HOW_TO_USE_CLOSERS = [
  "They should be helpful immediately — but never free of consequences.",
  "Their help is real. So is the cost, even if it doesn't come due right away.",
  "Let them deliver. The hook is not whether they are useful but what being in their debt eventually means.",
  "Give the party a win through them early — then let the implications accumulate.",
  "The more the party relies on them, the more interesting the moment when those loyalties are tested.",
] as const;

/** Local, AI-free NPC generator — the fallback when AI is unavailable. */
export function generateNpcLocal(
  options: NpcGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveNpc(options, rng);
  const {
    race,
    role,
    name,
    theme,
    campaignContext,
    moralityAnchor,
    alignment,
    isDelve,
    motive,
    mannerism,
    secret,
    faction,
    factionStance,
    leverage,
    plotHook,
  } = resolved;

  const traits = getRandomItems(npcConfig.traits, 2, rng);
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const delveSector = isDelve
    ? pickFrom(DELVE_SECTOR_LOCATIONS, rng)
    : undefined;
  const delveRelation = isDelve
    ? pickFrom(DELVE_INHABITANT_RELATIONS, rng)
    : undefined;
  const delveSecretTie = isDelve ? pickFrom(DELVE_SECRET_TIES, rng) : undefined;

  if (resolved.mode === "table-card") {
    const content = `### The Five Elements
- **Immediate Want**: ${resolved.immediateWant}
- **Physical Mannerism**: ${mannerism}
- **Sharp Contradiction**: ${resolved.contradiction}
- **Relationship Hook**: ${resolved.relationshipHook}
- **Sensory Tag**: ${resolved.sensoryTag}

### Table Delivery
Introduce ${name} through their sensory tell and mannerism before naming their immediate want. When the party probes their background or negotiates terms, reveal their internal contradiction to break archetype expectations.`;

    const glanceDelveFields = isDelve
      ? `\n- **Delve Sector / Lair**: ${delveSector}\n- **Relation to Inhabitants**: ${delveRelation}\n- **Tie to Central Secret**: ${delveSecretTie}`
      : "";

    const alertSection = isDelve
      ? `\n\n### Alert & Lair Response\n${DELVE_ALERT_STAGES.join("\n")}`
      : "";

    const lore = `### At a Glance
${theme ? `- **Theme / Genre**: ${theme}\n` : ""}- **Ancestry**: ${race}
- **Role**: ${role}${glanceDelveFields}
- **Immediate Want**: ${resolved.immediateWant}
- **Mannerism / Vocal Tell**: ${mannerism}
- **Contradiction**: ${resolved.contradiction}
- **Relationship Hook**: ${resolved.relationshipHook}
- **Sensory Tag**: ${resolved.sensoryTag}
- **Moral Stance**: ${moralityLabel}${alertSection}

### Faction Connection
${faction}`;

    const roleLabel = role.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const labels = isDelve
      ? [
          "delve-boss",
          "dungeon-npc",
          "table-card",
          roleLabel,
          "rpg-character",
          "npc-generator",
          "imported-draft",
        ]
      : [
          "table-card",
          roleLabel,
          "rpg-character",
          "npc-generator",
          "imported-draft",
        ];

    const cleanWant = resolved.immediateWant.replace(/\.$/, "").toLowerCase();

    return {
      type: "character",
      title: name,
      summary: `A ${moralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} who urgently ${cleanWant}.`,
      content,
      lore: options.includeDndQuickStats
        ? injectDndNpcQuickStats(lore, role)
        : lore,
      labels,
      status: "active",
    };
  }

  const whoIntro = isDelve
    ? `${name} is a ${race} ${role} located in the ${delveSector}. Their presence within the site is unmistakable, exerting direct influence over the surrounding sectors.`
    : pickFrom(WHO_THEY_ARE_INTROS, rng)(name, race, role);

  const wantCloser = pickFrom(WHAT_THEY_WANT_CLOSERS, rng);

  const usefulIntro = isDelve
    ? `${delveRelation} Anyone delving into the site will eventually have to navigate their presence, whether through stealth, negotiation, or force.`
    : pickFrom(WHY_USEFUL_INTROS, rng)(role, faction);

  const howIntro = isDelve
    ? `Use ${name} as the key encounter or pivotal obstacle in the ${delveSector}. ${delveSecretTie}`
    : pickFrom(HOW_TO_USE_INTROS, rng)(name);

  const howCloser = pickFrom(HOW_TO_USE_CLOSERS, rng);

  const content = `### Who they are
${whoIntro}${campaignContext ? ` In ${campaignContext}, they are already entangled in the edges of the main conflict.` : ""}

### What they want
${motive} ${wantCloser}

### Why they are useful
${usefulIntro}

### How to use them at the table
${howIntro} ${howCloser}`;

  const glanceDelveFields = isDelve
    ? `\n- **Delve Sector / Lair**: ${delveSector}\n- **Relation to Inhabitants**: ${delveRelation}\n- **Tie to Central Secret**: ${delveSecretTie}`
    : "";

  const alertSection = isDelve
    ? `\n\n### Alert & Lair Response\n${DELVE_ALERT_STAGES.join("\n")}`
    : "";

  const lore = `### At a Glance
${theme ? `- **Theme / Genre**: ${theme}\n` : ""}- **Ancestry**: ${race}
- **Role**: ${role}${glanceDelveFields}
- **Mannerism / Vocal Tell**: ${mannerism}
- **Moral Stance**: ${moralityLabel}
- **Faction Stance & Biases**: ${factionStance}
- **Leverage & Price**: ${leverage}
- **Secret**: ${secret}
- **Immediate Hook**: ${plotHook}${alertSection}

### Personality
- ${traits[0]}
- ${traits[1]}

### Faction Connection
${faction}`;

  const roleLabel = role.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const labels = isDelve
    ? [
        "delve-boss",
        "dungeon-npc",
        roleLabel,
        "rpg-character",
        "npc-generator",
        "imported-draft",
      ]
    : [roleLabel, "rpg-character", "npc-generator", "imported-draft"];

  return {
    type: "character",
    title: name,
    summary: `A ${moralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
    content,
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(lore, role)
      : lore,
    labels,
    status: "active",
  };
}
