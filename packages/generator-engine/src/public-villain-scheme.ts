/**
 * Public Superhero Villain Scheme generator — framework-free port following
 * the public-villain.ts / public-quest.ts shape (#3112, part of the #2288
 * Superhero / Comic Book epic).
 *
 * Explicitly flagged in the epic as a "high-value" superhero-native
 * generator. Unlike the BBEG / Campaign Villain generator (`public-villain.ts`),
 * which produces a full villain character writeup, this generator produces
 * the SCHEME itself — an ongoing, staged, discoverable, escalating plot that
 * could belong to any villain (existing or freshly imagined). It is
 * deliberately Superhero / Comic Book only (see the shared
 * `superhero-power-scale.ts`, #3103, used here as the scheme's threat /
 * objective scale axis) — no genre selector, unlike most public generators.
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
import { formatCampaignContextBlock } from "./campaign-context";
import {
  SUPERHERO_POWER_SCALES,
  SUPERHERO_POWER_SCALE_HINTS,
  type SuperheroPowerScale,
} from "./superhero-power-scale";

export const villainSchemeConfig = {
  powerScales: SUPERHERO_POWER_SCALES,
  tones: [
    "Pulpy",
    "Grim",
    "Cosmic",
    "Noir",
    "Tragic",
    "Satirical",
    "High-Stakes",
  ],
  schemeTypes: [
    "Random",
    "Heist / Theft",
    "Blackmail Network",
    "Mind Control Plot",
    "Public Manipulation Campaign",
    "Weapon Development",
    "Political Infiltration",
    "Corporate Hostile Takeover",
    "Reality-Warping Ritual",
    "Hostage / Extortion Scheme",
    "Frame-Up / Reputation Sabotage",
    "Resurrection / Cloning Project",
  ],
  villainProfiles: [
    "Random",
    "Criminal Mastermind",
    "Mad Scientist",
    "Corrupt Tycoon",
    "Fallen Hero",
    "Alien Infiltrator",
    "Cult Leader",
    "Rogue Government Agency",
    "Vengeful Ex-Sidekick",
    "Artificial Intelligence",
    "Immortal Schemer",
  ],
  schemeNames: [
    "the Long Con",
    "the Final Ledger",
    "the Quiet Hour",
    "the Second Face",
    "the Undoing",
    "the Reckoning Clause",
    "the Last Signal",
    "the Open Door",
  ],
};

export interface VillainSchemeGeneratorOptions {
  powerScale?: string;
  tone?: string;
  schemeType?: string;
  villainProfile?: string;
  campaignContext?: string;
}

export interface ResolvedVillainScheme {
  powerScale: string;
  tone: string;
  schemeType: string;
  villainProfile: string;
  campaignContext?: string;
  schemeName: string;
}

function resolvePick(
  requested: string | undefined,
  options: readonly string[],
  rng: Rng,
): string {
  const real = options.filter((o) => o !== "Random");
  if (!requested || requested === "Random") return pickFrom(real, rng);
  return requested;
}

function resolveVillainScheme(
  options: VillainSchemeGeneratorOptions,
  rng: Rng,
): ResolvedVillainScheme {
  return {
    powerScale:
      options.powerScale || pickFrom(villainSchemeConfig.powerScales, rng),
    tone: options.tone || pickFrom(villainSchemeConfig.tones, rng),
    schemeType: resolvePick(
      options.schemeType,
      villainSchemeConfig.schemeTypes,
      rng,
    ),
    villainProfile: resolvePick(
      options.villainProfile,
      villainSchemeConfig.villainProfiles,
      rng,
    ),
    campaignContext: options.campaignContext?.trim() || undefined,
    schemeName: `Operation ${pickFrom(villainSchemeConfig.schemeNames, rng).replace(/^the /i, "")}`,
  };
}

export interface VillainSchemePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedVillainScheme;
}

const CONSISTENCY_PASS = `Before returning, run a consistency pass: the "Adventure Hook" must be phrased as a usable, ready-to-run hook the GM can drop into a session (not a summary of the scheme) and must derive directly from the scheme's current stage, not from a stage that has not started yet; every clue listed anywhere must be something the villain's own actions would plausibly leave behind, not information they would never expose; the Scheme Stages must escalate logically stage-to-stage, and each stage's consequences must connect to what the next stage assumes has already happened; "Consequences If Nobody Intervenes" must be a direct continuation of the final Scheme Stage, not an unrelated worse outcome; the Resources / Minions listed must be sufficient to actually carry out the stages described, and not exceed what the chosen Power Scale would plausibly command; and the Possible Twist must not simply restate the Objective — it must recontextualise something already presented earlier in the scheme.`;

export function buildVillainSchemePrompt(
  options: VillainSchemeGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): VillainSchemePrompt {
  const resolved = resolveVillainScheme(options, rng);
  const powerScaleHint =
    SUPERHERO_POWER_SCALE_HINTS[resolved.powerScale as SuperheroPowerScale];

  const userMessage = `Generate a Superhero / Comic Book villain SCHEME in JSON format — an ongoing plot or plan, not a villain biography. The scheme must be usable by any villain (an existing one from the campaign, or a freshly imagined one referenced only lightly): staged, escalating, and discoverable, with clues the heroes can plausibly uncover before the finale. British English. System-neutral (no game-system mechanics or stat blocks).
Options:
- Power Scale: ${resolved.powerScale} — ${powerScaleHint}
- Tone: ${resolved.tone}
- Scheme Type: ${resolved.schemeType}
- Villain Profile (who is plausibly behind it): ${resolved.villainProfile}
${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A codename or short title for the scheme (3-7 words, e.g. 'Operation Blackout Signal')",
  "content": "Player/table-facing markdown (what the heroes can plausibly learn without metagaming) with these sections: '### Public Activity' (what is visibly happening in the world right now because of this scheme — the cover story, the front, or the surface-level incident), '### Rumours & Signs' (3-4 concrete, indirect early clues the campaign can reveal before the villain is identified), '### Adventure Hook' (a single ready-to-run paragraph, phrased the way a quest hook is phrased — concrete, immediate, and actionable — that a GM can drop straight into a session to pull the heroes into the scheme's CURRENT stage).",
  "lore": "GM-only markdown (use exactly these '###' headings, in this order): '### Objective' (a concrete desired end state the villain is working toward — never vague like 'gain power'; state what the world looks like if the scheme succeeds), '### Motivation' (why they want it — an internally coherent reason from the villain's own perspective), '### Current Activity' (what the villain is actually doing right now, as opposed to what the public sees), '### Resources & Minions' (what and who gives them the capability to run this scheme, appropriate to the Power Scale), '### Scheme Stages' (4-6 escalating numbered stages as '**Stage N: <name>**' sub-entries; each stage must cover: what the villain/agents do, clues heroes can uncover during that stage, and what changes if the heroes disrupt that stage), '### Complications' (2-3 cross-cutting complications that make intervention messier than a straight fight — competing interests, collateral risk, or a sympathetic bystander), '### Escalation If Ignored' (how the scheme's own momentum changes if the heroes do nothing for a while), '### Consequences If Nobody Intervenes' (the concrete end-state if the scheme completes uninterrupted, following directly from the final stage), '### Possible Twist' (one optional twist that recontextualises something already established above — not a restatement of the Objective).",
  "labels": ["villain-scheme", "villain-scheme-generator", "imported-draft"]
}
Quality guardrails: the scheme must do things, not merely possess lore — avoid generic evil-for-evil's-sake, avoid every scheme being 'actually a distraction for a bigger scheme', avoid every clue being something the villain would never realistically leave behind. Ensure objective, motivation, resources, stages, and consequences logically reinforce one another.
${CONSISTENCY_PASS}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed Superhero / Comic Book RPG villain schemes in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseVillainSchemeResponse(
  text: string,
  resolved: ResolvedVillainScheme,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "note",
    title: data.title || resolved.schemeName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["villain-scheme", "villain-scheme-generator", "imported-draft"],
    status: "active",
  };
}

const PUBLIC_ACTIVITY_POOL = [
  "Insurance filings across the district have spiked, all naming the same underwriter no one can quite place.",
  "A run of high-end break-ins has left surveillance footage intact but somehow useless every time.",
  "A charity gala has drawn an unusually large security detail for an event nobody important is attending.",
  "City permits have quietly cleared a renovation project that keeps missing its own deadlines.",
  "A minor tech company has gone fully dark on social media the same week its stock started climbing.",
] as const;

const RUMOUR_POOL = [
  "Three separate witnesses describe the same unmarked van, always three blocks from where anything happened.",
  "A junior staffer at city hall keeps getting reassigned every time they ask about one specific file.",
  "A pawn shop owner swears the same courier has sold the same kind of component four times this month.",
  "Someone posted a blurry photo of a rooftop meeting and deleted it twenty minutes later.",
  "A retired cop keeps telling anyone who'll listen that the pattern looks familiar from a case that was never closed.",
  "A city inspector signed off on a site nobody else was allowed to enter that day.",
] as const;

const ADVENTURE_HOOK_POOL = [
  "A contact who owes the heroes a favour has spotted the same unmarked van twice this week and wants it looked into before whoever's driving it notices they've been made.",
  "A nervous city employee slips the heroes a copy of a permit application that shouldn't exist, then stops answering calls.",
  "A break-in at a minor lab leaves nothing stolen but everything catalogued — someone wanted to know what was there, not take it.",
  "An informant offers to name names in exchange for protection, but only if the heroes can get to them before tonight's gala ends.",
  "A whistleblower's evidence points somewhere the heroes wouldn't normally look twice at — which is exactly why it's been working.",
] as const;

const COMPLICATIONS_POOL = [
  "A sympathetic low-level operative is only involved because of a debt they didn't choose, and getting caught in the crossfire would ruin someone who didn't deserve it.",
  "A rival faction is also circling the same target for its own reasons, and mistaking them for the villain's people costs the heroes time and goodwill.",
  "Public opinion currently favours the villain's cover story, so acting too visibly against it damages the heroes' own credibility.",
  "Local authorities are already involved and moving slowly on purpose — someone with real power benefits from the delay.",
] as const;

/**
 * Local (non-AI) fallback. Deliberately lighter than the AI prompt's full
 * checklist — a usable, internally consistent draft rather than an attempt to
 * hand-author every section the prompt asks the model for.
 */
export function generateVillainSchemeLocal(
  options: VillainSchemeGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveVillainScheme(options, rng);
  const publicActivity = pickFrom(PUBLIC_ACTIVITY_POOL, rng);
  const rumourOne = pickFrom(RUMOUR_POOL, rng);
  const rumourTwo = pickFrom(
    RUMOUR_POOL.filter((r) => r !== rumourOne),
    rng,
  );
  const adventureHook = pickFrom(ADVENTURE_HOOK_POOL, rng);
  const complicationOne = pickFrom(COMPLICATIONS_POOL, rng);
  const complicationTwo = pickFrom(
    COMPLICATIONS_POOL.filter((c) => c !== complicationOne),
    rng,
  );
  const minionName = generateName(rng);
  const secondMinionName = generateName(rng);

  const content = `### Public Activity
${publicActivity}

### Rumours & Signs
- ${rumourOne}
- ${rumourTwo}

### Adventure Hook
${adventureHook}`;

  const lore = `### Objective
The ${resolved.villainProfile.toLowerCase()} behind ${resolved.schemeName} wants a concrete, lasting change in their own favour once the scheme completes — not vague power, but a specific asset, position, or secret permanently in their hands.

### Motivation
Their reasoning holds together on its own terms: a ${resolved.tone.toLowerCase()}, ${resolved.schemeType.toLowerCase()}-flavoured plan that makes sense from inside their own priorities, whatever the wider world would think of it.

### Current Activity
Behind ${publicActivity.charAt(0).toLowerCase()}${publicActivity.slice(1)}, the real work is quieter: positioning people, resources, and cover stories so that by the time anyone official asks the right question, the answer is already unreachable.

### Resources & Minions
- **${minionName}** — handles the operation's day-to-day logistics; loyal enough to follow orders, not loyal enough to die for them.
- **${secondMinionName}** — provides the specialised capability (technical, financial, or occult, matching ${resolved.schemeType.toLowerCase()}) the scheme depends on.
- A cover operation legitimate enough to survive a casual look, appropriately scaled to a ${resolved.powerScale.toLowerCase()}-level threat.

### Scheme Stages
**Stage 1: Establish the front** — The cover operation goes fully live; clues are administrative (permits, hires, filings) rather than dramatic. Disrupting this stage forces a cruder, more exposed cover later.
**Stage 2: Gather the pieces** — Resources and minions are quietly assembled under the front's legitimate cover. Clues appear as unusual patterns noticed by people close to the operation. Undisrupted, the scheme gains the capacity it needs.
**Stage 3: Test the mechanism** — A small-scale trial run, deniable if caught, reveals whether the plan actually works. Clues are now physical evidence, not just patterns. This is the last stage stoppable without a direct confrontation.
**Stage 4: Execute in earnest** — The scheme moves from preparation to action; its effects become visible to the wider public even if its source is not. Clues are now unmistakable, but resources to reverse the damage are scarce.

### Complications
- ${complicationOne}
- ${complicationTwo}

### Escalation If Ignored
Left unchecked, each stage completes roughly on schedule, and the villain's position becomes harder to dislodge the longer the heroes wait — by Stage 4, undoing the scheme costs far more than preventing it would have.

### Consequences If Nobody Intervenes
The scheme completes: the ${resolved.villainProfile.toLowerCase()} secures the objective outright, the public is left with only the cover story to explain what happened, and the affected community bears whatever cost the plan required.

### Possible Twist
Someone the heroes already trust from an earlier stage — an informant, a minor witness, or a bystander who helped — turns out to have known more than they said, for reasons that recast their earlier help in a different light.`;

  return {
    type: "note",
    title: resolved.schemeName,
    summary: "",
    content,
    lore,
    labels: ["villain-scheme", "villain-scheme-generator", "imported-draft"],
    status: "active",
  };
}
