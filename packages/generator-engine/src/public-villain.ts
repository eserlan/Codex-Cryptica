/**
 * Public BBEG / Campaign Villain generator — framework-free port following the
 * public-quest.ts / public-plot-twist.ts shape (#2325).
 *
 * Produces a campaign-scale antagonist that functions as a campaign engine
 * (goal, methods, an escalating multi-stage plan, discovery layers, and
 * consequences) rather than a biography-only villain writeup.
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
import { factionConfig } from "./public-faction-constants";

export const villainConfig = {
  // Genre uses the canonical 13-theme vocabulary directly (no per-generator
  // synonym mapping needed — see add-generator skill Part C step 0).
  genres: factionConfig.themes,
  tones: ["Grim", "Epic", "Sinister", "Tragic", "Pulpy", "Bleak", "Mysterious"],
  threatScales: [
    "Local",
    "Regional",
    "National",
    "Continental / Planetary",
    "Global",
    "Cosmic",
  ],
  archetypes: [
    "Random",
    "Dark Lord",
    "Mastermind",
    "Fallen Hero",
    "Corrupt Ruler",
    "Cult Leader",
    "Ancient Evil",
    "Cosmic Entity",
    "Crime Lord",
    "Revolutionary",
    "Rival Adventurer",
    "Artificial Intelligence",
    "Conqueror",
    "Manipulator / Infiltrator",
  ],
  sympathyLevels: [
    "Purely Monstrous",
    "Selfish but Human",
    "Understandable, Still Wrong",
    "Tragic and Sympathetic",
    "Arguably Justified",
  ],
  epithets: [
    "the Unmaking",
    "the Patient",
    "the Last Word",
    "the Reckoning",
    "the Quiet Hand",
    "the Undoing",
    "the Long Debt",
    "the Final Answer",
  ],
};

export interface VillainGeneratorOptions {
  genre?: string;
  tone?: string;
  threatScale?: string;
  archetype?: string;
  sympathy?: string;
  campaignContext?: string;
}

export interface ResolvedVillain {
  genre: string;
  tone: string;
  threatScale: string;
  archetype: string;
  sympathy: string;
  campaignContext?: string;
  villainName: string;
}

function resolveArchetype(requested: string | undefined, rng: Rng): string {
  const real = villainConfig.archetypes.filter((a) => a !== "Random");
  if (!requested || requested === "Random") return pickFrom(real, rng);
  return requested;
}

function resolveVillain(
  options: VillainGeneratorOptions,
  rng: Rng,
): ResolvedVillain {
  const genre = options.genre || pickFrom(villainConfig.genres, rng);
  return {
    genre,
    tone: options.tone || pickFrom(villainConfig.tones, rng),
    threatScale:
      options.threatScale || pickFrom(villainConfig.threatScales, rng),
    archetype: resolveArchetype(options.archetype, rng),
    sympathy: options.sympathy || pickFrom(villainConfig.sympathyLevels, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    villainName: `${generateName(rng)}, ${pickFrom(villainConfig.epithets, rng)}`,
  };
}

export interface VillainPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedVillain;
}

const CONSISTENCY_PASS = `Before returning, run a consistency pass: the multi-stage plan must escalate logically stage-to-stage and remain usable even if a stage is disrupted early (state how disruption changes later stages); the stated weakness must connect coherently to the fatal flaw, methods, or organisation rather than being an unrelated add-on; every lieutenant's stated loyalty and motivation must not contradict the organisation/power structure described elsewhere; and the selected threat scale must be reflected consistently across resources, methods, and the plan's scope — do not describe cosmic-scale resources for a Local-scale villain or vice versa.`;

const OVERUSED_DOMAINS = [
  "logistics",
  "supply chains",
  "corporate consolidation",
  "municipal bureaucracy",
  "data-routing",
];

/**
 * Builds the "avoid an overused domain" guardrail using the villain's own
 * *recent* generation history, so the instruction is enforced against real
 * session state rather than only asked for in the abstract (#2325 follow-up).
 */
function domainVarietyGuardrail(recentDomains: readonly string[]): string {
  const avoidList = OVERUSED_DOMAINS.join(", ");
  const recentNote =
    recentDomains.length > 0
      ? ` Domains used in this session's recent villains, most recent first: ${recentDomains.join(", ")} — vary away from these unless the campaign context specifically calls for a repeat.`
      : "";
  return `Before expanding the villain, identify the dominant conflict domain driving their plan and record it in the "conflictDomain" field (a short 2-5 word label, e.g. "Political Corruption", "Cult Ritual", "Military Conquest", "Personal Vendetta", "Cosmic Incursion", "Criminal Empire", "Ideological Revolution", "Forbidden Magic"). Avoid using ${avoidList} as that dominant domain unless the campaign context explicitly selects one of them, or unless none of these have appeared in recent generations.${recentNote}`;
}

export function buildVillainPrompt(
  options: VillainGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
  recentDomains: readonly string[] = [],
): VillainPrompt {
  const resolved = resolveVillain(options, rng);

  const userMessage = `Generate a campaign-scale BBEG / campaign villain in JSON format. The villain must function as a campaign engine — a clear goal, methods, resources, lieutenants, weaknesses, an escalating plan, discoverable clues, and consequences — not just biography, appearance, and generic villain flavour. British English. System-neutral (no game-system mechanics or stat blocks).
Options:
- Genre / Theme: ${resolved.genre}
- Tone: ${resolved.tone}
- Threat Scale: ${resolved.threatScale}
- Villain Archetype: ${resolved.archetype}
- Degree of Sympathy / Redeemability: ${resolved.sympathy}
${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "The villain's name, and an epithet or title if one fits the genre (3-8 words)",
  "conflictDomain": "A short 2-5 word label for the dominant conflict domain driving this villain's plan (see guardrail below)",
  "content": "Player/table-facing markdown (what the party can plausibly learn without metagaming) with these sections: '### Public Face' (what the wider world believes about them — tyrant, philanthropist, legend, or supposedly nonexistent threat), '### Signature / Calling Card' (a recurring motif, tactic, or trace that lets players recognise their influence before meeting them), '### First Signs' (several concrete, indirect early clues the campaign can reveal, e.g. strange orders, missing people, unusual movements — not the villain appearing personally).",
  "lore": "GM-only markdown (use exactly these '###' headings, in this order): '### Core Concept' (what makes this antagonist distinctive and campaign-worthy, one concise paragraph), '### True Nature' (what the GM knows that the world does not), '### Ultimate Goal' (a concrete desired end state — never a vague objective like 'gain power' or 'conquer the world'; explain what the world looks like when they have won), '### Why Now' (what changed recently that makes the villain act now, explaining why the campaign begins at this moment), '### Motivation' (an internally coherent reason for pursuing the goal, from the villain's own perspective), '### Fatal Flaw' (a weakness that affects behaviour, not decorative trivia), '### Methods' (how they actually advance their agenda), '### Resources' (what gives them power), '### Lieutenants & Inner Circle' (2-4 named subordinates, each as a bullet with role, relationship to the villain, personal motivation, degree of loyalty, and a vulnerability/secret/independent agenda — write these so each is usable later as a linked Character), '### Organisation & Power Structure' (how their power functions around them), '### Territory / Lair' (where they operate from and why it matters — avoid an isolated fortress by default), '### The Villain's Plan' (5-7 escalating numbered stages as '**Stage N: <name>**' sub-entries; each stage covers its objective, what the villain/agents do, clues available to players, factions or NPCs involved, consequences if successful, opportunities for player interference, and how disruption changes later stages), '### Escalation If Ignored' (how the situation develops if the party never intervenes), '### Discovery Layers' (three sub-parts: 'What the World Knows', 'What Their Servants Know', 'GM-Only Truth'), '### Personal Connections' (several optional hooks tying the villain to PCs without assuming backstory, e.g. former mentor, destroyed homeland, ideological rival), '### Weakness / Vulnerability' (at least one meaningful vulnerability discoverable and exploitable through play, not a single arbitrary object unless genre-appropriate), '### Moral Complication' (where appropriate, a reason defeating the villain does not cleanly solve the problem), '### Final Confrontation' (likely circumstances and stakes — not combat statistics), '### If Defeated' (consequences of removing the villain, appropriate to the threat scale).",
  "labels": ["villain", "bbeg-generator", "imported-draft"]
}
Quality guardrails: the villain should do things, not merely possess lore. Avoid generic evil-for-evil's-sake, avoid defaulting every villain to a misunderstood antihero, avoid every secret being 'serving an even bigger evil', avoid every organisation being a cult, avoid every goal being apocalypse/immortality/godhood unless the archetype specifically calls for it. Ensure goals, methods, resources, lieutenants, and plan stages logically reinforce one another, and that clues arise naturally from the villain's own actions.
${domainVarietyGuardrail(recentDomains)}
${CONSISTENCY_PASS}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign villains in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseVillainResponse(
  text: string,
  resolved: ResolvedVillain,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "character",
    title: data.title || resolved.villainName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["villain", "bbeg-generator", "imported-draft"],
    status: "active",
    conflictDomain:
      typeof data.conflictDomain === "string" && data.conflictDomain.trim()
        ? data.conflictDomain.trim()
        : undefined,
  };
}

const FIRST_SIGNS_POOL = [
  "Local officials have begun issuing orders that make no sense until you know who they now answer to.",
  "People who spoke out against the same cause have quietly stopped speaking at all.",
  "Unmarked convoys move at night along roads that used to be safe.",
  "Prices for one specific good have spiked for no visible reason.",
  "A symbol has started appearing on doors, ledgers, and gravestones alike.",
  "Wildlife near a certain site has begun behaving wrongly.",
  "A respected figure has vanished, and their replacement is unsettlingly smooth about it.",
  "Refugees tell contradictory stories that all avoid naming the same thing.",
] as const;

const SIGNATURE_POOL = [
  "Every site they touch is left with the same small, deliberate flaw — a broken seal, a burned ledger page, a single missing name.",
  "Their agents never lie outright; they simply stop answering the one question that matters.",
  "Wherever they have been, official records agree a little too perfectly.",
  "They leave one survivor from every failure, always with the same warning.",
  "Their followers mark completed work with a private, unassuming symbol.",
] as const;

/**
 * Domain-specific flavour for the local fallback's Methods/Resources/
 * Organisation/Territory/Plan sections. Randomly selected per generation so
 * the deterministic fallback doesn't always default to the same domain
 * (originally always logistics/bureaucracy — #2325 follow-up).
 */
interface VillainDomainFlavor {
  domain: string;
  methods: string;
  resources: string;
  organisation: string;
  territory: string;
  planStages: readonly [string, string, string, string, string, string];
}

const DOMAIN_FLAVORS: readonly VillainDomainFlavor[] = [
  {
    domain: "Political Corruption",
    methods:
      "Selective enforcement of real law, requisition powers, and quiet leverage over the officials who administer them — always favouring legitimacy over spectacle.",
    resources:
      "A genuine legal mandate, a loyal inspectorate or council bloc, and the gratitude of a population who credit them with an earlier crisis.",
    organisation:
      "A public office with real authority, quietly staffed at the top with people who owe their careers to the villain.",
    territory:
      "Their own official chambers — legitimately theirs, its lower levels holding what no audit has reached.",
    planStages: [
      "**Stage 1: Fail the independents** — Use lawful authority to remove or discredit the first rivals. Clues: suspicious rulings, sudden closures. Disruption exposes the standard as selectively enforced.",
      "**Stage 2: Absorb their position** — Redirect what the rivals controlled into the villain's own network. Clues: new exclusive arrangements. Undisrupted, dependency deepens quietly.",
      "**Stage 3: Extend emergency powers** — Petition to make temporary authority permanent, citing continued risk. Clues: a conveniently timed near-crisis. Disruption forces a public vote they might lose.",
      "**Stage 4: Remove the last independent check** — Discredit or reassign whoever could still oversee them. Clues: a sudden transfer order. This is the last stage stoppable without direct confrontation.",
      "**Stage 5: Consolidate the mandate** — Formalise permanent control through legitimate process. Clues are now public record. Stopping this requires exposing Stage 1 outright.",
      "**Stage 6: Enact the finished order** — Use the now-unassailable authority to complete the Ultimate Goal. Clues are unmistakable, but resources to stop it are scarce.",
    ],
  },
  {
    domain: "Military Conquest",
    methods:
      "Disciplined force projection, forward garrisons, and calculated provocations that let them claim retaliation rather than aggression.",
    resources:
      "A standing force loyal to them personally, war materiel stockpiled ahead of need, and client commanders who owe their rank to the villain.",
    organisation:
      "A chain of command that answers to the villain alone, with political oversight kept deliberately thin.",
    territory:
      "A forward staging ground close enough to strike quickly, defended by troops who believe they are the ones under threat.",
    planStages: [
      "**Stage 1: Seize the border ground** — Occupy a contested position under a pretext of security. Clues: troop movements, a sudden border incident. Disruption forces a cruder, more exposed pretext later.",
      "**Stage 2: Provoke the retaliation** — Goad a response that can be framed as unprovoked aggression. Clues: a staged attack, a suspiciously convenient casualty. Undisrupted, public opinion turns in the villain's favour.",
      "**Stage 3: Mobilise under popular support** — Use the manufactured outrage to raise and deploy real force. Clues: rapid conscription, requisitioned supply lines. Disruption strips away their moral cover.",
      "**Stage 4: Break the defensive coalition** — Isolate or bribe whichever ally could unify resistance. Clues: a sudden defection or broken treaty. This is the last stage stoppable before open war.",
      "**Stage 5: Take the objective by force** — Commit to open conflict for the true target. Clues are now unmistakable — armies in the field.",
      "**Stage 6: Impose the peace on their terms** — Dictate the settlement that fulfils the Ultimate Goal. Resources to reverse it are scarce once signed.",
    ],
  },
  {
    domain: "Cult Ritual",
    methods:
      "Careful recruitment, staged revelations, and rites that bind followers to secrets they cannot safely walk away from.",
    resources:
      "Devoted followers who genuinely believe, accumulated ritual knowledge, and sites already prepared for what comes next.",
    organisation:
      "Concentric circles of belief — most followers know only comforting half-truths; a small inner circle knows what the rites actually do.",
    territory:
      "A site made sacred by repetition rather than grandeur, its true purpose hidden behind an innocuous public use.",
    planStages: [
      "**Stage 1: Gather the first believers** — Recruit through genuine unmet need, not coercion. Clues: a new gathering, missing people who join willingly. Disruption exposes recruitment methods early.",
      "**Stage 2: Bind them with a shared secret** — Stage a rite that implicates every attendee. Clues: a strange symbol, a night no one will discuss. Undisrupted, loyalty deepens through complicity.",
      "**Stage 3: Prepare the site** — Ready the location for the culminating rite. Clues: unusual construction, sourced materials. Disruption forces a rushed, more exposed alternative site.",
      "**Stage 4: Remove the last outside witness** — Silence or convert whoever could still expose them. Clues: a sudden disappearance or conversion. This is the last stage stoppable quietly.",
      "**Stage 5: Perform the culminating rite** — Enact the ritual that fulfils the Ultimate Goal. Clues are now unmistakable — the site itself changes.",
      "**Stage 6: Consolidate what the rite unleashed** — Secure and direct whatever the ritual achieved before others can claim or contest it.",
    ],
  },
] as const;

/**
 * Local (non-AI) fallback. Deliberately lighter than the AI prompt's full
 * checklist — a usable, internally consistent draft rather than an attempt to
 * hand-author every section the prompt asks the model for.
 */
export function generateVillainLocal(
  options: VillainGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveVillain(options, rng);
  const flavor = pickFrom(DOMAIN_FLAVORS, rng);
  const lieutenantNames = [generateName(rng), generateName(rng)];
  const firstSign = pickFrom(FIRST_SIGNS_POOL, rng);
  const secondSign = pickFrom(
    FIRST_SIGNS_POOL.filter((s) => s !== firstSign),
    rng,
  );
  const signature = pickFrom(SIGNATURE_POOL, rng);

  const content = `### Public Face
To most of the world, ${resolved.villainName.split(",")[0]} is known only by reputation — the story people tell depends on how close they have come to the truth. In public record they are ${resolved.sympathy === "Purely Monstrous" ? "an openly feared threat, spoken of in warnings" : "a respected, even admired figure, whose true reach few suspect"}.

### Signature / Calling Card
${signature}

### First Signs
- ${firstSign}
- ${secondSign}`;

  const lore = `### Core Concept
A ${resolved.threatScale.toLowerCase()}-scale ${resolved.archetype.toLowerCase()} whose ${resolved.sympathy.toLowerCase()} motives make them a campaign engine rather than a final-dungeon obstacle — every stage of their plan gives the party something to discover and something to lose by waiting.

### True Nature
Behind the public face lies a deliberate, patient design: every visible action is one piece of a larger plan the world has not yet recognised as connected.

### Ultimate Goal
${resolved.villainName.split(",")[0]} wants to remake their sphere of influence into a state they alone control the terms of — not conquest for its own sake, but a specific, described order they believe is owed to them or the world.

### Why Now
A recent shift — a rival's death, a discovered resource, an expiring constraint — has removed the last obstacle that kept them from acting, forcing the timeline the campaign now begins inside.

### Motivation
Their reasoning holds together on its own terms: ${resolved.sympathy.toLowerCase()}, shaped by ${resolved.archetype.toLowerCase()} logic, and not merely villainy for its own sake.

### Fatal Flaw
They trust their own read of people more than the evidence in front of them, and that overconfidence is what eventually hands the party their opening.

### Methods
${flavor.methods}

### Resources
${flavor.resources}

### Lieutenants & Inner Circle
- **${lieutenantNames[0]}** — Enforcer. Loyal out of genuine belief, not fear; privately doubts one specific order they have not yet refused.
- **${lieutenantNames[1]}** — Fixer. Loyal only as long as it pays; keeps a private insurance policy against betrayal that could expose the whole operation.

### Organisation & Power Structure
${flavor.organisation}

### Territory / Lair
${flavor.territory}

### The Villain's Plan
${flavor.planStages.join("\n")}

### Escalation If Ignored
Left unopposed, each stage completes roughly on schedule; by Stage 4 the villain's position becomes semi-official, and by Stage 6 removing them creates as much damage as leaving them would have.

### Discovery Layers
**What the World Knows**: the public face and its official version of events.
**What Their Servants Know**: the existence of the plan's broad shape, though rarely its final goal.
**GM-Only Truth**: the full plan, the true nature, and the specific mechanism of the fatal flaw.

### Personal Connections
- A party member's mentor once worked for or against this villain.
- The villain's rise directly caused a hardship in a PC's backstory.
- The villain has, knowingly or not, made use of something a PC once did.

### Weakness / Vulnerability
Their trusted inner circle is smaller than it appears, and turning even one member against them collapses their information advantage.

### Moral Complication
Removing them cleanly may not resolve the underlying condition that let them rise — their departure risks a succession struggle among those they leveraged into power.

### Final Confrontation
The stakes extend beyond the villain's own life — whatever mechanism completes Stage 6 needs to be addressed independently of whether the villain personally survives it.

### If Defeated
Their network does not vanish with them: expect a contested succession, those they held sway over left to fend for themselves, and at least one lieutenant left to pursue their own agenda.`;

  return {
    type: "character",
    title: resolved.villainName,
    summary: "",
    content,
    lore,
    labels: ["villain", "bbeg-generator", "imported-draft"],
    status: "active",
    conflictDomain: flavor.domain,
  };
}
