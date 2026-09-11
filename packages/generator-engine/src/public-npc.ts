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
import {
  buildTableCardSystemInstruction,
  generateNpcTableCardLocal,
} from "./public-npc-table-card";
import { generateNpcDossierLocal } from "./public-npc-dossier";

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
  mode?: NpcMode | "short";
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
  immediateWant?: string;
  contradiction?: string;
  relationshipHook?: string;
  sensoryTag?: string;
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

  const isTableCard = mode === "table-card";
  const immediateWant = isTableCard
    ? pickFrom(LOCAL_IMMEDIATE_WANTS, rng)
    : undefined;
  const contradiction = isTableCard
    ? pickFrom(LOCAL_CONTRADICTIONS, rng)
    : undefined;
  const relationshipHook = isTableCard
    ? pickFrom(LOCAL_RELATIONSHIP_HOOKS, rng)
    : undefined;
  const sensoryTag = isTableCard ? pickFrom(LOCAL_SENSORY_TAGS, rng) : undefined;

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
    ? buildTableCardSystemInstruction(
        voice,
        delvePromptInstruction,
        isDelve,
        sessionContext,
      )
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

/** Local, AI-free NPC generator — the fallback when AI is unavailable. */
export function generateNpcLocal(
  options: NpcGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveNpc(options, rng);
  const { role, moralityAnchor, alignment, isDelve } = resolved;

  const traits = getRandomItems(npcConfig.traits, 2, rng);
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const delveSector = isDelve
    ? pickFrom(DELVE_SECTOR_LOCATIONS, rng)
    : undefined;
  const delveRelation = isDelve
    ? pickFrom(DELVE_INHABITANT_RELATIONS, rng)
    : undefined;
  const delveSecretTie = isDelve ? pickFrom(DELVE_SECRET_TIES, rng) : undefined;
  const delveContext = { isDelve, delveSector, delveRelation, delveSecretTie };

  const rendered =
    resolved.mode === "table-card"
      ? generateNpcTableCardLocal(resolved, delveContext, moralityLabel)
      : generateNpcDossierLocal(
          resolved,
          delveContext,
          moralityLabel,
          traits,
          rng,
        );

  return {
    type: "character",
    title: rendered.title,
    summary: rendered.summary,
    content: rendered.content,
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(rendered.lore, role)
      : rendered.lore,
    labels: rendered.labels,
    status: "active",
  };
}
