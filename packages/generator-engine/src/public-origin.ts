/**
 * Public Superhero Origin generator (#3111) — one of six candidate
 * superhero-native generators evaluated individually out of the #2288 epic.
 *
 * Superhero / Comic Book only, by design: this generator does not take a
 * `genre` option and has no per-theme tables (see the add-generator skill's
 * Part C note on this issue — origins are inherently a superhero-genre
 * concept, not a flavour of a genre-agnostic table).
 *
 * The epic's key design constraint for this generator: an origin must not
 * merely explain where a power came from. Every generated origin structurally
 * separates three things, each its own explicit prompt/schema field and its
 * own local-fallback field, so a "just a backstory paragraph" result is
 * impossible by construction:
 *   1. What happened (the origin event itself) — `content`'s "### The Origin".
 *   2. At least one concrete, GM-usable campaign hook stemming from it —
 *      `content`'s "### Campaign Hook" (required, validated on parse).
 *   3. At least one ongoing consequence/complication that persists after the
 *      origin story has been told — `lore`'s "### Ongoing Consequence"
 *      (required, validated on parse).
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson, sanitizeText } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";

/** One profile per origin type in the issue's list, plus "Random". */
interface OriginProfile {
  name: string;
  /** What happened — the concrete origin event itself, several variants. */
  events: readonly string[];
  /** At least one concrete, GM-usable campaign hook stemming from the event. */
  hooks: readonly string[];
  /** At least one ongoing consequence/complication the event does not resolve. */
  consequences: readonly string[];
}

const ORIGIN_PROFILES: readonly OriginProfile[] = [
  {
    name: "Mutation",
    events: [
      "A dormant trait in their bloodline activated without warning, mid-ordinary-life, rewriting their body over the course of a single terrifying week.",
      "Their powers emerged at puberty, faster and further than anyone else's on record, and the changes have not fully stopped yet.",
      "A latent gene triggered after a routine medical scan flagged an anomaly nobody could explain until the transformation began days later.",
    ],
    hooks: [
      "A geneticist wants a tissue sample, and won't say who is funding the study or what they plan to do with what they learn.",
      "Someone else with the same dormant trait has just gone public, and reporters have started asking whether the two of them are related.",
      "A support group for people going through the same changes has attracted the attention of an organisation offering to 'help' — for a price nobody has read the fine print on.",
    ],
    consequences: [
      "The changes have not stabilised — every few months something new shifts, and there is no way to know what the next change will cost them.",
      "Blood relatives share the same dormant trait, and the hero cannot warn them without exposing what they now are.",
      "The trait is hereditary and detectable by a simple test, which makes every relative a potential target for anyone hunting people like them.",
    ],
  },
  {
    name: "Accident",
    events: [
      "An industrial malfunction exposed them to something that was never meant to touch a person, and they survived — changed — when the incident report says no one should have.",
      "A transport accident should have killed them; instead they woke up in the wreckage with abilities the paramedics had no explanation for.",
      "A laboratory containment failure they were nowhere near authorised to be inside of left them altered and the facility quietly covering up what actually happened.",
    ],
    hooks: [
      "The company responsible for the accident has offered a settlement contingent on a non-disclosure agreement that would also sign away any claim to their own biology.",
      "A journalist has obtained the original incident report and it does not match the official story the hero was told.",
      "Another person caught in the same accident never surfaced afterward, and their family is still looking for answers the hero might be able to give — or might be safer not to.",
    ],
    consequences: [
      "The site of the accident is still active, still hazardous, and still owned by people with every reason to make sure nobody investigates it twice.",
      "The exact cause was never established, which means whatever did this to them could happen again — to someone else, or to them, differently.",
      "The official incident report has their name redacted from it, meaning someone with the authority to edit federal or corporate records already knows exactly what they are.",
    ],
  },
  {
    name: "Scientific Experiment",
    events: [
      "They volunteered for a clinical trial that promised something far more modest than what it actually delivered, and the researchers were as startled as they were.",
      "A private lab selected them without full disclosure, and by the time they understood what the programme actually was, the changes were already irreversible.",
      "They were a control subject, not a test subject — the experiment was never supposed to affect them, and no one has explained why it did.",
    ],
    hooks: [
      "The lead researcher has resurfaced under a new name at a different institution, running a strikingly similar programme.",
      "A rival lab wants to replicate the results and has been quietly reaching out to the hero's old contacts to get closer to them.",
      "The original test data is being subpoenaed in an unrelated lawsuit, and the hero's real identity is buried three exhibits deep in the discovery documents.",
    ],
    consequences: [
      "Whatever was done to them requires a maintenance dose, procedure, or condition they do not fully control access to.",
      "The programme kept detailed biometric data on them that someone, somewhere, still has — and has never explained why they wanted it.",
      "Other subjects from the same programme did not survive the process, and nobody has ever told the hero why they were the exception.",
    ],
  },
  {
    name: "Technology",
    events: [
      "A prototype device bonded to them during what should have been a routine field test, and neither the hero nor its manufacturer can fully remove it now.",
      "They built or acquired the technology themselves, refining it in secret until it started refining them back in ways the schematics never predicted.",
      "Salvaged hardware from a decommissioned programme activated the first time they touched it, and it has not fully powered down since.",
    ],
    hooks: [
      "The technology's original manufacturer has noticed the pattern of energy signatures it emits and has started tracking them.",
      "A black-market broker is offering serious money for a working sample of the technology's core component, no questions about the source.",
      "The device's software occasionally receives update packets from a source the hero has never been able to trace.",
    ],
    consequences: [
      "The technology degrades, drains, or malfunctions under specific conditions, and the hero has not found a permanent fix.",
      "Whoever designed the technology retains some form of access, override capability, or diagnostic telemetry they never disclosed.",
      "The hero's powers are only as reliable as hardware built by someone else, for a purpose that was not originally theirs.",
    ],
  },
  {
    name: "Magic / Occult Initiation",
    events: [
      "They were inducted, willingly or otherwise, into a tradition far older than they understood at the time, and the binding cannot be undone.",
      "A ritual meant for someone else was performed on them by mistake — or so they have been told — and the power took anyway.",
      "They stumbled into a rite already in progress and were marked by it before anyone present could stop what was happening.",
    ],
    hooks: [
      "The tradition that initiated them wants something back, and has sent an emissary to collect on terms the hero never agreed to in writing.",
      "A rival practitioner has identified the mark on them and is offering to 'free' them from it — for a cost they have not yet named.",
      "The original ritual site has been rediscovered by developers, occultists, or the press, and whatever remains there is not inert.",
    ],
    consequences: [
      "The binding comes with an obligation, taboo, or debt the hero has never been able to fully satisfy or escape.",
      "Their power responds to the tradition's own symbols and triggers, which means anyone who knows the tradition has a measure of leverage over them.",
      "The initiation was incomplete, unstable, or performed by someone who is no longer available to explain what it actually did to them.",
    ],
  },
  {
    name: "Alien Heritage",
    events: [
      "They learned, later than most people learn anything about themselves, that one parent or ancestor was not of this world.",
      "A dormant physiology activated when they were finally exposed to a condition — a frequency, an environment, a proximity — their heritage was quietly built to respond to.",
      "They were raised entirely human and entirely unaware, until contact from their heritage's people forced the truth into the open.",
    ],
    hooks: [
      "A representative of their heritage's people has arrived asking them to return, fulfil an obligation, or take up a role they never agreed to.",
      "Evidence of their heritage has surfaced somewhere public, and a government agency wants to talk to them about it before anyone else does.",
      "Someone hunting members of their heritage across worlds has found a lead pointing at them specifically.",
    ],
    consequences: [
      "Their physiology reacts to something specific to their heritage — a substance, a frequency, a condition — that most doctors on Earth have no way to test for or treat.",
      "Their heritage's people have expectations, laws, or claims on them that Earth's institutions have no framework for recognising.",
      "What they know about their own heritage came from one source, who may not have told them the whole truth.",
    ],
  },
  {
    name: "Artefact",
    events: [
      "An object with no clear origin came into their possession, and by the time they realised it was changing them, it had already stopped coming off.",
      "They were chosen — by mechanism, ritual, or simple proximity — as the current bearer of an artefact with a documented history of previous bearers.",
      "The artefact was meant for someone else entirely, and answered to them instead for reasons no one, including the artefact's previous keepers, can explain.",
    ],
    hooks: [
      "A collector, cult, or institution that has been tracking the artefact for generations has identified the hero as its current bearer.",
      "A previous bearer, or their descendants, believes the artefact rightfully belongs to their bloodline and wants it back.",
      "The artefact reacts to a specific ritual, location, or counterpart object that has just resurfaced somewhere the hero can reach.",
    ],
    consequences: [
      "The artefact is not fully understood, even by the hero, and its behaviour changes under conditions they have not been able to map.",
      "Previous bearers came to bad ends, and nobody has explained why, or whether the pattern is coincidence.",
      "The power is the artefact's, not theirs — if it is ever lost, stolen, or destroyed, they do not know what remains of who they have become.",
    ],
  },
  {
    name: "Cosmic Event",
    events: [
      "A stellar or dimensional event passed through the region at the exact moment they were exposed, and they are the only known person it changed rather than killed.",
      "They were struck by a phenomenon astronomers are still arguing about, and the changes did not fully manifest until weeks after the event itself had ended.",
      "A convergence of forces far beyond anything terrestrial briefly intersected with their location, and the door it opened has not entirely closed.",
    ],
    hooks: [
      "The event left a residue, aftershock, or echo that scientists have traced back to the hero's exact location, and they want to study it — and them.",
      "Others caught at the edge of the same event are beginning to surface, and not all of them survived it as cleanly as the hero did.",
      "The event is due to recur, on a cycle someone has only just worked out, and it is approaching a populated area.",
    ],
    consequences: [
      "The hero's connection to whatever caused the event has never fully closed, and it occasionally reaches back toward them in ways they cannot predict or control.",
      "The scientific and government interest in the event has never stopped, and the hero is the single most valuable, most trackable piece of evidence that it happened.",
      "What touched them was not natural, in any sense their world recognises, and no expert has yet told them what it actually was.",
    ],
  },
  {
    name: "Inherited Mantle",
    events: [
      "A predecessor passed the mantle to them — by choice, by accident, or by death — and they accepted a legacy they were not fully prepared to carry.",
      "They discovered they were always the intended successor, groomed for the role since childhood without ever being told what it actually was.",
      "The mantle chose them directly when its previous bearer fell, bypassing anyone more experienced who might have expected to inherit it instead.",
    ],
    hooks: [
      "A rival who expected to inherit the mantle themselves has resurfaced, publicly disputing the hero's claim to it.",
      "The mantle's previous bearer left behind unfinished business — a promise, an enemy, a debt — that the hero has now inherited along with the power.",
      "An old ally of the previous bearer refuses to trust the new one, and their cooperation is something the hero desperately needs.",
    ],
    consequences: [
      "The mantle comes with obligations, rivals, or enemies that were never the hero's own, inherited whether they wanted them or not.",
      "They are still learning to use a power that someone else spent a lifetime mastering, and the gap shows at the worst possible moments.",
      "Whatever forced the mantle to change hands the first time has never been fully explained, and there is no guarantee it cannot happen again.",
    ],
  },
  {
    name: "Government Programme",
    events: [
      "They were recruited into a classified programme under promises that turned out to be only partly true, and the changes it made are not ones they can walk back.",
      "They were a programme's unwilling subject before they were ever its willing asset, and the line between the two still is not entirely clear to them.",
      "The programme that created them was shut down, its records sealed, and they were left to work out what had actually been done to them on their own.",
    ],
    hooks: [
      "A congressional or oversight investigation into the programme has subpoenaed records that include the hero's real identity.",
      "A former handler wants to reactivate their old arrangement, citing a clause in a contract the hero thought was long dead.",
      "Another asset from the same programme has gone rogue, and the agency wants the hero to help bring them in — or silence them.",
    ],
    consequences: [
      "The agency behind the programme retains some claim on them — a contract, a kill switch, a debt — that has never been fully resolved.",
      "Classified records of exactly what was done to them exist, are not under their control, and could surface at any time.",
      "Other people went through the same programme and did not come out the other side as intact, and the hero has never learned the full account of what happened to them.",
    ],
  },
  {
    name: "Divine / Extradimensional Intervention",
    events: [
      "A being from beyond ordinary reality selected them for a purpose it has only partly explained, and the power it granted came with the being's continued attention attached.",
      "They crossed briefly into another plane and came back changed, carrying something of that place with them that has not fully faded.",
      "An entity intervened at the last possible moment to save their life, and the price of that intervention is still being worked out.",
    ],
    hooks: [
      "The being that intervened has asked for something in return, phrased vaguely enough that the hero is not certain what they have actually agreed to.",
      "Worshippers, cultists, or scholars devoted to the intervening entity have identified the hero as touched by it, and want access, blessing, or proof.",
      "A rival power from the same plane objects to the intervention and has taken an interest in undoing it.",
    ],
    consequences: [
      "The being's attention has never fully withdrawn, and the hero can occasionally feel it watching, testing, or nudging events around them.",
      "The intervention changed something fundamental about how they relate to their own reality, in ways doctors, priests, and scientists all describe differently and none of them fully explain.",
      "Whatever the entity wants in return has never been stated in full, and the hero suspects they will only learn the true cost when it is called in.",
    ],
  },
];

const ORIGIN_TYPE_NAMES = ORIGIN_PROFILES.map((p) => p.name);

export const originConfig = {
  originTypes: ["Random", ...ORIGIN_TYPE_NAMES],
  tones: [
    "Heroic",
    "Grim",
    "Pulpy",
    "Tragic",
    "Mysterious",
    "Hopeful",
    "Paranoid",
  ],
} as const;

/** Original codenames — no existing comic-book IP, checked against BANNED_NAMES. */
const CODENAMES = [
  "Voltframe",
  "Nightglass",
  "Ferrowing",
  "Emberlatch",
  "Greyfathom",
  "Ironvane",
  "Duskcurrent",
  "Halcyon Drift",
  "Redshear",
  "Cinderpath",
  "Wraithcoil",
  "Sablelight",
] as const;

export interface OriginGeneratorOptions {
  originType?: string;
  tone?: string;
  campaignContext?: string;
}

export interface ResolvedOrigin {
  originType: string;
  tone: string;
  campaignContext?: string;
  codename: string;
}

function resolveOriginType(requested: string | undefined, rng: Rng): string {
  if (!requested || requested === "Random")
    return pickFrom(ORIGIN_TYPE_NAMES, rng);
  const match = ORIGIN_TYPE_NAMES.find(
    (t) => t.toLowerCase() === requested.toLowerCase(),
  );
  return match ?? requested;
}

function resolveOrigin(
  options: OriginGeneratorOptions,
  rng: Rng,
): ResolvedOrigin {
  return {
    originType: resolveOriginType(options.originType, rng),
    tone: options.tone || pickFrom(originConfig.tones, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    codename: pickFrom(CODENAMES, rng),
  };
}

export interface OriginPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedOrigin;
}

function buildConsistencyPass(tone: string): string {
  return `Before returning, run a consistency pass: "### Campaign Hook" must name a concrete, usable-tonight hook that follows directly from the specific event described in "### The Origin" — not a generic hook that could belong to any origin; "### Ongoing Consequence" must describe a complication that the origin story being told does NOT resolve, and it must be distinct from the Campaign Hook, not a restatement of it; the tone (${tone}) should be legible in how the origin event and its consequence are written, not just asserted; and the hero's codename/title must not be a banned or generic placeholder name.`;
}

export function buildOriginPrompt(
  options: OriginGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): OriginPrompt {
  const resolved = resolveOrigin(options, rng);

  const userMessage = `Generate a Superhero / Comic Book origin story in JSON format. This is a Superhero / Comic Book setting only — do not soften it into a generic fantasy or sci-fi backstory. Original concepts only: do not name or closely imitate any existing comic-book character, team, organisation, or artefact.

The single most important rule: an origin is not merely an explanation of where a power came from. It MUST structurally separate three things, each its own field below, and each must be concrete and specific to this hero rather than generic:
1. What actually happened (the origin event itself).
2. At least one usable campaign hook that a GM could drop into a session directly, stemming specifically from that event.
3. At least one ongoing consequence or complication that persists — something the origin story being told does NOT resolve, wrap up, or make safe.

Options:
- Origin Type: ${resolved.originType}
- Tone: ${resolved.tone}
${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "The hero's codename or chosen title (2-5 words), fitting the tone and origin type",
  "content": "Player/table-facing markdown with exactly these sections, in this order: '### The Origin' (a vivid, concrete account of what actually happened — the specific event, not a vague summary), '### What the World Knows' (the public or rumoured version, if it differs from the truth — state plainly if there is no public knowledge of it at all), '### Campaign Hook' (at least one concrete, immediately usable hook a GM could run tonight, stemming directly from the specific origin event above — not a generic hook that could belong to any hero).",
  "lore": "GM-only markdown with exactly these sections, in this order: '### The Full Truth' (whatever the GM knows that the public account in 'What the World Knows' leaves out or gets wrong), '### Ongoing Consequence' (at least one unresolved complication, cost, or danger that continues because of this origin — it must NOT be solved simply by the origin story being known or told, and must be distinct from the Campaign Hook above), '### Who Knows' (who, if anyone, is aware of the full truth), '### Further Hooks' (one or two optional additional hooks or complications for later sessions).",
  "labels": ["origin-generator", "superhero", "character-generator", "imported-draft"]
}
${buildConsistencyPass(resolved.tone)}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates original superhero origin stories for tabletop RPG campaigns in JSON format. Origins must be usable campaign material — a concrete event, a GM-usable hook, and a lasting consequence — never just a backstory paragraph.",
    userMessage,
    resolved,
  };
}

function sectionPresent(markdown: string, heading: string): boolean {
  return new RegExp(
    `^###\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "im",
  ).test(markdown);
}

export function parseOriginResponse(
  text: string,
  resolved: ResolvedOrigin,
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    content?: unknown;
    lore?: unknown;
    labels?: unknown;
  }>(text);

  const content = typeof data.content === "string" ? data.content.trim() : "";
  const lore = typeof data.lore === "string" ? data.lore.trim() : "";

  if (!content) {
    throw new Error("Origin response is missing content.");
  }
  if (!lore) {
    throw new Error("Origin response is missing lore.");
  }
  if (!sectionPresent(content, "Campaign Hook")) {
    throw new Error(
      "Origin response is missing a '### Campaign Hook' section in content.",
    );
  }
  if (!sectionPresent(lore, "Ongoing Consequence")) {
    throw new Error(
      "Origin response is missing an '### Ongoing Consequence' section in lore.",
    );
  }

  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : resolved.codename;
  const forbidden = new Set(BANNED_NAMES.map((n) => n.toLowerCase()));
  if (forbidden.has(title.toLowerCase())) {
    throw new Error("Origin response uses a banned title.");
  }

  const labels = Array.isArray(data.labels)
    ? data.labels.filter(
        (item): item is string => typeof item === "string" && !!item.trim(),
      )
    : [
        "origin-generator",
        "superhero",
        "character-generator",
        "imported-draft",
      ];
  if (!labels.includes("origin-generator")) labels.unshift("origin-generator");

  return {
    type: "character",
    title,
    summary: typeof data.summary === "string" ? sanitizeText(data.summary) : "",
    content: sanitizeText(content),
    lore: sanitizeText(lore),
    labels,
    status: "active",
  };
}

/**
 * Local (non-AI) fallback. Each origin type's event/hook/consequence come
 * from that type's own profile, so the structural separation the issue
 * requires (event vs hook vs consequence) is enforced even without AI, and
 * the hook always follows from the specific event picked, not a shared pool.
 */
export function generateOriginLocal(
  options: OriginGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveOrigin(options, rng);
  const profile =
    ORIGIN_PROFILES.find((p) => p.name === resolved.originType) ??
    ORIGIN_PROFILES[0];

  const event = pickFrom(profile.events, rng);
  const hook = pickFrom(profile.hooks, rng);
  const consequence = pickFrom(profile.consequences, rng);

  const publicVersionVariants = [
    `Most people who have heard of ${resolved.codename} know only a simplified, secondhand version of this — close enough to be believable, wrong enough to be dangerous if relied upon.`,
    `There is no public account of this at all. As far as anyone outside a very small circle is concerned, ${resolved.codename} simply appeared one day with no explanation offered or asked for.`,
    `A garbled version has circulated in whispers and tabloid speculation, most of it wrong in ways ${resolved.codename} has never bothered to correct.`,
  ] as const;

  const content = `### The Origin
${event}

### What the World Knows
${pickFrom(publicVersionVariants, rng)}

### Campaign Hook
${hook}`;

  const whoKnowsVariants = [
    "A tight handful of people know the full account — and at least one of them has never been asked to keep it secret, only assumed to.",
    "Officially, no one does. Unofficially, at least one organisation has a file that says otherwise.",
    "One person who was there at the time is still alive and has never told anyone the whole truth — including the hero.",
  ] as const;

  const lore = `### The Full Truth
The account in "### The Origin" is accurate to what actually happened, in a ${resolved.tone.toLowerCase()} register — but the version circulating publicly leaves out exactly the details that would let someone trace it back to its source.

### Ongoing Consequence
${consequence}

### Who Knows
${pickFrom(whoKnowsVariants, rng)}

### Further Hooks
- Someone researching the origin type ${resolved.originType.toLowerCase()} in general has stumbled close enough to the hero's specific case to ask uncomfortable questions.
- A person or organisation connected to the origin event resurfaces, unaware or uncaring that the hero has since moved on.`;

  return {
    type: "character",
    title: resolved.codename,
    summary: `A ${resolved.tone.toLowerCase()} superhero origin: ${resolved.originType.toLowerCase()}, with a live campaign hook and a consequence that the origin story itself never resolves.`,
    content,
    lore,
    labels: [
      "origin-generator",
      "superhero",
      "character-generator",
      "imported-draft",
    ],
    status: "active",
  };
}
