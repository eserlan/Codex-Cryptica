/**
 * Public Rumour generator — a lightweight companion to the Quest Hook
 * Generator (#2732). Where a quest hook is something the party could go and
 * do, a rumour is something people are saying: it must name a concrete,
 * pursuable lead (a site, NPC, faction, or item), but stays deliberately
 * light and never balloons into a full quest structure.
 *
 * Default output is a d6 table of exactly 6 rumours with a fixed hidden
 * truth distribution: 4 essentially true, 1 exaggeration (true core,
 * distorted detail), 1 dangerous misconception (plausible but materially
 * wrong). Truth status must never appear in player-facing text — it only
 * shows up in the GM-only `lore` field.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { factionConfig } from "./public-faction-constants";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";

export type RumourReality = "true" | "exaggeration" | "misconception";

export const rumourConfig = {
  // Keep Rumour aligned with the canonical theme vocabulary used across CC.
  genres: factionConfig.themes,
  tones: [
    "Everyday",
    "Gossipy",
    "Ominous",
    "Tense",
    "Comedic",
    "Foreboding",
  ] as const,
  dangerLevels: ["Low", "Moderate", "High", "Severe"] as const,
  subjects: [
    "Balanced Mix",
    "Crime",
    "Monsters / Threats",
    "Politics",
    "Treasure / Valuables",
    "Supernatural Events",
    "Local Drama",
    "Travellers / Strangers",
    "Religion",
    "Factions",
    "Missing People",
    "Strange Locations",
  ] as const,
  sources: [
    "a tavern regular",
    "a market trader",
    "a shrine pilgrim",
    "a guard",
    "a child",
    "a caravaner",
    "a dockworker",
    "a drunk",
    "a minor noble",
    "a guild member",
  ] as const,
};

export interface RumourGeneratorOptions {
  genre?: string;
  tone?: string;
  dangerLevel?: string;
  subjectFocus?: string;
  locationContext?: string;
  campaignContext?: string;
}

export interface ResolvedRumourOptions {
  genre: string;
  tone: string;
  dangerLevel: string;
  subjectFocus: string;
  locationContext: string;
  campaignContext: string;
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function resolveRumour(
  options: RumourGeneratorOptions = {},
): ResolvedRumourOptions {
  return {
    genre: text(options.genre) || rumourConfig.genres[0],
    tone: text(options.tone) || rumourConfig.tones[0],
    dangerLevel: text(options.dangerLevel) || rumourConfig.dangerLevels[0],
    subjectFocus: text(options.subjectFocus) || rumourConfig.subjects[0],
    locationContext: text(options.locationContext),
    campaignContext: text(options.campaignContext),
  };
}

export interface RumourPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedRumourOptions;
}

const CONTENT_HEADINGS = Array.from(
  { length: 6 },
  (_, i) => `### Rumour ${i + 1}`,
);
const LORE_HEADINGS = [
  "### At a Glance",
  ...CONTENT_HEADINGS.map((h) =>
    h.replace("### Rumour", "### GM Notes — Rumour"),
  ),
];

function render(
  resolved: ResolvedRumourOptions,
  title: string,
  content: string,
  lore: string,
  summary?: string,
): PublicGeneratorOutput {
  return {
    type: "note",
    kind: "rumour",
    title,
    summary:
      summary ||
      `Six local rumours for ${resolved.locationContext || "a settlement, tavern, or social hub"} — every one names a concrete lead, and exactly one is a dangerous misconception.`,
    content,
    lore,
    labels: [
      "rumour-generator",
      "local-rumours",
      resolved.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      "imported-draft",
    ],
    status: "active",
  };
}

export function buildRumourPrompt(
  options: RumourGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): RumourPrompt {
  const resolved = resolveRumour(options);
  const truthOrder = pickRandomItems(
    ["exaggeration", "misconception", "true", "true", "true", "true"],
    6,
    rng,
  );

  const systemInstruction = `You are an expert tabletop RPG rumour-mill writer. Create six short, table-ready local rumours for a ${resolved.genre} setting. A rumour is NOT a quest hook: it presents something people are saying, not something the party is explicitly sent to do. Every rumour must still name at least one specific, pursuable lead — a named site, NPC, faction, or item the players can seek out, question, visit, inspect, follow, steal, or protect. Never write vague, unnamed danger ("strange things are happening"). Keep player-facing text free of any hint about which rumours are true, exaggerated, or false. Return only valid JSON.`;

  const userMessage = `Generate a d6 table of 6 local rumours in JSON format.
Options:
- Genre: ${resolved.genre}
- Tone: ${resolved.tone}
- Danger level: ${resolved.dangerLevel}
- Subject focus: ${resolved.subjectFocus}${resolved.locationContext ? `\n- Location / settlement context: ${resolved.locationContext}` : ""}
${formatCampaignContextBlock(resolved.campaignContext)}
Hidden truth distribution (assign to the six rumours in this exact order, do not reveal it to players): ${truthOrder.join(", ")}.
- "true" rumours: the core claim is reliable; details may be incomplete.
- "exaggeration": the underlying claim is true, but distorted — investigating it should reveal an unexpected complication tied to the distortion.
- "misconception": plausible-sounding gossip that is materially wrong and dangerous if the party acts on it at face value.

If the subject focus is not "Balanced Mix", bias most (not all) of the six rumours toward that subject while still covering a mix of subjects overall — avoid six variations on the same threat.

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A short evocative title for this batch of rumours (e.g. a place or night it was overheard)",
  "content": "Player-facing markdown using exactly six '### Rumour 1' through '### Rumour 6' headings in order. Under each heading include three bullets: '- **Rumour**: ...' (the read-aloud gossip line), '- **Lead**: ...' (the concrete named site/NPC/faction/item to pursue), and '- **Source**: ...' (who or where it was heard, drawn from tavern regulars, market traders, shrine pilgrims, guards, children, caravaners, dockworkers, drunks, minor nobles, or guild members). Never mention truth status here.",
  "lore": "GM-only markdown starting with '### At a Glance' (genre, tone, danger level bullets), then exactly six '### GM Notes — Rumour 1' through '### GM Notes — Rumour 6' headings matching the content numbering, each with three bullets: '- **Reality**: essentially true | exaggeration | dangerous misconception', '- **What's Actually Happening**: 1-2 concise sentences', and '- **If Investigated**: a lightweight discovery, complication, or consequence'. Do not add objectives, rewards, antagonist stat blocks, or encounter beats — keep this lighter than a full quest.",
  "labels": ["rumour-generator", "local-rumours", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return { systemInstruction, userMessage, resolved };
}

export function parseRumourResponse(
  text: string,
  resolved: ResolvedRumourOptions = resolveRumour(),
): PublicGeneratorOutput {
  const data = parseFencedJson<Record<string, unknown>>(text);
  const content = typeof data.content === "string" ? data.content : "";
  const lore = typeof data.lore === "string" ? data.lore : "";
  const contentRumourCount = (content.match(/^### Rumour \d+/gm) ?? []).length;
  const loreRumourCount = (lore.match(/^### GM Notes — Rumour \d+/gm) ?? [])
    .length;
  if (
    !content ||
    !lore ||
    contentRumourCount !== 6 ||
    loreRumourCount !== 6 ||
    !CONTENT_HEADINGS.every((heading) => content.includes(heading)) ||
    !LORE_HEADINGS.every((heading) => lore.includes(heading))
  ) {
    throw new Error(
      "Rumour response must contain exactly the required d6 sections.",
    );
  }
  return render(
    resolved,
    typeof data.title === "string" && data.title
      ? data.title
      : "Word Around Town",
    content,
    lore,
    typeof data.summary === "string" ? data.summary : undefined,
  );
}

// ---------------------------------------------------------------------------
// Local (no-AI) fallback
// ---------------------------------------------------------------------------

type Subject =
  | "Crime"
  | "Monsters / Threats"
  | "Politics"
  | "Treasure / Valuables"
  | "Supernatural Events"
  | "Local Drama"
  | "Travellers / Strangers"
  | "Religion"
  | "Factions"
  | "Missing People"
  | "Strange Locations";

interface RumourSeed {
  subject: Subject;
  build: (
    rng: Rng,
    locationContext: string,
  ) => {
    rumour: string;
    lead: string;
    source: string;
    truth: Record<
      RumourReality,
      { whatsHappening: string; ifInvestigated: string }
    >;
  };
}

const where = (locationContext: string, fallback: string) =>
  locationContext || fallback;

const RUMOUR_SEEDS: RumourSeed[] = [
  {
    subject: "Crime",
    build: (rng, _loc) => {
      const name = generateName(rng);
      const site = `${generateName(rng)}'s ${pickFrom(["warehouse", "counting-house", "storeroom", "strongbox"], rng)}`;
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${name} has been paying off the night watch to look the other way at ${site} — three shipments have gone through unlogged this month.`,
            `Word going around says ${name} bribes the night watch to look the other way at ${site} — three shipments have gone through unlogged this month.`,
          ],
          rng,
        ),
        lead: `${name}, ${site}`,
        source,
        truth: {
          true: {
            whatsHappening: `${name} is smuggling contraband through ${site} and bribing a specific watch sergeant to keep the manifests clean.`,
            ifInvestigated: `Following the bribed sergeant leads straight to the next shipment, still in transit.`,
          },
          exaggeration: {
            whatsHappening: `Only one shipment was actually unlogged; the other two were simple clerical errors, but ${name} is genuinely bribing the watch.`,
            ifInvestigated: `Chasing all three shipments wastes a night — the real one is smaller and better hidden than expected.`,
          },
          misconception: {
            whatsHappening: `${name} is not smuggling anything; the unlogged shipments are unpaid taxes ${name} is hiding from a rival merchant, not the watch.`,
            ifInvestigated: `Accusing the watch sergeant publicly instead exposes the party to a defamation claim from an innocent officer.`,
          },
        },
      };
    },
  },
  {
    subject: "Monsters / Threats",
    build: (rng, loc) => {
      const creature = pickFrom(
        [
          "a wolf twice the usual size",
          "something with too many eyes",
          "a creature that walks upright",
          "a beast with glowing tracks",
        ],
        rng,
      );
      const site = `${where(loc, "the outskirts")}'s ${pickFrom(["old mill", "north road", "grain silo", "boundary marker"], rng)}`;
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `Livestock keep vanishing near ${site}, and two herders swear they saw ${creature} circling at dusk.`,
            `Something has been picking off livestock near ${site}, and two herders swear they saw ${creature} circling at dusk.`,
          ],
          rng,
        ),
        lead: site,
        source,
        truth: {
          true: {
            whatsHappening: `A genuinely dangerous predator has denned near ${site} and is taking livestock at night.`,
            ifInvestigated: `Tracking it to its den reveals it is guarding young, which changes how the encounter should be handled.`,
          },
          exaggeration: {
            whatsHappening: `The predator is real but ordinary-sized; fear has inflated the sightings into something monstrous.`,
            ifInvestigated: `The party finds a mundane, killable animal — but also signs that something else disturbed its usual territory first.`,
          },
          misconception: {
            whatsHappening: `The livestock are being stolen by a person, not a beast, who is staging tracks to keep people away from ${site} at night.`,
            ifInvestigated: `Hunting for a monster wastes time while the thief moves the herd further before the party can catch them.`,
          },
        },
      };
    },
  },
  {
    subject: "Politics",
    build: (rng, _loc) => {
      const official = generateName(rng);
      const rival = generateName(rng);
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${official} is quietly buying the loyalty of ${rival}'s clerks before next season's council vote.`,
            `${official} has reportedly been courting ${rival}'s clerks with quiet favours before next season's council vote.`,
          ],
          rng,
        ),
        lead: `${official}, ${rival}`,
        source,
        truth: {
          true: {
            whatsHappening: `${official} is indeed bribing ${rival}'s clerks to swing procedural votes ahead of the council session.`,
            ifInvestigated: `One bribed clerk is willing to testify in exchange for protection from ${official}'s retaliation.`,
          },
          exaggeration: {
            whatsHappening: `${official} approached only one clerk, not several, but that single bribe is real and already accepted.`,
            ifInvestigated: `Confronting the wrong clerk first tips ${official} off, and the real one destroys the evidence.`,
          },
          misconception: {
            whatsHappening: `${official} and ${rival} are actually negotiating an open alliance; the "bribes" are legitimate advisory fees misread as corruption.`,
            ifInvestigated: `Publicly accusing ${official} damages the party's standing with a council member who was never the villain here.`,
          },
        },
      };
    },
  },
  {
    subject: "Treasure / Valuables",
    build: (rng, loc) => {
      const item = pickFrom(
        [
          "a sealed lead box",
          "a chest bound in ship's chain",
          "a strongbox stamped with a foreign seal",
          "a jar of uncut gemstones",
        ],
        rng,
      );
      const site = `${where(loc, "the old district")}'s ${pickFrom(["collapsed cellar", "flooded crypt", "abandoned counting-house", "sealed well"], rng)}`;
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `A labourer clearing rubble near ${site} says he found ${item} — then sold his silence to someone before he could say more.`,
            `A labourer working near ${site} claims he turned up ${item} — then sold his silence to someone before he could say more.`,
          ],
          rng,
        ),
        lead: site,
        source,
        truth: {
          true: {
            whatsHappening: `${item} is genuinely sealed inside ${site}, and the labourer was paid to keep its location quiet.`,
            ifInvestigated: `Retrieving it draws the attention of whoever paid the labourer, who wants it back badly enough to negotiate or fight.`,
          },
          exaggeration: {
            whatsHappening: `Something was found at ${site}, but it is far less valuable than ${item} — the labourer's price for silence was for a lesser secret.`,
            ifInvestigated: `The real find still points toward a genuine cache one level deeper than the labourer actually reached.`,
          },
          misconception: {
            whatsHappening: `Nothing was found; the labourer invented the story to explain a sudden windfall from an unrelated, less flattering source.`,
            ifInvestigated: `Digging at ${site} wastes time, but turns up evidence of the labourer's actual (and more interesting) secret.`,
          },
        },
      };
    },
  },
  {
    subject: "Supernatural Events",
    build: (rng, loc) => {
      const site = `${where(loc, "the village")}'s ${pickFrom(["shrine bell", "boundary stone", "well shaft", "old chapel"], rng)}`;
      const witness = generateName(rng);
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${witness} swears ${site} rang, hummed, or moved on its own last night — and insists it happens whenever someone nearby is about to die.`,
            `According to ${witness}, ${site} rang, hummed, or moved on its own last night — and it always happens whenever someone nearby is about to die.`,
          ],
          rng,
        ),
        lead: `${witness}, ${site}`,
        source,
        truth: {
          true: {
            whatsHappening: `${site} genuinely responds to a real, localised phenomenon tied to nearby deaths, though not by supernatural will.`,
            ifInvestigated: `Studying the pattern reveals a specific, actionable trigger the party can use or disrupt.`,
          },
          exaggeration: {
            whatsHappening: `${site} did make noise once, coinciding with an unrelated death; the "always" is ${witness}'s invention, not a real pattern.`,
            ifInvestigated: `Testing the claim wastes a night, but does turn up a genuine, unrelated structural fault worth reporting.`,
          },
          misconception: {
            whatsHappening: `${site} makes noise due to a mundane cause (settling stone, wind, vermin); it has never coincided with any death.`,
            ifInvestigated: `Acting on the omen — evacuating, performing a rite — provokes real panic over nothing, and someone gets hurt in the rush.`,
          },
        },
      };
    },
  },
  {
    subject: "Local Drama",
    build: (rng, _loc) => {
      const a = generateName(rng);
      const b = generateName(rng);
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${a} and ${b} were once inseparable business partners — now ${a} won't say ${b}'s name, and ${b} has stopped coming to market entirely.`,
            `${a} and ${b} used to run their business side by side — these days ${a} won't say ${b}'s name, and ${b} has stopped coming to market entirely.`,
          ],
          rng,
        ),
        lead: `${a}, ${b}`,
        source,
        truth: {
          true: {
            whatsHappening: `${b} genuinely cheated ${a} out of a shared venture, and ${a}'s anger is entirely justified.`,
            ifInvestigated: `Approaching either one surfaces documentation the party can use as leverage or evidence elsewhere.`,
          },
          exaggeration: {
            whatsHappening: `There was a falling-out, but it was mutual and financial, not the betrayal the gossip implies.`,
            ifInvestigated: `Mediating the dispute reveals both were manipulated by a third party neither has named yet.`,
          },
          misconception: {
            whatsHappening: `${a} and ${b} are not estranged at all — they are quietly working together on something they don't want gossiped about.`,
            ifInvestigated: `Prying into "the feud" tips them off that they've been noticed, complicating whatever they're actually planning.`,
          },
        },
      };
    },
  },
  {
    subject: "Travellers / Strangers",
    build: (rng, _loc) => {
      const stranger = generateName(rng);
      const inn = `${generateName(rng)}'s ${pickFrom(["inn", "waystation", "lodging house", "hostel"], rng)}`;
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `A stranger calling themself ${stranger} has taken a room at ${inn} and is asking pointed questions about who lives where.`,
            `Someone going by ${stranger} checked into ${inn} last night and is asking pointed questions about who lives where.`,
          ],
          rng,
        ),
        lead: `${stranger}, ${inn}`,
        source,
        truth: {
          true: {
            whatsHappening: `${stranger} is a scout for an outside interest quietly mapping the settlement for a purpose not yet declared.`,
            ifInvestigated: `Following ${stranger} reveals who they report to, and what that interest actually wants.`,
          },
          exaggeration: {
            whatsHappening: `${stranger} is asking questions, but only about one specific household, not everyone — the wider fear is overblown.`,
            ifInvestigated: `Learning the real target reveals a much more personal, smaller-scale reason for the visit.`,
          },
          misconception: {
            whatsHappening: `${stranger} is not investigating anyone — they are lost, new, and asking directions in an unfamiliar dialect.`,
            ifInvestigated: `Confronting ${stranger} as a threat needlessly damages the settlement's relationship with a harmless newcomer.`,
          },
        },
      };
    },
  },
  {
    subject: "Religion",
    build: (rng, loc) => {
      const site = `${where(loc, "the district")}'s ${pickFrom(["shrine", "chapel", "sanctum", "prayer house"], rng)}`;
      const cleric = generateName(rng);
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${cleric} at ${site} has stopped performing the dawn rite, and refuses to say why the ritual objects are locked away.`,
            `${cleric} has quietly cancelled the dawn rite at ${site}, and refuses to say why the ritual objects are locked away.`,
          ],
          rng,
        ),
        lead: `${cleric}, ${site}`,
        source,
        truth: {
          true: {
            whatsHappening: `${cleric} discovered the ritual objects were tampered with and is protecting the congregation until the culprit is found.`,
            ifInvestigated: `${cleric} will share what was found in exchange for discreet help identifying who broke in.`,
          },
          exaggeration: {
            whatsHappening: `Only one object was disturbed, not the whole set, but ${cleric} is genuinely alarmed and has overreacted by halting all rites.`,
            ifInvestigated: `The single disturbed object points to a much smaller, more personal theft than the rumour suggests.`,
          },
          misconception: {
            whatsHappening: `Nothing was tampered with; ${cleric} is quietly grieving a private loss and locked the objects away out of habit, not threat.`,
            ifInvestigated: `Pressing ${cleric} for "the truth" only causes needless distress over a private matter.`,
          },
        },
      };
    },
  },
  {
    subject: "Factions",
    build: (rng, loc) => {
      const faction = `The ${generateName(rng)} ${pickFrom(["Concord", "Compact", "Ledger", "Circle"], rng)}`;
      const site = `${where(loc, "the district")}'s ${pickFrom(["meeting hall", "warehouse", "shipping office", "back room"], rng)}`;
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${faction} has been meeting at ${site} at odd hours, and members who leave early won't discuss what was decided.`,
            `${faction} keeps convening at ${site} at odd hours, and members who leave early won't discuss what was decided.`,
          ],
          rng,
        ),
        lead: `${faction}, ${site}`,
        source,
        truth: {
          true: {
            whatsHappening: `${faction} is preparing a real move — a takeover, a vote, or an expansion — that will affect the wider settlement soon.`,
            ifInvestigated: `A sympathetic member will describe the plan in exchange for a favour or protection.`,
          },
          exaggeration: {
            whatsHappening: `${faction} is only discussing routine internal business; the secrecy is habitual, not sinister.`,
            ifInvestigated: `Digging further finds one genuinely sensitive detail buried in an otherwise mundane set of meetings.`,
          },
          misconception: {
            whatsHappening: `${faction} isn't meeting at all — a rival faction is spreading the rumour to make ${faction} look suspicious.`,
            ifInvestigated: `Confronting ${faction} over a meeting that never happened damages the party's credibility with them.`,
          },
        },
      };
    },
  },
  {
    subject: "Missing People",
    build: (rng, loc) => {
      const missing = generateName(rng);
      const lastSeen = `${where(loc, "the settlement")}'s ${pickFrom(["north gate", "riverside path", "market square", "old bridge"], rng)}`;
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${missing} hasn't been seen in five days — last spotted near ${lastSeen}, arguing with someone no one can name.`,
            `Five days now since anyone has seen ${missing} — last spotted near ${lastSeen}, arguing with someone no one can name.`,
          ],
          rng,
        ),
        lead: `${missing}, ${lastSeen}`,
        source,
        truth: {
          true: {
            whatsHappening: `${missing} was taken after that argument and is being held nearby, alive but in danger.`,
            ifInvestigated: `Tracing the argument's other party leads directly to where ${missing} is being held.`,
          },
          exaggeration: {
            whatsHappening: `${missing} genuinely vanished, but the argument is unrelated — a separate, coincidental dispute witnesses conflated with the disappearance.`,
            ifInvestigated: `Chasing the wrong lead first costs a day before the real trail (a hurried departure) turns up.`,
          },
          misconception: {
            whatsHappening: `${missing} left of their own accord to escape a debt or an arrangement, and is safe elsewhere under a different name.`,
            ifInvestigated: `Treating this as an abduction and pursuing it publicly could expose ${missing} to the very trouble they fled.`,
          },
        },
      };
    },
  },
  {
    subject: "Strange Locations",
    build: (rng, loc) => {
      const site = `${where(loc, "the outskirts")}'s ${pickFrom(["fogbound hollow", "sunken orchard", "collapsed tunnel mouth", "circle of dead trees"], rng)}`;
      const witness = generateName(rng);
      const source = pickFrom(rumourConfig.sources, rng);
      return {
        rumour: pickFrom(
          [
            `${witness} says compasses and clocks stop working near ${site}, and refuses to go back for a wager they left behind.`,
            `${witness} insists compasses and clocks stop working near ${site}, and refuses to go back for a wager they left behind.`,
          ],
          rng,
        ),
        lead: `${witness}, ${site}`,
        source,
        truth: {
          true: {
            whatsHappening: `${site} genuinely disrupts nearby instruments due to a real, identifiable cause someone could investigate or exploit.`,
            ifInvestigated: `Locating the cause reveals it is valuable, dangerous, or both, and worth returning for.`,
          },
          exaggeration: {
            whatsHappening: `Instruments do misbehave near ${site}, but only within a small radius, far less dramatic than ${witness} describes.`,
            ifInvestigated: `Mapping the actual radius reveals it centres on something small and specific, not the whole hollow.`,
          },
          misconception: {
            whatsHappening: `Nothing is actually wrong with ${site}; ${witness}'s instruments were simply faulty, and the story grew in the retelling.`,
            ifInvestigated: `A cautious approach to ${site} wastes preparation on a threat that isn't there — though the wager itself turns out to be missing for a mundane reason.`,
          },
        },
      };
    },
  },
];

export function seedsForFocus(subjectFocus: string): RumourSeed[] {
  if (
    subjectFocus === "Balanced Mix" ||
    subjectFocus === rumourConfig.subjects[0]
  )
    return RUMOUR_SEEDS;
  const focused = RUMOUR_SEEDS.filter((seed) => seed.subject === subjectFocus);
  if (focused.length === 0) return RUMOUR_SEEDS;
  const rest = RUMOUR_SEEDS.filter((seed) => seed.subject !== subjectFocus);
  // Bias toward the focus subject while keeping the rest available for variety.
  return [...focused, ...focused, ...rest];
}

export function generateRumourLocal(
  options: RumourGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveRumour(options);
  const pool = seedsForFocus(resolved.subjectFocus);
  const shuffledPool = pickRandomItems(pool, pool.length, rng);

  // Pick 6 seeds. The requested subjectFocus is guaranteed both of its slots
  // first (the pool deliberately duplicates it), then every other subject
  // fills the remaining slots at most once each, for a mix.
  const seenCounts = new Map<Subject, number>();
  const chosen: RumourSeed[] = [];
  for (const seed of shuffledPool) {
    if (chosen.length >= 6) break;
    if (seed.subject !== resolved.subjectFocus) continue;
    const count = seenCounts.get(seed.subject) ?? 0;
    if (count >= 2) continue;
    seenCounts.set(seed.subject, count + 1);
    chosen.push(seed);
  }
  for (const seed of shuffledPool) {
    if (chosen.length >= 6) break;
    const count = seenCounts.get(seed.subject) ?? 0;
    if (count >= 1) continue;
    seenCounts.set(seed.subject, count + 1);
    chosen.push(seed);
  }
  while (chosen.length < 6) {
    chosen.push(pickFrom(pool, rng));
  }
  // Re-shuffle final order so a focused subject isn't always rumours 1 and 2.
  const orderedChosen = pickRandomItems(chosen, chosen.length, rng);

  const truthOrder = pickRandomItems(
    [
      "exaggeration",
      "misconception",
      "true",
      "true",
      "true",
      "true",
    ] as RumourReality[],
    6,
    rng,
  );

  const entries = orderedChosen.map((seed, i) => {
    const built = seed.build(rng, resolved.locationContext);
    const reality = truthOrder[i];
    return { ...built, reality, truthInfo: built.truth[reality] };
  });

  const content = entries
    .map(
      (entry, i) =>
        `### Rumour ${i + 1}\n- **Rumour**: ${entry.rumour}\n- **Lead**: ${entry.lead}\n- **Source**: ${entry.source}`,
    )
    .join("\n\n");

  const realityLabel: Record<RumourReality, string> = {
    true: "essentially true",
    exaggeration: "exaggeration",
    misconception: "dangerous misconception",
  };

  const lore = [
    "### At a Glance",
    `- **Genre**: ${resolved.genre}`,
    `- **Tone**: ${resolved.tone}`,
    `- **Danger Level**: ${resolved.dangerLevel}`,
    "",
    entries
      .map(
        (entry, i) =>
          `### GM Notes — Rumour ${i + 1}\n- **Reality**: ${realityLabel[entry.reality]}\n- **What's Actually Happening**: ${entry.truthInfo.whatsHappening}\n- **If Investigated**: ${entry.truthInfo.ifInvestigated}`,
      )
      .join("\n\n"),
  ].join("\n");

  return render(
    resolved,
    `Word Around ${resolved.locationContext || "Town"}`,
    content,
    lore,
  );
}
