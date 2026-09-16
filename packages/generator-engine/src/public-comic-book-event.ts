/**
 * Public Comic Book Event generator (#3114, part of the Superhero / Comic
 * Book epic, #2288).
 *
 * Produces a campaign-scale superhero event — the kind of crossover-tier
 * crisis a comic-book campaign builds an arc around (alien invasion, reality
 * fracture, hero civil war, and so on) — with a clearly separated premise,
 * a staged escalation the table can discover and intervene in, and, per the
 * epic's key design constraint, CONCRETE campaign consequences that persist
 * after the climax rather than a purely flashy premise that resets to status
 * quo. This generator is inherently and only Superhero / Comic Book genre —
 * it has no `genre` option and does not use the multi-genre theme selector
 * (add-generator skill Part C is explicitly out of scope here).
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import {
  asArray,
  asRecord,
  asString,
  parseFencedJson,
} from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";
import {
  SUPERHERO_POWER_SCALES,
  SUPERHERO_POWER_SCALE_HINTS,
  type SuperheroPowerScale,
} from "./superhero-power-scale";

export const comicBookEventConfig = {
  eventTypes: [
    "Random",
    "Alien Invasion",
    "Reality Fracture",
    "Registration / Political Crisis",
    "Hero Civil War",
    "Cosmic Threat",
    "Mass Disappearance",
    "Timeline Rewrite",
    "Super-Prison Breakout",
    "Secret Invasion",
    "Fallen / Corrupted Hero",
  ],
  // A Comic Book Event is inherently campaign-scale — Street/City-level
  // threats are what the Villain or Quest generators are for. Restricted to
  // the upper four rungs of the shared Superhero Power Scale (#3103) rather
  // than inventing a bespoke scale, per the add-generator skill guidance.
  scales: SUPERHERO_POWER_SCALES.filter(
    (s) => s !== "Street" && s !== "City",
  ) as readonly SuperheroPowerScale[],
  tones: ["Epic", "Grim", "Hopeful", "Paranoid", "Tragic", "Satirical"],
};

export interface ComicBookEventGeneratorOptions {
  eventType?: string;
  scale?: string;
  tone?: string;
  campaignContext?: string;
}

export interface ResolvedComicBookEvent {
  eventType: string;
  scale: string;
  tone: string;
  campaignContext?: string;
  eventName: string;
}

const CODE_NAMES = [
  "Zero Hour",
  "Blackout Protocol",
  "Last Signal",
  "Fracture Point",
  "Dead Reckoning",
  "Long Night",
  "Broken Sky",
  "Silent Front",
  "Final Warning",
  "Point of No Return",
  "Convergence Protocol",
  "Ground Zero",
] as const;

function resolvePick(
  requested: string | undefined,
  options: readonly string[],
  rng: Rng,
): string {
  const real = options.filter((o) => o !== "Random");
  if (!requested || requested === "Random") return pickFrom(real, rng);
  return requested;
}

function resolveComicBookEvent(
  options: ComicBookEventGeneratorOptions,
  rng: Rng,
): ResolvedComicBookEvent {
  return {
    eventType: resolvePick(
      options.eventType,
      comicBookEventConfig.eventTypes,
      rng,
    ),
    scale: options.scale || pickFrom(comicBookEventConfig.scales, rng),
    tone: options.tone || pickFrom(comicBookEventConfig.tones, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    eventName: pickFrom(CODE_NAMES, rng),
  };
}

export interface ComicBookEventPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedComicBookEvent;
}

const CONSEQUENCES_GUARDRAIL = `Every item under 'Lasting Consequences' must be a concrete, specific, permanent change to the campaign world — a location destroyed or altered, a public institution's trust broken, a hero publicly unmasked, a new law or political reality, a person or status quo permanently changed — stated specifically enough that a GM could reference it three sessions later. Do not write a vague resolution such as "the city was saved", "life returned to normal", or "the heroes prevailed" as the sole content of a consequence — these are explicitly forbidden.`;

const CONSISTENCY_PASS = `Before returning, run a consistency pass: the declared Scale must be reflected consistently across Public Response, How It Unfolds, and Lasting Consequences — do not describe Multiversal-level stakes for a National-scale event, or vice versa; each Lasting Consequence must be concrete and campaign-persistent, never a restatement that things returned to normal; the True Cause must be consistent with, not contradict, what is shown in How It Unfolds; and every Campaign Hook must connect directly to an unresolved thread from True Cause or Lasting Consequences rather than being generic.`;

const CUSTOM_SCALE_HINT =
  "a campaign-scale reach defined by the custom scale you provided.";

export function buildComicBookEventPrompt(
  options: ComicBookEventGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): ComicBookEventPrompt {
  const resolved = resolveComicBookEvent(options, rng);
  const scaleHint =
    SUPERHERO_POWER_SCALE_HINTS[resolved.scale as SuperheroPowerScale] ??
    CUSTOM_SCALE_HINT;

  const userMessage = `Generate a campaign-scale Superhero / Comic Book Event in JSON format. This is a large, crossover-tier crisis a superhero campaign builds an arc around — not a single villain's scheme. British English. System-neutral (no game-system mechanics or stat blocks). Original event concept only — do not imitate or rename any existing published comic-book crossover event, storyline, or title.
Options:
- Event Type: ${resolved.eventType}
- Scale: ${resolved.scale} — ${scaleHint}
- Tone: ${resolved.tone}
${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "An evocative event code-name or title (3-6 words), not copied from any existing comic-book crossover",
  "content": "Player/table-facing markdown (what the party can plausibly learn without metagaming) with these sections: '### The Event' (the premise / inciting incident — the specific moment the event becomes undeniable), '### Public Response' (how media, authorities, and other heroes visibly react in the first hours and days), '### How It Unfolds' (3-5 escalating numbered stages as '**Stage N: <name>**' sub-entries, each a player-visible beat the table can witness or intervene in).",
  "lore": "GM-only markdown (use exactly these '###' headings, in this order): '### True Cause' (what is actually behind the event, which the public does not know), '### The Climax' (how the event's central confrontation resolves, and at what cost), '### Lasting Consequences' (3-5 bullet points — see the guardrail below), '### Campaign Hooks' (2-4 concrete hooks tying the event's unresolved threads to future sessions).",
  "labels": ["comic-book-event", "superhero-event-generator", "imported-draft"]
}
${CONSEQUENCES_GUARDRAIL}
${CONSISTENCY_PASS}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed superhero / comic-book campaign events in JSON format.",
    userMessage,
    resolved,
  };
}

function validateRequiredSections(
  markdown: string,
  headings: readonly string[],
  fieldName: string,
): void {
  const lines = markdown.split(/\r?\n/);
  let headingIndex = 0;
  let bodyLines: string[] = [];
  let sawHeading = false;

  const finishSection = () => {
    if (sawHeading && !bodyLines.join("\n").trim()) {
      throw new Error(
        `Comic book event response has an empty ${fieldName} section.`,
      );
    }
  };

  for (const line of lines) {
    const heading = /^(###)\s+(.+?)\s*$/.exec(line);
    if (heading) {
      finishSection();
      const expected = headings[headingIndex];
      if (heading[2] !== expected) {
        throw new Error(
          `Comic book event response has an invalid ${fieldName} section order.`,
        );
      }
      headingIndex += 1;
      bodyLines = [];
      sawHeading = true;
      continue;
    }

    if (!sawHeading && line.trim()) {
      throw new Error(
        `Comic book event response has text before ${fieldName} sections.`,
      );
    }
    bodyLines.push(line);
  }

  finishSection();
  if (headingIndex !== headings.length) {
    throw new Error(
      `Comic book event response is missing a ${fieldName} section.`,
    );
  }
}

export function parseComicBookEventResponse(
  text: string,
  resolved: ResolvedComicBookEvent,
): PublicGeneratorOutput {
  const data = asRecord(parseFencedJson<unknown>(text));
  const content = asString(data.content).trim();
  const lore = asString(data.lore).trim();
  if (!content || !lore) {
    throw new Error(
      "Comic book event response must contain content and lore strings.",
    );
  }
  validateRequiredSections(
    content,
    ["The Event", "Public Response", "How It Unfolds"],
    "content",
  );
  validateRequiredSections(
    lore,
    ["True Cause", "The Climax", "Lasting Consequences", "Campaign Hooks"],
    "lore",
  );

  const labels = asArray(data.labels)
    .filter((label): label is string => typeof label === "string")
    .map((label) => label.trim())
    .filter(Boolean);

  return {
    type: "event",
    title: asString(data.title).trim() || resolved.eventName,
    summary: asString(data.summary).trim(),
    content,
    lore,
    labels:
      labels.length > 0
        ? labels
        : ["comic-book-event", "superhero-event-generator", "imported-draft"],
    status: "active",
  };
}

interface EventTypeFlavor {
  premise: string;
  publicResponse: string;
  trueCause: string;
  climax: string;
  consequences: readonly [string, string, string];
  hooks: readonly [string, string];
}

/**
 * Original, per-event-type content. Concrete on purpose — every consequence
 * is a specific, permanent change (a place, an institution, a person), never
 * "the city was saved" or "life returned to normal" (#3114's key design
 * constraint, per the #2288 epic).
 */
const EVENT_TYPE_FLAVORS: Record<string, EventTypeFlavor> = {
  "Alien Invasion": {
    premise:
      "Formation-flying craft breach the atmosphere in daylight, broadcasting a demand for surrender before the first shot is fired.",
    publicResponse:
      "Governments issue evacuation orders while every network loops the same few minutes of invasion footage.",
    trueCause:
      "The 'invasion fleet' is a forward scouting cell testing planetary defences for a much larger colonisation authority, and its commander privately doubts the campaign is winnable.",
    climax:
      "The scouts are driven off-world, but not before landing a listening outpost that nobody has found yet.",
    consequences: [
      "{{LOCATION}} loses its skyline: several city blocks remain a fenced crater the government still calls a 'reconstruction zone'.",
      "A standing planetary-defence treaty is ratified, giving a new multinational agency legal authority to detain any metahuman it deems a security risk.",
      "First contact is now public record — every later alien encounter is judged against what people saw that day.",
    ],
    hooks: [
      "The undiscovered listening outpost is quietly feeding fleet intelligence to a third party.",
      "A surviving alien scout has defected and needs protection from both governments and its own kind.",
    ],
  },
  "Reality Fracture": {
    premise:
      "Without warning, several city blocks phase through alternate versions of themselves within the space of an hour, colliding architecture, people, and history.",
    publicResponse:
      "The affected zone is cordoned off as a 'localised phenomenon' while survivors from at least one alternate timeline are quietly relocated and given new papers.",
    trueCause:
      "An experimental stabiliser meant to contain a single reality-warping artifact instead punched a temporary seam between adjacent realities, and the seam has not fully closed.",
    climax:
      "The seam is sealed, but not before several thousand people and structures are permanently swapped between realities.",
    consequences: [
      "{{LOCATION}}'s municipal records now describe a street grid that only partially matches the physical one, and city planners have quietly stopped trying to reconcile them.",
      "A population of several hundred displaced alternate-reality residents now lives in this world permanently, with no legal path home and an unresolved citizenship status.",
      "The stabiliser technology is classified, but at least one duplicate device is unaccounted for.",
    ],
    hooks: [
      "One displaced resident is the alternate version of an existing character.",
      "A black-market broker is smuggling people back and forth through a residual weak point in the seam.",
    ],
  },
  "Registration / Political Crisis": {
    premise:
      "A registration act requiring every superhuman to disclose their identity and submit to state oversight clears the legislature after a single catastrophic public incident tips opinion overnight.",
    publicResponse:
      "News coverage splits cleanly along a for/against line, and registration checkpoints open in every major city within the month.",
    trueCause:
      "The incident that tipped the vote was engineered by a lobbying concern that profits from the registration infrastructure contract, and the 'independent' polling behind the bill was paid for.",
    climax:
      "The act passes into law; the question shifts from whether it happens to who complies, who resists, and who is made an example of.",
    consequences: [
      "A standing enforcement division now has legal authority to compel unmasking, and its first several high-profile arrests are already public record.",
      "At least one previously public hero is unmasked during processing, and their civilian identity is now a matter of government file.",
      "A visible resistance movement of unregistered supers has formed, permanently splitting what used to be one loosely-aligned hero community into two factions that no longer fully trust each other.",
    ],
    hooks: [
      "The engineered incident's true architect still profits from the enforcement contract.",
      "A registered hero is quietly leaking watchlist data to the resistance.",
    ],
  },
  "Hero Civil War": {
    premise:
      "Two coalitions of established heroes take opposing, irreconcilable public positions on the same crisis, and a confrontation between them causes real, visible collateral damage.",
    publicResponse:
      "Footage of heroes fighting heroes dominates every channel, and public confidence in 'the heroes' as a single trustworthy institution visibly cracks.",
    trueCause:
      "The dispute itself was real, but its escalation to open violence was quietly encouraged by a third party who profits from a divided, weakened hero community.",
    climax:
      "A ceasefire is brokered, but not before at least one prominent hero is killed, imprisoned, or forced into permanent retirement by the fallout.",
    consequences: [
      "The two coalitions maintain separate, sometimes competing headquarters and chains of command going forward — there is no return to one unified hero community.",
      "A major hero team permanently loses a founding member, changing who the public and other heroes turn to first in a crisis.",
      "Public trust in super-powered self-governance drops sharply, giving political cover to registration or oversight proposals that had failed to gain traction before.",
    ],
    hooks: [
      "The third-party instigator is still active and has a new target in mind.",
      "A hero who fought on the losing side now operates outside either coalition's sanction.",
    ],
  },
  "Cosmic Threat": {
    premise:
      "A signal, herald, or omen arrives well ahead of the actual threat, giving the world weeks to watch a cosmic-scale danger approach with no way to stop it arriving.",
    publicResponse:
      "Space agencies confirm the object or signal is real; public reaction ranges from panic-buying to religious revival to flat denial.",
    trueCause:
      "The threat is not conquest but consumption or collection — the world is a resource, not an enemy, and its total indifference is what makes negotiation impossible.",
    climax:
      "The threat is turned aside or destroyed at enormous cost, using power or knowledge the world did not previously know it had access to.",
    consequences: [
      "The method used to survive the threat — a weapon, a ritual, a technology — is now known to exist, and multiple governments and factions want it replicated or controlled.",
      "{{LOCATION}} carries a permanent physical scar from the confrontation — a crater, a frozen zone, a patch of visibly altered sky — that never fully fades.",
      "First contact with the cosmic scale changes public cosmology permanently: people now know, with certainty, that the world is not alone and not safe by default.",
    ],
    hooks: [
      "A fragment of the threat survived and is quietly growing somewhere unmonitored.",
      "Whoever controls the survival method is already planning to use it offensively.",
    ],
  },
  "Mass Disappearance": {
    premise:
      "Without warning, a specific population — a fraction of the world's supers, a city's population, a single demographic — vanishes in the same instant, leaving only their belongings behind.",
    publicResponse:
      "The disappearance dominates every channel; grief, conspiracy theories, and opportunism all spike simultaneously.",
    trueCause:
      "The missing were not destroyed but relocated or preserved somewhere specific and findable, by an actor with a real, if unsympathetic, reason for taking them.",
    climax:
      "Most of the missing are recovered, but the recovery is neither clean nor complete.",
    consequences: [
      "A meaningful fraction of the missing are never recovered, and their families now live with permanent, legally unresolved uncertainty rather than closure.",
      "The recovered survivors share a consistent, verifiable account of where they were, which the public and press now treat as unimpeachable testimony about who was responsible.",
      "Institutions built to fill the gap the missing left behind — replacement hires, emergency legislation, new memorial observances — do not fully unwind once people return, and now sit awkwardly alongside them.",
    ],
    hooks: [
      "One recovered survivor is quietly lying about what they saw.",
      "The actor responsible is still holding a smaller group back as leverage.",
    ],
  },
  "Timeline Rewrite": {
    premise:
      "History visibly changes around a population that remembers the old version — a war that never happened is suddenly common knowledge, or someone long dead is alive and in power.",
    publicResponse:
      "Most of the world adjusts instantly and without noticing; only a small population retains memory of the 'original' timeline and is quietly regarded as delusional.",
    trueCause:
      "A deliberate change was made to a single pivotal event, and the ripple has not finished propagating — further changes are still occurring around its edges.",
    climax:
      "The timeline is restored, stabilised, or deliberately left changed — but either way, the population who remembered the old version keeps their memories.",
    consequences: [
      "A population who remembers the old timeline now lives permanently alongside people who don't, with relationships, careers, and legal identities that no longer fully make sense to either side.",
      "At least one person who was dead in the original timeline is now alive (or vice versa), and their continued existence has downstream consequences the setting has not yet worked out.",
      "The mechanism that caused the rewrite is now known to be possible, and someone is already trying to work out how to trigger it deliberately again.",
    ],
    hooks: [
      "A player character or major NPC remembers a version of events nobody else does.",
      "The original architect of the rewrite considers it unfinished business.",
    ],
  },
  "Super-Prison Breakout": {
    premise:
      "The facility built specifically to hold the world's most dangerous supers fails all at once, and every inmate is loose within the hour.",
    publicResponse:
      "Media coverage treats it as an unqualified disaster; the facility's operator insists publicly that containment will be restored 'imminently'.",
    trueCause:
      "The breakout was not an accident — it was engineered from outside by someone who needed one specific inmate free, using the chaos of a mass breakout as cover.",
    climax:
      "Most escapees are recaptured or neutralised, but the response reveals just how thin the margin between 'contained' and 'catastrophic' really was.",
    consequences: [
      "At least one dangerous escapee is never recaptured and is now operating at large, their location unknown.",
      "The facility's failure becomes the public justification for a much harsher, more invasive containment doctrine applied to every super-prisoner afterward.",
      "The facility's operator, public agency or private contractor, is permanently discredited, and a new, less accountable operator takes over containment going forward.",
    ],
    hooks: [
      "The one inmate the breakout was actually engineered to free hasn't resurfaced yet.",
      "A recaptured escapee is willing to name who orchestrated the breakout, for a price.",
    ],
  },
  "Secret Invasion": {
    premise:
      "Trusted figures — heroes, officials, loved ones — are gradually revealed to have been replaced or infiltrated by an undetectable enemy, and nobody can prove who is still themselves.",
    publicResponse:
      "Once the infiltration becomes public, ordinary trust becomes structurally impossible; verification rituals and loyalty tests become part of daily public life.",
    trueCause:
      "The infiltration has been in place far longer than anyone suspects, and several 'exposed' infiltrators were sacrificed deliberately to make the remaining, deeper infiltration look fully cleared.",
    climax:
      "The visible infiltration is exposed and purged, but confidence that it is truly over never fully returns.",
    consequences: [
      "At least one trusted, previously unquestioned figure is confirmed to have been replaced for an extended, specific period, and every decision they made during that window is now suspect and subject to review.",
      "A permanent verification protocol, biometric, magical, or otherwise, becomes standard practice among institutions that can afford it, changing how business and government function going forward.",
      "The deeper, unexposed layer of infiltration remains in place, its cover strengthened rather than weakened by the public purge.",
    ],
    hooks: [
      "A trusted contact is one of the still-undiscovered infiltrators.",
      "The 'proof' used to clear someone during the purge was itself planted by the deeper infiltration.",
    ],
  },
  "Fallen / Corrupted Hero": {
    premise:
      "One of the world's most trusted heroes commits a public act of violence or betrayal that cannot be explained away, live in front of witnesses.",
    publicResponse:
      "The footage is inescapable; public grief and public rage arrive simultaneously, often aimed at each other as much as at the fallen hero.",
    trueCause:
      "The hero was compromised — corrupted by an outside influence, broken by an accumulation of unaddressed trauma, or acting on information the public doesn't have — rather than simply having 'turned evil' outright.",
    climax:
      "The hero is stopped, redeemed, or destroyed, but the act itself cannot be undone and the trust it broke does not fully return.",
    consequences: [
      "The hero's former team or organisation permanently restructures its oversight and vetting, treating the incident as proof that self-governance failed.",
      "At least one victim of the hero's act — a person harmed, a location destroyed, an ally betrayed — remains permanently and visibly affected, and refuses to accept any resolution as sufficient.",
      "Public trust in heroism as a category, not just in the one hero, measurably drops, and a wave of previously private scepticism about supers becomes openly mainstream.",
    ],
    hooks: [
      "The outside influence responsible has not been identified or stopped, and could compromise someone else next.",
      "The hero survived and is trying, unsuccessfully, to earn back a trust that isn't fully recoverable.",
    ],
  },
};

function customEventFlavor(eventType: string): EventTypeFlavor {
  const label = eventType.trim();
  return {
    premise: `The ${label.toLowerCase()} becomes undeniable when its first public consequence cannot be contained or explained away.`,
    publicResponse: `Authorities and the hero community disagree about how to respond to the ${label.toLowerCase()}, while public attention turns every new development into a crisis.`,
    trueCause: `The ${label.toLowerCase()} was set in motion by an actor whose immediate objective is only the first step in a larger plan, and the evidence is still being deliberately obscured.`,
    climax: `The ${label.toLowerCase()} is contained at a cost that leaves the campaign permanently changed, while the force behind it keeps one advantage in reserve.`,
    consequences: [
      `The ${label.toLowerCase()} leaves a permanent physical or institutional mark that changes how ${label.toLowerCase()}-scale threats are handled.`,
      `A person, organisation, or public assumption central to the ${label.toLowerCase()} is permanently changed and cannot simply return to its former role.`,
      `The evidence left behind makes the ${label.toLowerCase()} a continuing political or social fact, not an incident that can be forgotten after the climax.`,
    ],
    hooks: [
      `The actor who set the ${label.toLowerCase()} in motion is still pursuing the next step of the plan.`,
      `Someone who profited from the ${label.toLowerCase()} is trying to suppress the evidence that would expose them.`,
    ],
  };
}

/**
 * Local (non-AI) fallback. Deliberately lighter than the AI prompt's full
 * checklist — a usable, internally consistent draft rather than an attempt to
 * hand-author every section the prompt asks the model for.
 */
export function generateComicBookEventLocal(
  options: ComicBookEventGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveComicBookEvent(options, rng);
  const knownFlavor = EVENT_TYPE_FLAVORS[resolved.eventType];
  const flavorKey = knownFlavor ? resolved.eventType : "Custom Event";
  const flavor = knownFlavor ?? customEventFlavor(resolved.eventType);
  const location = `${generateName(rng)} City`;
  const fill = (s: string) => s.replaceAll("{{LOCATION}}", location);
  const scaleHint =
    SUPERHERO_POWER_SCALE_HINTS[resolved.scale as SuperheroPowerScale] ??
    CUSTOM_SCALE_HINT;

  const content = `### The Event
${fill(flavor.premise)}

### Public Response
${fill(flavor.publicResponse)} At ${resolved.scale} scale, ${scaleHint.toLowerCase()}

### How It Unfolds
**Stage 1: First Signs** — Isolated, easy-to-dismiss reports precede open acknowledgement. Few outside those directly affected take the threat seriously yet.
**Stage 2: Confirmation** — Authorities and heroes confirm the event is real and cannot be contained quietly. Public panic and mobilisation begin in earnest.
**Stage 3: Escalation** — The event's true scope becomes visible; the response so far proves insufficient, forcing a larger, more coordinated effort.
**Stage 4: Climax** — ${fill(flavor.climax)}`;

  const lore = `### True Cause
${fill(flavor.trueCause)}

### The Climax
${fill(flavor.climax)}

### Lasting Consequences
- ${fill(flavor.consequences[0])}
- ${fill(flavor.consequences[1])}
- ${fill(flavor.consequences[2])}

### Campaign Hooks
- ${flavor.hooks[0]}
- ${flavor.hooks[1]}`;

  return {
    type: "event",
    title: `${resolved.eventName}: ${knownFlavor ? flavorKey : resolved.eventType}`,
    summary: "",
    content,
    lore,
    labels: ["comic-book-event", "superhero-event-generator", "imported-draft"],
    status: "active",
  };
}
