/**
 * Public Heist generator — framework-free, for the marketing/SEO generator
 * surface (no login, no vault context).
 *
 * Turns the framework from the "How do you run a heist in a tabletop RPG?"
 * answer page into a table-ready score: a concrete objective, a prize with a
 * practical complication, actionable casing intel, three distinct security
 * rings, a five-step alarm track, complications with a trigger, a compromised
 * getaway, and a menu of flashbacks the players *could* establish (#2768).
 *
 * The design constraint that separates this from the quest generator: a heist
 * is a situation with moving parts, not a hook. Every section has to give the
 * table something to act on — multiple approaches per security ring, an alarm
 * state that actually changes the fiction, and a getaway whose original plan
 * is already broken before the players reach it.
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
import { puzzleConfig } from "./public-puzzle";

export const heistConfig = {
  heistTypes: [
    "Theft",
    "Rescue",
    "Sabotage",
    "Extraction",
    "Information",
    "Plant Evidence",
    "Assassination",
  ],
  targetScales: ["Small", "Major", "Legendary"],
  targetTypes: [
    "Private Vault",
    "Fortified Archive",
    "Guarded Estate",
    "Secure Depot",
  ],
  targetTypesByTheme: {
    "Classic Fantasy": [
      "Temple Reliquary",
      "Baronial Treasury",
      "Wizard's Sanctum",
      "Guild Vault",
    ],
    Pirate: [
      "Governor's Strongroom",
      "Anchored Treasure Galleon",
      "Harbour Customs House",
      "Smuggler's Sea Cave",
    ],
    "Cyberpunk / Corporate": [
      "Corporate Arcology",
      "Black Clinic",
      "Data Fortress",
      "Executive Penthouse",
    ],
    "Vampire / Gothic Noir": [
      "Ancestral Crypt",
      "Opera House Vault",
      "Bloodline Manor",
      "Cathedral Undercroft",
    ],
    "Cosmic Horror": [
      "University Special Collection",
      "Sealed Lighthouse Archive",
      "Private Cabinet of Curiosities",
      "Quarantined Sanatorium",
    ],
    "Sci-Fi / Space Opera": [
      "Orbital Station Vault",
      "Research Habitat",
      "Impounded Freighter",
      "Planetary Datacore",
    ],
    "Modern Conspiracy": [
      "Private Bank Vault",
      "Government Records Facility",
      "Auction House Strongroom",
      "Secure Server Farm",
    ],
    "Post-Apocalyptic": [
      "Pre-Collapse Bunker",
      "Warlord's Armoury",
      "Water Reclamation Plant",
      "Convoy Depot",
    ],
    "Western / Frontier": [
      "Bank Strongbox",
      "Railroad Payroll Car",
      "Assay Office",
      "Fortified Ranch House",
    ],
    Steampunk: [
      "Guild Patent Vault",
      "Aetheric Foundry",
      "Imperial Dirigible Hold",
      "Clockwork Exchange",
    ],
    Lancer: [
      "Corpro-State Archive",
      "Mech Hangar Deck",
      "Union Evidence Locker",
      "NHP Containment Wing",
    ],
    "Space Opera Resistance": [
      "Imperial Garrison Vault",
      "Detention Block",
      "Governor's Private Collection",
      "Orbital Shipyard",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Embassy Secure Archive",
      "Precursor Vault",
      "Xenobiology Containment Lab",
      "Flagship Records Core",
    ],
    "Space Western": [
      "Frontier Assay Vault",
      "Ore Hauler's Hold",
      "Company Town Payroll Office",
      "Way-Station Strongroom",
    ],
  } as Record<string, string[]>,
  /**
   * The practical, physical catch that stops the prize from being a bag of
   * coins. Every generated heist gets exactly one, because "the prize is
   * awkward" is what turns the getaway into a scene.
   */
  prizeComplications: [
    "Huge — it cannot be carried by one person or hidden under a coat",
    "Fragile — a hard knock ruins it and the job pays nothing",
    "Alive — it has its own opinions about being moved",
    "Cursed — carrying it costs the bearer something with every hour",
    "Traceable — it can be followed while the crew still holds it",
    "Volatile — rough handling makes it dangerous to everyone nearby",
    "Anchored — it is fixed in place and must be freed before it can be taken",
    "Unwilling — it does not want to leave, and can say so",
  ],
  /**
   * What the crew is after when the caller does not name a prize. Keyed by
   * heist type, because "the most closely held object in the building" is the
   * wrong default for a rescue, an extraction, or an assassination.
   */
  defaultPrizes: {
    Theft: "the single most closely held object in the building",
    Rescue: "a prisoner nobody outside is supposed to know is held here",
    Sabotage: "the mechanism the whole operation depends on",
    Extraction: "someone who wants out and cannot simply walk out",
    Information: "the record that proves what everyone here denies",
    "Plant Evidence":
      "an incriminating item that has to end up somewhere it was never kept",
    Assassination: "a mark who is only ever alone inside this building",
  } as Record<string, string>,
  /** Fixed five-state ladder, matching the answer page's alarm track. */
  alarmStates: ["Quiet", "Suspicion", "Alert", "Lockdown", "Lethal Response"],
  complications: [
    "The buyer is already inside, negotiating with the target in person.",
    "The prize was moved this morning, and only one person on site knows where.",
    "A rival crew has started its own run on the same target tonight.",
    "Someone the crew knows is on guard duty and will recognise them.",
    "The prize does not want to leave and will resist being taken.",
    "The target expected the crew and deliberately let them in.",
    "A scheduled inspection has put twice the usual staff on site tonight.",
    "The inside contact has already been caught and is being questioned.",
  ],
  triggers: [
    "an alarm nobody knew was fitted to the prize's cradle starts sounding",
    "every lock in the building closes at once, including the ones behind the crew",
    "the lights die, and something in the dark starts calling the staff's names one by one",
    "a countersign the crew has never heard is shouted from three directions",
    "the prize's absence is announced by something that was watching it",
    "a second, quieter alarm sounds — one the staff were never told about",
  ],
  /**
   * Why the way in closes at the point of no return. Every entry is caused by
   * the prize being lifted or the alarm it raises — a closure with an
   * unrelated cause ("the tide turned") would contradict the trigger that is
   * supposed to have caused it.
   */
  routeClosures: [
    "the doors on that side seal on the alarm and cannot be reopened from inside",
    "the reinforcements the alarm calls muster in exactly that corridor",
    "the contact who was holding it open bolts the moment the alarm starts",
    "the rival crew hears the alarm, takes that exit first, and leaves it watched",
    "the staff evacuating through it turn a quiet route into a witnessed one",
  ],
  pursuits: [
    "A specialist tracker who is paid on delivery, not on capture",
    "A patrol that has cut ahead to the crew's likely destination",
    "The rival crew, who would rather take the prize than the credit",
    "A single relentless officer who saw a face and will not stop",
    "Whatever the target keeps for exactly this situation",
    "The buyer's own people, sent to make the handover cheaper",
  ],
  flashbackSeeds: [
    "A guard bribed weeks ago, who is on shift tonight",
    "Forged credentials that stand up to a bored check, but not a careful one",
    "Equipment cached somewhere inside during a legitimate visit",
    "Prior reconnaissance that answers one specific question the crew now needs",
    "An inside contact who owes someone in the crew a favour",
    "Knowledge of how the security system fails, learned from whoever installed it",
    "A rehearsed distraction that will pull staff to the wrong part of the building",
    "A debt called in with a local fixer for a single, no-questions favour",
  ],
  /**
   * Rules tailoring. Reuses the puzzle generator's vocabulary rather than
   * coining a second list for the same concept — generation stays
   * system-neutral unless a user explicitly asks otherwise.
   */
  systems: puzzleConfig.systems,
  /**
   * What the prize's catch actually costs during play, keyed by the catch.
   * Each one names a trigger the GM can see fire — an obstacle cleared, an
   * alarm tick, a handover — rather than a wall-clock rate like "once per
   * hour" that would never come up inside a single infiltration.
   */
  pressureByComplication: {
    Huge: "Two of the crew have their hands full at all times; every obstacle that needs a free hand has to be solved by someone else.",
    Fragile:
      "Each time it is run with, fought over, or dropped, it takes a mark. The third mark ruins it.",
    Alive:
      "Every time the alarm ticks up, it panics again, and someone has to spend that moment calming it instead of acting.",
    Cursed:
      "Every ten minutes it is carried, the bearer loses something small and permanent. Handing it on does not undo what is already gone.",
    Traceable:
      "Every ten minutes, whoever is hunting it learns roughly where it is — and moves.",
    Volatile:
      "Any fall, blow, or hurried climb risks setting it off, and the odds worsen at every alarm level.",
    Anchored:
      "Freeing it takes three uninterrupted stages. Each interruption ticks the alarm up one.",
    Unwilling:
      "Every time it changes hands it argues, stalls, or calls out — once per handover, without fail.",
  } as Record<string, string>,
};

/** Generation stays system-neutral unless the user selects a system. */
export const DEFAULT_HEIST_SYSTEM = "System-neutral";

export interface HeistGeneratorOptions {
  genre?: string;
  heistType?: string;
  targetScale?: string;
  targetType?: string;
  prize?: string;
  system?: string;
  campaignContext?: string;
}

export interface ResolvedHeist {
  genre: string;
  heistType: string;
  targetScale: string;
  targetType: string;
  prize?: string;
  system: string;
  campaignContext?: string;
  title: string;
  prizeComplication: string;
  /** The catch's label alone, e.g. "Fragile" — keys `pressureByComplication`. */
  prizeComplicationLabel: string;
  /** What the catch costs during play, and the trigger that makes it cost. */
  pressure: string;
}

function resolveHeist(options: HeistGeneratorOptions, rng: Rng): ResolvedHeist {
  const genre = options.genre?.trim() || "Classic Fantasy";
  const targetType =
    options.targetType?.trim() ||
    pickFrom(
      heistConfig.targetTypesByTheme[genre] ?? heistConfig.targetTypes,
      rng,
    );
  const prizeComplication = pickFrom(heistConfig.prizeComplications, rng);
  const prizeComplicationLabel = prizeComplication.split(" — ")[0];
  return {
    genre,
    heistType:
      options.heistType?.trim() || pickFrom(heistConfig.heistTypes, rng),
    targetScale:
      options.targetScale?.trim() || pickFrom(heistConfig.targetScales, rng),
    targetType,
    prize: options.prize?.trim() || undefined,
    system: heistConfig.systems.includes(options.system as never)
      ? options.system!
      : DEFAULT_HEIST_SYSTEM,
    campaignContext: options.campaignContext?.trim() || undefined,
    title: `The ${generateName(rng)} ${pickFrom(["Job", "Score", "Run", "Lift", "Take"], rng)}`,
    prizeComplication,
    prizeComplicationLabel,
    pressure:
      heistConfig.pressureByComplication[prizeComplicationLabel] ??
      "The catch bites every time the crew has to move quickly, and moving quickly is the whole job.",
  };
}

// The only labels this generator's own schema asks for. "heist" drives the
// main/rail content split in generator-document-layout.ts (LAYOUT_RULES),
// matched by `labels.includes(rule.label)` in rule-array order — so a stray
// foreign label the model echoes back (e.g. "quest-generator", which appears
// earlier in that array) would win the match against this generator's own,
// differently-headed lore. Whitelisting closes that off.
const KNOWN_LABELS = ["heist", "heist-generator", "infiltration"];

// The resolved options are just as user-controlled as the model's output: the
// public form's genre/heist-type/target selects all accept custom free text
// (SelectWithCustomOption), and the in-app "Target" option is a plain text
// field. Echoing them into `labels` unchecked would reopen exactly the hijack
// KNOWN_LABELS closes — a user typing "quest-generator" as their target would
// win the LAYOUT_RULES match ahead of "heist" and split this generator's lore
// against quest's headings. Custom values still flavour the generated content;
// they just don't become labels.
const CANONICAL_GENRES = Object.keys(heistConfig.targetTypesByTheme);
const CANONICAL_TARGETS = [
  ...Object.values(heistConfig.targetTypesByTheme).flat(),
  ...heistConfig.targetTypes,
];

function canonicalOptionLabels(resolved: ResolvedHeist): string[] {
  const labels: string[] = [];
  if (heistConfig.heistTypes.includes(resolved.heistType)) {
    labels.push(resolved.heistType);
  }
  if (CANONICAL_TARGETS.includes(resolved.targetType)) {
    labels.push(resolved.targetType);
  }
  if (CANONICAL_GENRES.includes(resolved.genre)) {
    labels.push(resolved.genre);
  }
  return labels;
}

export interface HeistPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedHeist;
}

export function buildHeistPrompt(
  options: HeistGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): HeistPrompt {
  const resolved = resolveHeist(options, rng);

  const systemNote =
    resolved.system === DEFAULT_HEIST_SYSTEM
      ? `No rules system has been selected, so keep every effect system-neutral: describe what happens in the fiction, never in one game's mechanics. Do not use rounds, turns, saving throws, DCs, checks, advantage/disadvantage, hit points, damage numbers, or any named condition from a specific system. Write "the tuning fork can briefly immobilise whoever it is aimed at", not "the tuning fork freezes the bearer for one round".`
      : `The table is playing ${resolved.system}. Stay fiction-first, but where a mechanic genuinely helps the GM run a moment, you may name it in ${resolved.system} terms. Never make an obstacle solvable only through one specific mechanic.`;

  const userMessage = `Generate a table-ready RPG heist scenario in JSON format. This is a playable situation with interacting parts — an objective, intel, layered security, escalating consequences, and a compromised escape — not an adventure synopsis and not long-form prose. Every detail you write must either create a decision, reveal usable information, or change how the heist can play. Cut anything that only sets a mood.
Options:
- Genre: ${resolved.genre}
- Heist Type: ${resolved.heistType}
- Target Scale: ${resolved.targetScale}
- Target: ${resolved.targetType}
- Prize Complication (the prize MUST have this practical problem): ${resolved.prizeComplication}
- Pressure (what that complication costs during play, and when it bites): ${resolved.pressure}
- Rules system: ${resolved.system}
${resolved.prize ? `- Requested Prize / Objective: ${resolved.prize}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative name for this score (3-6 words)",
  "content": "Player-facing material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### The Score' (ONE sentence naming the prize, the place, and the deadline — e.g. \\"Steal the Glass Testament from beneath the Cathedral of Saint Orla before its contents are read aloud at dawn\\" — plus at most one more sentence of context), '### The Prize' (at most three sentences on what it is, who wants it, and why it matters beyond its price, then two bullets: '- **The catch**: ' restating the practical complication given in the options as a concrete physical problem, and '- **Pressure**: ' stating what that costs and the exact trigger that makes it cost — an obstacle cleared, an alarm tick, a handover, a stated interval — never a vague or wall-clock rate), '### Casing the Target' (exactly three '- **Label**: detail' bullets, one sentence each: an entry vector, a known obstacle, and where the prize is kept and how it is handled).",
  "lore": "GM-only material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### GM Quick Reference' (seven one-line bullets and nothing else — '- **Objective**:', '- **Primary obstacle**:', '- **Hidden factor**:', '- **Point of no return**:', '- **Pressure**:', '- **Default complication**:', '- **Escape problem**:' — each a single short sentence summarising what the section below says, so a GM understands the whole heist in under thirty seconds), '### The Hidden Factor' (at most two sentences: one thing the crew's intel gets wrong, and when it becomes obvious at the table. It must complicate the plan, never invalidate every approach at once), '### Security Rings' (three bullets, '- **Perimeter**: ', '- **Access**: ', '- **Inner Vault**: ', TWO TO FOUR SENTENCES EACH: what protects the layer, then two or three genuinely different ways past it. Draw those from stealth, deception, social leverage, stolen credentials, magic or technology, physical infiltration, bribery, prior preparation, exploiting a schedule, or environmental access — not three variations on fighting, and never one intended solution), '### Alarm Track' (exactly five bullets, '- **0 — Quiet**:' through '- **4 — Lethal Response**:', ONE OR TWO SENTENCES EACH, using the labels Quiet, Suspicion, Alert, Lockdown, Lethal Response. Each level must change what the opposition does, close or complicate some options, and still leave the crew a real choice. Level 4 is extremely dangerous but still interactive — no automatic death, and no state where every exit is simply impossible; if something seals the building, name the obvious but costly way to answer it), '### Complications' (exactly three '- **Label**: detail' bullets, one sentence each, one marked '(default)' after its label. Build them from people, factions, or facts already established elsewhere in this scenario wherever you can, rather than introducing new ones), '### When the Prize Is Taken' (at most two sentences: the single concrete event that fires the instant the prize is lifted, and what it changes — alarm escalation, a route closing, a guardian waking, a curse starting, the crew being identified. This is the moment the job turns from infiltration into escape, and \\"The Getaway\\" must follow from it), '### The Getaway' (one sentence on why the planned route is gone, which must be the consequence named in \\"When the Prize Is Taken\\", then two or three '- **Label**: detail' bullets, one sentence each, for genuinely different alternate routes — fast but exposed, covert but socially risky, environmentally dangerous, one that costs the crew their equipment, one that needs an NPC's help — then a final '**Pursuit**: ' line naming one threat that follows them out), '### Flashback Opportunities' (four to six '- ' bullets, one line each, naming preparations the players COULD establish. Each must attach to an obstacle actually described above, and none may do something the security rules established above say is impossible. Offer them; never state that the players used them).",
  "labels": ["heist", "heist-generator"]
}
Density matters as much as content. Short paragraphs and bullets only. Do not restate the same fact in "The Prize", "Security Rings", "Alarm Track", "The Getaway", and "Flashback Opportunities" — state it once, in the section that owns it, and let the others rely on it.
${systemNote}
Set the score firmly within the ${resolved.genre} genre — the target, its security, the alarm flavour, and the pursuit should all feel native to that setting rather than a fantasy heist with the nouns swapped.
Scale the target to "${resolved.targetScale}": a Small score is a single building with a handful of staff, a Major score is a well-defended institution with a real security budget, and a Legendary score is a place that has never been successfully robbed and everyone knows it.
${NAME_BAN_PROMPT}
${sessionContext}
Write every section as scene-appropriate prose. Do not restate the wording of these instructions verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated — the output is the scenario itself, nothing about producing it.
Before returning, run a consistency pass and fix anything that fails it. Contradictions: nothing offered as a solution may be something an earlier rule declared impossible, unless the text explicitly explains how that rule is circumvented — if the ward only admits a living guild member, no later flashback or route may bypass it with a dead member's signet. Every access method obeys the rules established for that ring; every named person, faction, patron, or rival keeps one consistent role throughout; no alarm effect closes a route that a later section still offers; "The Hidden Factor" complicates the plan without invalidating every approach at once. Continuity: the prize in "The Score", "The Prize", and the "Casing the Target" bullet is the same object; the entry vector is a real way through the "Perimeter" ring; the route lost in "The Getaway" is the one "When the Prize Is Taken" closes, and is the one the crew entered by; the "GM Quick Reference" lines match the sections they summarise. Playability: each security ring names at least two genuinely different approaches; the five alarm states escalate without repeating each other and level 4 still leaves a costly option; exactly one complication is marked "(default)"; the pressure advances on a trigger the GM can actually see fire during one infiltration. Density: delete any sentence that does not create a decision, reveal usable information, or change how the heist plays.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseHeistResponse(
  text: string,
  resolved: ResolvedHeist,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  const labels = rawLabels.filter(
    (label: unknown): label is string =>
      typeof label === "string" && KNOWN_LABELS.includes(label),
  );
  if (!labels.includes("heist")) labels.unshift("heist");
  for (const label of canonicalOptionLabels(resolved)) {
    if (!labels.includes(label)) labels.push(label);
  }
  return {
    type: "event",
    title: data.title || resolved.title,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels,
    status: "active",
  };
}

export function generateHeistLocal(
  options: HeistGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveHeist(options, rng);
  const capitalise = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;
  const site = `${generateName(rng)} ${resolved.targetType}`;
  const prize =
    resolved.prize ||
    heistConfig.defaultPrizes[resolved.heistType] ||
    `the ${resolved.targetType.toLowerCase()}'s single most closely held asset`;
  const complicationDetail = resolved.prizeComplication.split(" — ")[1];

  const defaultComplication = pickFrom(heistConfig.complications, rng);
  const otherComplications = heistConfig.complications.filter(
    (c) => c !== defaultComplication,
  );
  const secondComplication = pickFrom(otherComplications, rng);
  const thirdComplication = pickFrom(
    otherComplications.filter((c) => c !== secondComplication),
    rng,
  );
  const trigger = pickFrom(heistConfig.triggers, rng);
  const routeClosure = pickFrom(heistConfig.routeClosures, rng);
  const pursuit = pickFrom(heistConfig.pursuits, rng);

  const flashbacks = [...heistConfig.flashbackSeeds];
  const chosenFlashbacks: string[] = [];
  for (let i = 0; i < 5 && flashbacks.length > 0; i += 1) {
    const seed = pickFrom(flashbacks, rng);
    chosenFlashbacks.push(seed);
    flashbacks.splice(flashbacks.indexOf(seed), 1);
  }

  // Campaign context is a sentence inside The Score, not a section of its own:
  // the AI schema declares `content` holds exactly Score/Prize/Casing, and a
  // fallback that invents a fourth heading would make the two paths
  // structurally different for no reader benefit.
  const content = `### The Score
${resolved.heistType} at the ${site}: one night to get ${prize} clear of a ${resolved.targetScale.toLowerCase()}-scale ${resolved.targetType.toLowerCase()}.${resolved.campaignContext ? ` This score ties into ${resolved.campaignContext}.` : ""}

### The Prize
${capitalise(prize)} — worth more to the buyer than to any honest market, and the target cannot replace it.
- **The catch**: ${resolved.prizeComplicationLabel} — ${complicationDetail ?? "it will not travel quietly"}.
- **Pressure**: ${resolved.pressure}

### Casing the Target
- **Entry vector**: A service route staff use daily and nobody watches closely — open only during working hours.
- **Known obstacle**: The credential check between the public floor and the secured floor is watched, not merely locked.
- **The prize**: Kept in the innermost secured space, handled by a few named staff on a fixed routine — that routine is the window.`;

  const lore = `### GM Quick Reference
- **Objective**: Get ${prize} out of the ${site} in one night.
- **Primary obstacle**: Three layers — patrols outside, a watched credential check, and the vault itself.
- **Hidden factor**: One thing the crew was told about the routine is out of date.
- **Point of no return**: Lifting the prize — ${trigger}.
- **Pressure**: ${resolved.pressure.split(". ")[0].replace(/\.$/, "")}.
- **Default complication**: ${defaultComplication}
- **Escape problem**: The way in closes behind them; every remaining exit costs something.

### The Hidden Factor
Whichever detail the crew leans on hardest in planning is the one that has changed — the service route is watched this week, or the handling routine moved yesterday. It costs them their best approach, not every approach; the other two rings are still solvable as briefed.

### Security Rings
- **Perimeter**: Patrols, watchers, and sightlines around the ${site}. Past it by timing the gap between rounds, by arriving as someone the staff already expect, or by an approach the patrol route simply does not cover.
- **Access**: The credential check onto the secured floor, staffed by someone who has done this a thousand times. Past it with a forged or borrowed credential, by being escorted through by staff who have a reason to vouch, or by making the check read as a maintenance fault rather than an intrusion.
- **Inner Vault**: The last layer around ${prize} — the part the target actually spent money on. Past it by defeating the mechanism, by getting someone with legitimate access to open it for their own reasons, or by taking the container and dealing with it elsewhere.

### Alarm Track
- **0 — Quiet**: Routine holds. Patrols on schedule, staff bored, nobody looking for anyone.
- **1 — Suspicion**: One guard breaks routine to check what bothered them. Patrol timings stop being predictable.
- **2 — Alert**: Staff know someone is inside. Exits are watched and reinforcements are called, but the building still works normally.
- **3 — Lockdown**: Routes seal and defences come online. Crossing between rings now costs noise, time, or a favour spent.
- **4 — Lethal Response**: Whatever the target keeps for this is loose and hunting to kill. It covers the exits — but it can be drawn off, bargained with, or given something it wants more than the crew.

### Complications
- **Likely (default)**: ${defaultComplication}
- **Alternative**: ${secondComplication}
- **Alternative**: ${thirdComplication}

### When the Prize Is Taken
${trigger[0].toUpperCase()}${trigger.slice(1)}. The alarm jumps straight to **2 — Alert**, and the crew's way in closes behind them: ${routeClosure}.

### The Getaway
The service route from the casing is gone for exactly that reason. Every remaining exit costs something.
- **Fast but exposed**: Out through the public front — quick, and it spends the crew's anonymity for good.
- **Covert but slow**: The service tunnels or roofline — unseen, and slow enough for the pursuit to get ahead of them.
- **Hard route**: The way the prize's catch makes awkward — passable, but it puts the prize itself at risk.
**Pursuit**: ${pursuit}. It does not stop at the door.

### Flashback Opportunities
Offer these; never assume the players used them.
${chosenFlashbacks.map((f) => `- ${f}`).join("\n")}`;

  return {
    type: "event",
    title: resolved.title,
    summary: "",
    content,
    lore,
    labels: ["heist", "heist-generator", ...canonicalOptionLabels(resolved)],
    status: "active",
  };
}
