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
    "the reliquary bells begin ringing despite having no clappers",
    "every lock in the building closes at once, including the ones behind the crew",
    "the lights die and the emergency system starts calling names",
    "a countersign the crew has never heard is shouted from three directions",
    "the prize's absence is announced by something that was watching it",
    "a second, quieter alarm sounds — one the staff were never told about",
  ],
  getawayFailures: [
    "The planned exit is now a staging point for the reinforcements that were called.",
    "The route the crew came in by cannot take the prize back out at its size.",
    "The contact holding the exit open has already run, taking the key with them.",
    "The alarm sealed the exit mechanically, and it cannot be reopened from inside.",
    "The rival crew used the same exit first and left it watched.",
    "Weather, tide, or traffic has closed the route since the crew went in.",
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
};

export interface HeistGeneratorOptions {
  genre?: string;
  heistType?: string;
  targetScale?: string;
  targetType?: string;
  prize?: string;
  campaignContext?: string;
}

export interface ResolvedHeist {
  genre: string;
  heistType: string;
  targetScale: string;
  targetType: string;
  prize?: string;
  campaignContext?: string;
  title: string;
  prizeComplication: string;
}

function resolveHeist(options: HeistGeneratorOptions, rng: Rng): ResolvedHeist {
  const genre = options.genre?.trim() || "Classic Fantasy";
  const targetType =
    options.targetType?.trim() ||
    pickFrom(
      heistConfig.targetTypesByTheme[genre] ?? heistConfig.targetTypes,
      rng,
    );
  return {
    genre,
    heistType:
      options.heistType?.trim() || pickFrom(heistConfig.heistTypes, rng),
    targetScale:
      options.targetScale?.trim() || pickFrom(heistConfig.targetScales, rng),
    targetType,
    prize: options.prize?.trim() || undefined,
    campaignContext: options.campaignContext?.trim() || undefined,
    title: `The ${generateName(rng)} ${pickFrom(["Job", "Score", "Run", "Lift", "Take"], rng)}`,
    prizeComplication: pickFrom(heistConfig.prizeComplications, rng),
  };
}

// The only labels this generator's own schema asks for. "heist" drives the
// main/rail content split in generator-document-layout.ts (LAYOUT_RULES),
// matched by `labels.includes(rule.label)` in rule-array order — so a stray
// foreign label the model echoes back (e.g. "quest-generator", which appears
// earlier in that array) would win the match against this generator's own,
// differently-headed lore. Whitelisting closes that off.
const KNOWN_LABELS = ["heist", "heist-generator", "infiltration"];

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

  const userMessage = `Generate a table-ready RPG heist scenario in JSON format. This is a playable situation with moving parts, not an adventure hook and not a block of prose — every section must give the GM something the players can act on tonight.
Options:
- Genre: ${resolved.genre}
- Heist Type: ${resolved.heistType}
- Target Scale: ${resolved.targetScale}
- Target: ${resolved.targetType}
- Prize Complication (the prize MUST have this practical problem): ${resolved.prizeComplication}
${resolved.prize ? `- Requested Prize / Objective: ${resolved.prize}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative name for this score (3-6 words)",
  "content": "Player-facing material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### The Score' (one concise, actionable objective sentence naming the prize, the place, and the deadline — e.g. \\"Steal the Glass Testament from beneath the Cathedral of Saint Orla before its contents are read aloud at dawn\\" — followed by at most two sentences of context), '### The Prize' (what it is, who wants it and why, why it matters beyond its value, and its practical complication, which must be the one given in the options above and must be stated as a concrete physical problem the crew will have to solve), '### Casing the Target' (at least three separate pieces of actionable intel as '- **Label**: detail' bullets, covering at minimum an entry vector, a known obstacle, and where the prize is kept and how it is handled — each one specific enough to plan around).",
  "lore": "GM-only material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### The Hidden Factor' (one thing the crew's intel gets wrong — a hidden fact, a false assumption, or a security measure nobody told them about — and when it becomes obvious at the table), '### Security Rings' (three distinct labelled layers as '- **Perimeter**: …', '- **Access**: …', '- **Inner Vault**: …' — each naming what is actually there AND at least two genuinely different ways past it, so no layer has a single mandatory solution; never write only \\"there are guards\\"), '### Alarm Track' (exactly five states as '- **0 — Quiet**: …' through '- **4 — Lethal Response**: …', using the labels Quiet, Suspicion, Alert, Lockdown, Lethal Response; each state must change what the building actually does — patrols, exits, staff behaviour, or defences — and each must be a visible escalation over the one before it, flavoured to the ${resolved.genre} setting), '### Complications' (exactly three as '- **Label**: detail' bullets, one of them explicitly marked as the likely default with '(default)' after its label, followed by a line beginning '**When the prize is taken:**' naming a single concrete trigger that fires the moment the prize is lifted), '### The Getaway' (why the crew's planned route stops working, then two or three alternate escape routes each with its own cost or risk, then one named pursuit threat that keeps the pressure on after they are clear of the building), '### Flashback Opportunities' (five to seven '- ' bullets naming things the players COULD plausibly establish through a flashback — a bribed guard, forged credentials, cached equipment, prior reconnaissance, an inside contact, knowledge of the security system. Offer them; never dictate that the players used them).",
  "labels": ["heist", "heist-generator"]
}
Keep it usable at the table: concrete nouns, no filler, and no generic adventure prose. The whole thing should be readable at a glance during play.
Set the score firmly within the ${resolved.genre} genre — the target, its security, the alarm flavour, and the pursuit should all feel native to that setting rather than a fantasy heist with the nouns swapped.
Scale the target to "${resolved.targetScale}": a Small score is a single building with a handful of staff, a Major score is a well-defended institution with a real security budget, and a Legendary score is a place that has never been successfully robbed and everyone knows it.
${NAME_BAN_PROMPT}
${sessionContext}
Write every section as scene-appropriate prose. Do not restate the wording of these instructions verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated — the output is the scenario itself, nothing about producing it.
Before returning, run a consistency pass: the prize named in "The Score" is the same prize described in "The Prize" and in the "Casing the Target" bullet about where it is kept; the prize's practical complication is the one given in the options and is what actually makes "The Getaway" hard; the entry vector in "Casing the Target" is a real way through the "Perimeter" ring, and the obstacle bullet corresponds to a layer that actually exists in "Security Rings"; each of the three security rings names at least two different approaches; the five alarm states escalate in order and none repeats another's effect; exactly one complication is marked "(default)"; "The Hidden Factor" contradicts something the crew was told in "Casing the Target" rather than being unrelated new information; and the compromised route in "The Getaway" is the same route the crew entered by. Fix any mismatch before responding.
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
  if (!labels.includes(resolved.heistType)) labels.push(resolved.heistType);
  if (!labels.includes(resolved.genre)) labels.push(resolved.genre);
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
  const site = `The ${generateName(rng)} ${resolved.targetType}`;
  const prize =
    resolved.prize ||
    heistConfig.defaultPrizes[resolved.heistType] ||
    `the ${resolved.targetType.toLowerCase()}'s single most closely held asset`;
  const [complicationLabel, complicationDetail] =
    resolved.prizeComplication.split(" — ");

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
  const getawayFailure = pickFrom(heistConfig.getawayFailures, rng);
  const pursuit = pickFrom(heistConfig.pursuits, rng);

  const flashbacks = [...heistConfig.flashbackSeeds];
  const chosenFlashbacks: string[] = [];
  for (let i = 0; i < 6 && flashbacks.length > 0; i += 1) {
    const seed = pickFrom(flashbacks, rng);
    chosenFlashbacks.push(seed);
    flashbacks.splice(flashbacks.indexOf(seed), 1);
  }

  const content = `### The Score
${resolved.heistType} at ${site}. The crew has one night to get ${prize} clear of a ${resolved.targetScale.toLowerCase()}-scale ${resolved.targetType.toLowerCase()}, and the window is not negotiable.

${resolved.campaignContext ? `### Campaign Fit\nThis score ties into ${resolved.campaignContext}.\n\n` : ""}### The Prize
The prize — ${prize} — is worth more to the person paying for it than to anyone who would take it honestly, which is why the job exists at all. Losing the prize costs the target something they cannot replace, and that is the part they will pursue.
- **The catch**: ${complicationLabel} — ${complicationDetail ?? "it will not travel quietly"}. Plan the exit around this, not around the entry.

### Casing the Target
- **Entry vector**: a service route into ${site.toLowerCase()} that staff use daily and nobody watches closely — it works, but only during working hours.
- **Known obstacle**: the access layer between the public floor and the secured floor is checked, not merely locked; getting through it requires a credential, a distraction, or a person.
- **The prize**: The crew is after ${prize}, kept in the innermost secured space and handled by a small number of named staff on a fixed routine — that routine is the crew's best window.`;

  const lore = `### The Hidden Factor
One thing the crew has been told is wrong. Pick the detail the players lean on hardest in planning and make that the one that does not hold — the service route is being watched this week, the routine changed yesterday, or there is a fourth layer of security nobody mentioned. Reveal it only once the crew is committed and inside.

### Security Rings
- **Perimeter**: patrols, watchers, and sightlines around ${site.toLowerCase()}. Past it by timing the gap between rounds, by arriving as someone who is expected, or by coming in from an approach the patrol route does not cover.
- **Access**: the credential check between the public part of the building and the secured part. Past it with a forged or borrowed credential, by being escorted through by staff, or by disabling the check long enough to be a maintenance fault rather than an intrusion.
- **Inner Vault**: the last layer around ${prize} — the part the target actually spent money on. Past it by defeating the mechanism, by making someone with legitimate access open it, or by removing the prize's container instead of the prize.

### Alarm Track
- **0 — Quiet**: normal routine. Staff are bored, patrols are on schedule, and nobody is looking for anyone.
- **1 — Suspicion**: something did not add up. Patrols tighten, staff start checking anomalies, and one guard goes to look at the thing that bothered them.
- **2 — Alert**: the crew is known to be inside. Exits are watched, reinforcements are called, and the routine stops.
- **3 — Lockdown**: the building closes on itself. Routes seal, defences come online, and moving between rings now costs something.
- **4 — Lethal Response**: whatever the target keeps for this exact situation is now awake and hunting, and it is not interested in arrests.

### Complications
- **Likely (default)**: ${defaultComplication}
- **Alternative**: ${secondComplication}
- **Alternative**: ${thirdComplication}
**When the prize is taken:** ${trigger}.

### The Getaway
${getawayFailure} Do not let the crew simply walk back out the way they came.
- **Alternate route A**: the way out that is fast but public — quick, and it costs the crew their anonymity.
- **Alternate route B**: the way out that is slow but unseen — safe, and it costs them the time the pursuit needs to close.
- **Alternate route C**: the way out that only works because of the prize's complication — clever, and it risks the prize itself.
**Pursuit**: ${pursuit}. It stays on the crew after they are clear of the building.

### Flashback Opportunities
Offer these; never assume the players used them.
${chosenFlashbacks.map((f) => `- ${f}`).join("\n")}`;

  return {
    type: "event",
    title: resolved.title,
    summary: "",
    content,
    lore,
    labels: [
      "heist",
      "heist-generator",
      resolved.heistType,
      resolved.targetType,
      resolved.genre,
    ],
    status: "active",
  };
}
