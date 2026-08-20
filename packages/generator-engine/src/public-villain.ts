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
  // The villain's fundamental relationship to the status quo — a structural
  // axis distinct from archetype (their profession/method) and sympathy
  // (how understandable they are). Without this being an explicit choice,
  // AI generation kept defaulting to a Reformer/Guardian "institutions have
  // failed, I must take control" framing regardless of other options (#2325
  // follow-up).
  worldRelations: [
    "Random",
    "Predator",
    "Reformer",
    "Guardian",
    "Destroyer",
    "Prophet",
    "Competitor",
    "Escapee",
    "Creator",
    "Avenger",
    "Curator",
    "Revealer",
    "Servant",
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
  worldRelation?: string;
  campaignContext?: string;
}

export interface ResolvedVillain {
  genre: string;
  tone: string;
  threatScale: string;
  archetype: string;
  sympathy: string;
  worldRelation: string;
  campaignContext?: string;
  villainName: string;
}

/** Definitions embedded in the prompt so the model treats each relation as a distinct structural choice, not just a label. */
export const WORLD_RELATION_DEFINITIONS: Record<string, string> = {
  Predator:
    "wants to exploit the existing system for personal gain, and needs it to keep functioning so they can keep feeding off it — not overthrow it",
  Reformer:
    "wants to replace the existing system entirely with a different order they believe is better",
  Guardian:
    "is willing to commit atrocities to preserve or protect something they believe is under existential threat",
  Destroyer:
    "wants the existing order gone, with no coherent replacement in mind — the goal is the ending itself, not what comes after",
  Prophet:
    "believes a transformation or reckoning is inevitable and is hastening or preparing the world for it, not choosing to cause it out of ambition",
  Competitor:
    "is driven by rivalry with one specific person or power, not by any grievance with the system itself",
  Escapee:
    "wants out of their situation or obligations, regardless of what collateral damage that costs everyone else",
  Creator:
    "is trying to build something that has never existed before, and the plan exists to make that possible",
  Avenger:
    "wants a specific debt repaid against those they hold responsible for a specific wrong",
  Curator:
    "wants to freeze society, or one part of it, in its current preferred state and prevent any further change",
  Revealer:
    "wants to expose a truth the world is not equipped to survive learning",
  Servant:
    "is fulfilling an obligation or directive to something or someone else, and is not acting on a personal agenda",
};

function resolvePick(
  requested: string | undefined,
  options: readonly string[],
  rng: Rng,
): string {
  const real = options.filter((o) => o !== "Random");
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
    archetype: resolvePick(options.archetype, villainConfig.archetypes, rng),
    sympathy: options.sympathy || pickFrom(villainConfig.sympathyLevels, rng),
    worldRelation: resolvePick(
      options.worldRelation,
      villainConfig.worldRelations,
      rng,
    ),
    campaignContext: options.campaignContext?.trim() || undefined,
    villainName: `${generateName(rng)}, ${pickFrom(villainConfig.epithets, rng)}`,
  };
}

export interface VillainPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedVillain;
}

const MOTIF_VARIETY_GUARDRAIL = `Avoid repeatedly expressing the villain's theme through the same symbolic object, image, or vocabulary across sections (e.g. reusing one motif for Signature/Calling Card, Territory/Lair, Methods, and Weakness alike). Once a motif is established in one field, subsequent fields must reveal a different dimension of the villain rather than restating the same image in new words.`;

const CONSISTENCY_PASS = `Before returning, run a consistency pass: no single symbolic motif, object, or turn of phrase should be reused verbatim or near-verbatim across more than one of Signature/Calling Card, Territory/Lair, Methods, Resources, and Weakness/Vulnerability — each of these must add new information rather than re-describing the same image; the multi-stage plan must escalate logically stage-to-stage and remain usable even if a stage is disrupted early (state how disruption changes later stages); the stated weakness must connect coherently to the fatal flaw, methods, or organisation rather than being an unrelated add-on; every lieutenant's stated loyalty and motivation must not contradict the organisation/power structure described elsewhere; and the selected threat scale must be reflected consistently across resources, methods, and the plan's scope — do not describe cosmic-scale resources for a Local-scale villain or vice versa.`;

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
- World Relation: ${resolved.worldRelation} — this villain ${WORLD_RELATION_DEFINITIONS[resolved.worldRelation]}. This is the villain's FUNDAMENTAL relationship to the status quo and MUST shape 'Ultimate Goal', 'Motivation', and 'Why Now' directly — do not default to a Reformer/Guardian "the existing institutions have failed, I must take control" framing unless World Relation is literally Reformer or Guardian. A Predator's goal preserves the system it feeds on; a Destroyer's goal has no replacement order in mind; an Escapee's goal is to leave, not to rule; a Servant's goal belongs to whoever or whatever they serve, not to them personally — and so on for each relation.
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
${MOTIF_VARIETY_GUARDRAIL}
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
 * Ultimate Goal / Motivation fragments per World Relation, so the local
 * fallback's goal text actually varies by structural relationship to the
 * world instead of always reading as a Reformer/Guardian "institutions have
 * failed, I must take control" story regardless of options (#2325 follow-up).
 */
const RELATION_FLAVORS: Record<
  string,
  { ultimateGoal: string; motivation: string }
> = {
  Predator: {
    ultimateGoal:
      "wants the current system left standing but quietly rigged so it keeps producing exactly what they need, for as long as they need it — the system is the resource, not the obstacle.",
    motivation:
      "sees no reason to change what works for them, only to protect their access to it from anyone who might notice.",
  },
  Reformer: {
    ultimateGoal:
      "wants to dismantle the current order and replace it with a specific, described alternative they believe is genuinely better, whatever it costs to install.",
    motivation:
      "is convinced the existing institutions have already failed everyone who depends on them, and that replacing them is the only honest option left.",
  },
  Guardian: {
    ultimateGoal:
      "wants whatever they are protecting kept safe permanently, even if the methods required to guarantee that safety are themselves the campaign's real threat.",
    motivation:
      "believes the thing they protect would already be gone without the atrocities they have committed, and that the trade was worth it.",
  },
  Destroyer: {
    ultimateGoal:
      "wants the current order gone entirely, with no coherent plan for what replaces it — ending it is the goal, not what follows.",
    motivation:
      "has stopped believing the current order can be reformed or is worth preserving in any form.",
  },
  Prophet: {
    ultimateGoal:
      "wants the world prepared for a transformation they believe is already inevitable, so that when it arrives, they and theirs are the ones who understood it first.",
    motivation:
      "is not choosing this out of ambition — they are certain the change is coming regardless, and acting accordingly.",
  },
  Competitor: {
    ultimateGoal:
      "wants to decisively beat one specific rival, on terms that rival cannot dispute — the wider world is collateral, not the point.",
    motivation:
      "is driven by a rivalry that has nothing to do with the system itself and everything to do with one person or power they need to surpass.",
  },
  Escapee: {
    ultimateGoal:
      "wants out of an obligation, debt, or identity permanently, whatever collateral damage that costs the people left behind.",
    motivation:
      "no longer cares what happens to the system they are escaping, only that they are gone from it for good.",
  },
  Creator: {
    ultimateGoal:
      "wants to bring something into existence that has never existed before, and the entire plan exists to make that one act of creation possible.",
    motivation:
      "is driven by the thing they are building, not by grievance against anything that already exists.",
  },
  Avenger: {
    ultimateGoal:
      "wants a specific debt repaid in full by those they hold personally responsible, and will accept nothing that falls short of that reckoning.",
    motivation: "has never stopped counting exactly what is owed, and to whom.",
  },
  Curator: {
    ultimateGoal:
      "wants society, or one part of it, frozen permanently in its current preferred state, with every further change treated as a threat to be stopped.",
    motivation:
      "believes the present arrangement is the best it will ever be, and that change from here can only be loss.",
  },
  Revealer: {
    ultimateGoal:
      "wants a specific truth exposed to everyone, certain that the world's reaction to learning it will reshape everything that follows.",
    motivation:
      "believes concealment has done more damage than the truth itself ever could.",
  },
  Servant: {
    ultimateGoal:
      "is carrying out the will of something or someone else exactly as directed, and the goal belongs to that master, not to them personally.",
    motivation:
      "is bound by an obligation they did not choose to question, only to fulfil.",
  },
};

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
  const relationFlavor = RELATION_FLAVORS[resolved.worldRelation];
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
A ${resolved.threatScale.toLowerCase()}-scale ${resolved.archetype.toLowerCase()}, and at heart a ${resolved.worldRelation.toLowerCase()}, whose ${resolved.sympathy.toLowerCase()} motives make them a campaign engine rather than a final-dungeon obstacle — every stage of their plan gives the party something to discover and something to lose by waiting.

### True Nature
Behind the public face lies a deliberate, patient design: every visible action is one piece of a larger plan the world has not yet recognised as connected.

### Ultimate Goal
${resolved.villainName.split(",")[0]} ${relationFlavor.ultimateGoal}

### Why Now
A recent shift — a rival's death, a discovered resource, an expiring constraint — has removed the last obstacle that kept them from acting, forcing the timeline the campaign now begins inside.

### Motivation
As a ${resolved.worldRelation.toLowerCase()}, they ${relationFlavor.motivation} Their reasoning holds together on its own terms: ${resolved.sympathy.toLowerCase()}, shaped by ${resolved.archetype.toLowerCase()} methods.

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
