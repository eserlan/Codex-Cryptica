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

export function buildVillainPrompt(
  options: VillainGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
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
  "content": "Player/table-facing markdown (what the party can plausibly learn without metagaming) with these sections: '### Public Face' (what the wider world believes about them — tyrant, philanthropist, legend, or supposedly nonexistent threat), '### Signature / Calling Card' (a recurring motif, tactic, or trace that lets players recognise their influence before meeting them), '### First Signs' (several concrete, indirect early clues the campaign can reveal, e.g. strange orders, missing people, unusual movements — not the villain appearing personally).",
  "lore": "GM-only markdown (use exactly these '###' headings, in this order): '### Core Concept' (what makes this antagonist distinctive and campaign-worthy, one concise paragraph), '### True Nature' (what the GM knows that the world does not), '### Ultimate Goal' (a concrete desired end state — never a vague objective like 'gain power' or 'conquer the world'; explain what the world looks like when they have won), '### Why Now' (what changed recently that makes the villain act now, explaining why the campaign begins at this moment), '### Motivation' (an internally coherent reason for pursuing the goal, from the villain's own perspective), '### Fatal Flaw' (a weakness that affects behaviour, not decorative trivia), '### Methods' (how they actually advance their agenda), '### Resources' (what gives them power), '### Lieutenants & Inner Circle' (2-4 named subordinates, each as a bullet with role, relationship to the villain, personal motivation, degree of loyalty, and a vulnerability/secret/independent agenda — write these so each is usable later as a linked Character), '### Organisation & Power Structure' (how their power functions around them), '### Territory / Lair' (where they operate from and why it matters — avoid an isolated fortress by default), '### The Villain's Plan' (5-7 escalating numbered stages as '**Stage N: <name>**' sub-entries; each stage covers its objective, what the villain/agents do, clues available to players, factions or NPCs involved, consequences if successful, opportunities for player interference, and how disruption changes later stages), '### Escalation If Ignored' (how the situation develops if the party never intervenes), '### Discovery Layers' (three sub-parts: 'What the World Knows', 'What Their Servants Know', 'GM-Only Truth'), '### Personal Connections' (several optional hooks tying the villain to PCs without assuming backstory, e.g. former mentor, destroyed homeland, ideological rival), '### Weakness / Vulnerability' (at least one meaningful vulnerability discoverable and exploitable through play, not a single arbitrary object unless genre-appropriate), '### Moral Complication' (where appropriate, a reason defeating the villain does not cleanly solve the problem), '### Final Confrontation' (likely circumstances and stakes — not combat statistics), '### If Defeated' (consequences of removing the villain, appropriate to the threat scale).",
  "labels": ["villain", "bbeg-generator", "imported-draft"]
}
Quality guardrails: the villain should do things, not merely possess lore. Avoid generic evil-for-evil's-sake, avoid defaulting every villain to a misunderstood antihero, avoid every secret being 'serving an even bigger evil', avoid every organisation being a cult, avoid every goal being apocalypse/immortality/godhood unless the archetype specifically calls for it. Ensure goals, methods, resources, lieutenants, and plan stages logically reinforce one another, and that clues arise naturally from the villain's own actions.
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
 * Local (non-AI) fallback. Deliberately lighter than the AI prompt's full
 * checklist — a usable, internally consistent draft rather than an attempt to
 * hand-author every section the prompt asks the model for.
 */
export function generateVillainLocal(
  options: VillainGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveVillain(options, rng);
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
${resolved.archetype} tactics — a mix of leverage, infiltration, and applied pressure suited to a ${resolved.threatScale.toLowerCase()} stage, always favouring control over spectacle.

### Resources
Loyal agents, accumulated leverage over key figures, and a base of operations that gives them room to operate without immediate scrutiny.

### Lieutenants & Inner Circle
- **${lieutenantNames[0]}** — Enforcer. Loyal out of genuine belief, not fear; privately doubts one specific order they have not yet refused.
- **${lieutenantNames[1]}** — Fixer. Loyal only as long as it pays; keeps a private insurance policy against betrayal that could expose the whole operation.

### Organisation & Power Structure
A tight inner circle radiating outward into looser, deniable layers of agents, so the villain's name rarely touches the actions taken in their service.

### Territory / Lair
A working base of operations hidden inside something legitimate, chosen so that raiding it means disrupting whatever it hides behind.

### The Villain's Plan
**Stage 1: Secure the leverage** — Acquire the first piece of concrete power (a hold over a person, place, or resource). Clues: irregular orders, a disappearance. Consequence if unchecked: the leverage becomes permanent and harder to contest.
**Stage 2: Install the proxy** — Place a loyal or compromised figure in a position of visible authority. Clues: an unlikely appointment, an old ally suddenly silent. Interference here removes their public cover early.
**Stage 3: Manufacture the pretext** — Engineer a crisis that justifies further consolidation. Clues: a conveniently timed disaster. If disrupted, the villain must improvise a cruder, more exposed pretext.
**Stage 4: Consolidate under cover of the crisis** — Use emergency powers or fear to remove remaining opposition. Clues: sudden law changes, arrests. Undisrupted, opposition is dismantled cleanly.
**Stage 5: Eliminate the last check** — Move against whoever could still stop them cleanly. Clues: a threat against a specific named figure. This is the last stage that can be stopped before the plan becomes self-sustaining.
**Stage 6: Execute the endgame** — Enact the final act that fulfils the Ultimate Goal. Clues are now unmistakable, but resources to stop it are scarce.

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
Their network does not vanish with them: expect a contested succession, freed leverage victims, and at least one lieutenant left to pursue their own agenda.`;

  return {
    type: "character",
    title: resolved.villainName,
    summary: "",
    content,
    lore,
    labels: ["villain", "bbeg-generator", "imported-draft"],
    status: "active",
  };
}
