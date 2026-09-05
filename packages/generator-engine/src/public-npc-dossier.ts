/**
 * Dossier-mode (four-section GM writeup) local-fallback rendering for the
 * public NPC generator — the AI-free counterpart to the AI prompt's
 * "Who they are / What they want / Why they are useful / How to use them"
 * structure.
 *
 * Split out of `public-npc.ts` to keep that file focused on the shared
 * resolve/prompt/parse pipeline.
 */

import type { Rng } from "./random-utils";
import { pickFrom } from "./random-utils";
import { DELVE_ALERT_STAGES } from "./public-npc-constants";
import type { ResolvedNpc } from "./public-npc";
import type { TableCardLocalResult } from "./public-npc-table-card";

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

const DELVE_WHO_THEY_ARE_INTROS = [
  (name: string, race: string, role: string, sector: string) =>
    `${name} is a ${race} ${role} holding ${sector}, and everyone else in the delve knows it. Routes get redrawn and shifts get rearranged, all to avoid crossing them.`,
  (name: string, race: string, role: string, sector: string) =>
    `${name}, a ${race} ${role}, has made ${sector} their own. Nothing moves through it without their say, whether the rest of the delve wants that or not.`,
  (name: string, race: string, role: string, sector: string) =>
    `In ${sector}, ${name} is the answer to most questions. This ${race} ${role} has settled in deep enough that other inhabitants plan around them by default.`,
  (name: string, race: string, role: string, sector: string) =>
    `${name} moved into ${sector} and took it over; this ${race} ${role} runs it now, and the surrounding sectors have adjusted accordingly.`,
] as const;

const DELVE_WHY_USEFUL_INTROS = [
  () =>
    "Getting past them means picking a lane: talk your way through, slip by unseen, or fight.",
  () =>
    "Every route deeper runs through them; the party has to decide how they deal with them, not if.",
  () =>
    "Sooner or later the party has to reckon with them directly, by words, by stealth, or by force.",
  () =>
    "No path through the delve avoids them for long; the only open question is which approach the party picks.",
] as const;

/**
 * Render the local (AI-free) dossier output. The caller applies quick stats
 * injection and `status` since those are shared with table-card mode.
 */
export function generateNpcDossierLocal(
  resolved: ResolvedNpc,
  delveContext: {
    isDelve: boolean;
    delveSector?: string;
    delveRelation?: string;
    delveSecretTie?: string;
  },
  moralityLabel: string,
  traits: readonly string[],
  rng: Rng,
): TableCardLocalResult {
  const {
    race,
    role,
    name,
    theme,
    campaignContext,
    motive,
    mannerism,
    secret,
    faction,
    factionStance,
    leverage,
    plotHook,
  } = resolved;
  const { isDelve, delveSector, delveRelation, delveSecretTie } = delveContext;

  const whoIntro = isDelve
    ? pickFrom(DELVE_WHO_THEY_ARE_INTROS, rng)(
        name,
        race,
        role,
        delveSector ?? "their sector",
      )
    : pickFrom(WHO_THEY_ARE_INTROS, rng)(name, race, role);

  const wantCloser = pickFrom(WHAT_THEY_WANT_CLOSERS, rng);

  const usefulIntro = isDelve
    ? `${delveRelation ?? "Their tie to the rest of the delve"} ${pickFrom(DELVE_WHY_USEFUL_INTROS, rng)()}`
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
    title: name,
    summary: `A ${moralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
    content,
    lore,
    labels,
  };
}
