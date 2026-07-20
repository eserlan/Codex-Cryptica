/**
 * Public NPC generator — framework-free port of the SEO NPC generator
 * (`apps/web/src/lib/services/seo/generators/npc.ts`). Owns the rich,
 * theme-keyed content data, the local fallback generator, the AI prompt
 * builder, and response parsing.
 *
 * Per the unification plan (#1351) this package stays framework-free: it does
 * NOT call the AI client or read `sessionStorage`. The web page builds the
 * prompt here, runs it through `aiClientManager`, parses with {@link
 * parseNpcResponse}, and falls back to {@link generateNpcLocal} on failure.
 * Session context (from the Session Hub) is injected as a plain string.
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
  type MoralityAnchor,
} from "./public-npc-constants";

export {
  BANNED_NAMES,
  NAME_BAN_PROMPT,
  npcConfig,
  npcThemeConfig,
} from "./public-npc-constants";



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

export interface NpcGeneratorOptions {
  race?: string;
  ancestry?: string;
  role?: string;
  alignment?: string;
  campaignContext?: string;
  theme?: string;
  includeDndQuickStats?: boolean;
}

/** Resolved inputs shared by the prompt builder and the local fallback. */
interface ResolvedNpc {
  race: string;
  role: string;
  alignment: string;
  campaignContext?: string;
  theme?: string;
  name: string;
  moralityAnchor?: MoralityAnchor;
}

function resolveNpc(options: NpcGeneratorOptions, rng: Rng): ResolvedNpc {
  const race =
    options.ancestry || options.race || pickFrom(npcConfig.races, rng);
  const role = options.role || pickFrom(npcConfig.roles, rng);
  const alignment = options.alignment || pickFrom(npcConfig.alignments, rng);
  const moralityAnchor = options.theme
    ? npcThemeConfig.moralities[options.theme]?.find((m) => m.id === alignment)
    : undefined;
  return {
    race,
    role,
    alignment,
    campaignContext: options.campaignContext?.trim() || undefined,
    theme: options.theme,
    name: generateName(rng),
    moralityAnchor,
  };
}

export interface NpcPrompt {
  systemInstruction: string;
  userMessage: string;
  /** Resolved inputs, so the caller can pass them to {@link parseNpcResponse}. */
  resolved: ResolvedNpc;
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
  const { race, role, theme, campaignContext, moralityAnchor, alignment } =
    resolved;
  const voice = theme
    ? (NPC_THEME_VOICE[theme] ?? "tabletop RPG")
    : "tabletop RPG";
  const chosenNamingStyle = pickFrom(NPC_NAMING_STYLES, rng);
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original NPC drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One sentence: who this NPC is and what makes them interesting (e.g. 'A disgraced noble archivist who sells secrets to fund a private obsession.').",
  "content": "Markdown. Use exactly these four section headers in order: '### Who they are', '### What they want', '### Why they are useful', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Moral Stance**: behavioral anchor\\n- **Secret**: hidden truth that would change everything\\n- **Immediate Hook**: one-sentence GM hook\\n### Personality\\n- two distinct personality traits as bullet points\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": ["2-4 lowercase labels describing their role and traits, plus 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every NPC must feel like a completely different person — avoid repeating names, archetypes, or backstory structures.
- ${NAME_BAN_PROMPT}
${sessionContext}
- The secret should be genuinely surprising and table-usable, not a generic "dark past."
- Before finalising, silently check for: name not on the forbidden list; secret is genuinely surprising and not contradicted by the stated role or faction connection; all four content sections are internally consistent (what they want should explain why they are useful; their secret should reframe who they are). Rewrite any section where a contradiction exists.`;

  const behavioralDirective = moralityAnchor?.aiPromptDirective ?? alignment;
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const userMessage = `Generate an NPC. Variation seed: ${varianceSeed}.
${theme ? `- Genre/Theme: ${theme}` : ""}
- Ancestry/Race: ${race}
- Role: ${role}
- Moral Stance: ${moralityLabel}
- Behavioral Directive: ${behavioralDirective}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
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
  const { race, role, name, moralityAnchor, alignment } = resolved;

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
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-character", "npc-generator", "imported-draft"],
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
  } = resolved;

  const fallbackTheme = "Classic Fantasy";
  const traits = getRandomItems(npcConfig.traits, 2, rng);
  const secret = pickFrom(
    npcConfig.secretsByTheme[theme ?? ""] ??
      npcConfig.secretsByTheme[fallbackTheme],
    rng,
  );
  const motive = pickFrom(
    npcConfig.motivesByTheme[theme ?? ""] ??
      npcConfig.motivesByTheme[fallbackTheme],
    rng,
  );
  const faction = pickFrom(
    npcConfig.factionsByTheme[theme ?? ""] ??
      npcConfig.factionsByTheme[fallbackTheme],
    rng,
  );
  const plotHook = pickFrom(npcConfig.plotHooks, rng);
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const whoIntro = pickFrom(WHO_THEY_ARE_INTROS, rng)(name, race, role);
  const wantCloser = pickFrom(WHAT_THEY_WANT_CLOSERS, rng);
  const usefulIntro = pickFrom(WHY_USEFUL_INTROS, rng)(role, faction);
  const howIntro = pickFrom(HOW_TO_USE_INTROS, rng)(name);
  const howCloser = pickFrom(HOW_TO_USE_CLOSERS, rng);

  const content = `### Who they are
${whoIntro}${campaignContext ? ` In ${campaignContext}, they are already entangled in the edges of the main conflict.` : ""}

### What they want
${motive} ${wantCloser}

### Why they are useful
${usefulIntro}

### How to use them at the table
${howIntro} ${howCloser}`;

  const lore = `### At a Glance
- **Theme / Genre**: ${theme}
- **Ancestry**: ${race}
- **Role**: ${role}
- **Moral Stance**: ${moralityLabel}
- **Secret**: ${secret}
- **Immediate Hook**: ${plotHook}

### Personality
- ${traits[0]}
- ${traits[1]}

### Faction Connection
${faction}`;

  return {
    type: "character",
    title: name,
    summary: `A ${moralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
    content,
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(lore, role)
      : lore,
    labels: ["rpg-character", "npc-generator", "imported-draft"],
    status: "active",
  };
}
