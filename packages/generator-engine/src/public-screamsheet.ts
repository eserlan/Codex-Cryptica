/**
 * Public Screamsheet generator (#1639) — a genre-flexible in-world news/rumour
 * handout generator, inspired by the cyberpunk "screamsheet" format but usable
 * across fantasy broadsheets, station newsfeeds, wasteland bulletins, and more.
 *
 * Framework-free per the unification plan (#1351): no AI client, no
 * sessionStorage. The web page builds prompts here, runs them through
 * aiClientManager, parses with parseScreamsheetResponse, and falls back to
 * generateScreamsheetLocal on failure. Session context is injected as a string.
 *
 * Output contract: `content` is the player-safe handout (masthead, lead story,
 * shorter articles, rumours, notices, adverts). `lore` is the GM version —
 * adventure hooks, the truth behind the stories, and entity seeds. Copying the
 * handout therefore never leaks GM-only material.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson, asString } from "./llm-response-utils";

export const screamsheetConfig = {
  genres: [
    "Fantasy",
    "Dark Fantasy",
    "Pirate",
    "Cyberpunk",
    "Sci-Fi",
    "Modern",
    "Horror",
    "Post-Apocalyptic",
    "Western",
    "Steampunk",
    "Lancer",
    "Space Opera Resistance",
    "Optimistic Exploration Sci-Fi",
  ],
  publicationTypesByGenre: {
    Fantasy: [
      "Town crier broadsheet",
      "Guild circular",
      "Market-square gossip sheet",
      "Royal gazette",
      "Temple bulletin",
    ],
    "Dark Fantasy": [
      "Plague-ward notice sheet",
      "Inquisition gazette",
      "Underground pamphlet",
      "Gravekeepers' register",
      "Cursed almanac",
    ],
    Pirate: [
      "Port-town broadside",
      "Bounty board digest",
      "Smugglers' tide-sheet",
      "Naval dispatch",
      "Tavern rumour roll",
    ],
    Cyberpunk: [
      "Street screamsheet",
      "Data-terminal newsfeed",
      "Corporate press release wire",
      "Pirate signal broadcast",
      "Gang-turf zine",
    ],
    "Sci-Fi": [
      "Station newsfeed",
      "Colony bulletin",
      "Trade-lane dispatch",
      "Fleet-wide broadcast",
      "Frontier relay digest",
    ],
    Modern: [
      "Local tabloid",
      "Community newsletter",
      "Conspiracy zine",
      "City desk daily",
      "Late-night radio transcript",
    ],
    Horror: [
      "Small-town weekly",
      "Occult circular",
      "Missing-persons digest",
      "Parish newsletter",
      "Anonymous chain letter",
    ],
    "Post-Apocalyptic": [
      "Bunker bulletin",
      "Caravan trade-sheet",
      "Settlement wall postings",
      "Radio relay transcript",
      "Scavengers' almanac",
    ],
    Western: [
      "Frontier weekly",
      "Telegraph digest",
      "Wanted-poster gazette",
      "Railroad company circular",
      "Saloon rumour board",
    ],
    Steampunk: [
      "Penny broadsheet",
      "Aether-wire dispatch",
      "Guild patent gazette",
      "Airship dock circular",
      "Agitators' pamphlet",
    ],
    Lancer: [
      "Union administrative bulletin",
      "Outpost comms digest",
      "Pilot mess-hall zine",
      "Corporate frontier wire",
      "Colonial settlement post",
    ],
    "Space Opera Resistance": [
      "Imperial propaganda wire",
      "Resistance underground broadcast",
      "Smugglers' port bulletin",
      "Scrap-town notice board",
      "Sector traffic digest",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Station promenade daily",
      "Fleet science digest",
      "Diplomatic corps briefing sheet",
      "Academy campus paper",
      "Frontier survey bulletin",
    ],
  } as Record<string, string[]>,
  tones: [
    "Sober & factual",
    "Tabloid & sensational",
    "Paranoid & conspiratorial",
    "State propaganda",
    "Gonzo & unhinged",
  ],
  biases: [
    "Independent (mostly)",
    "State or ruler-owned mouthpiece",
    "Corporate / guild-owned",
    "Faction propaganda organ",
    "Underground / pirate press",
    "Community volunteer-run",
  ],
  censorLevels: [
    "Uncensored",
    "Lightly edited",
    "Heavily censored (redactions show)",
    "Rewritten by the censor's office",
  ],
  hookDensities: ["Light (1 hook)", "Standard (2-3 hooks)", "Dense (4+ hooks)"],
};

export interface ScreamsheetGeneratorOptions {
  genre?: string;
  publicationType?: string;
  tone?: string;
  bias?: string;
  censorLevel?: string;
  hookDensity?: string;
  /** Optional settlement/region/publication name to anchor the sheet. */
  placeName?: string;
  /** Optional current crisis or headline event to lead with. */
  headlineEvent?: string;
  campaignContext?: string;
}

export interface ResolvedScreamsheet {
  genre: string;
  publicationType: string;
  tone: string;
  bias: string;
  censorLevel: string;
  hookDensity: string;
  placeName?: string;
  headlineEvent?: string;
  campaignContext?: string;
  varianceSeed: number;
}

export interface ScreamsheetPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedScreamsheet;
}

function resolveScreamsheet(
  options: ScreamsheetGeneratorOptions,
  rng: Rng,
): ResolvedScreamsheet {
  const genre = options.genre || pickFrom(screamsheetConfig.genres, rng);
  const publicationTypes =
    screamsheetConfig.publicationTypesByGenre[genre] ??
    screamsheetConfig.publicationTypesByGenre["Fantasy"];
  return {
    genre,
    publicationType: options.publicationType || pickFrom(publicationTypes, rng),
    tone: options.tone || screamsheetConfig.tones[1],
    bias: options.bias || screamsheetConfig.biases[0],
    censorLevel: options.censorLevel || screamsheetConfig.censorLevels[0],
    hookDensity: options.hookDensity || screamsheetConfig.hookDensities[1],
    placeName: options.placeName?.trim() || undefined,
    headlineEvent: options.headlineEvent?.trim() || undefined,
    campaignContext: options.campaignContext?.trim() || undefined,
    varianceSeed: Math.floor(rng() * 99991) + 10,
  };
}

export function buildScreamsheetPrompt(
  options: ScreamsheetGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): ScreamsheetPrompt {
  const resolved = resolveScreamsheet(options, rng);
  const systemInstruction = `You are an expert RPG campaign writer and in-world journalist. You generate immediately usable in-world news sheets ("screamsheets") for tabletop GMs in JSON format. You write in the register of the specified genre and editorial tone — a corporate cyberpunk newsfeed sounds nothing like a fantasy town crier's broadsheet, and a propaganda organ sounds nothing like a pirate press zine.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The publication's name — genre-appropriate and specific (e.g. 'The Gutter Signal', 'The Harbourside Ledger', 'Relay Nine Bulletin'). Avoid stock names like The Daily News or The Gazette on its own.",
  "summary": "One sentence: what this publication is, who runs it, and the issue's biggest story.",
  "content": "Markdown. This is the PLAYER-SAFE handout — never reveal GM secrets, the truth behind stories, or adventure-hook framing here. Use exactly this structure:\\n# <publication name>\\n*<tagline> — <issue number or in-world date>*\\n\\n## <LEAD HEADLINE IN THE PUBLICATION'S VOICE>\\nLead story: 3-5 sentences in the publication's voice, shaped by its bias and censor level.\\n\\n### <Second headline>\\n2-3 sentences.\\n\\n### <Third headline>\\n2-3 sentences.\\n\\n(2-4 secondary stories total)\\n\\n### Notices & Classifieds\\n- 3-5 short in-world classified ads, public notices, or personal messages\\n\\n### Word on the Street\\n- 2-4 rumours reported as hearsay\\n\\n### A Message from Our Sponsors\\nOne short in-world advert or piece of propaganda, in the sponsor's voice.",
  "lore": "Markdown. This is the GM VERSION. Use EXACTLY this structure:\\n### Editorial Slant\\n- **Publication**: name and type\\n- **Ownership / Bias**: who really controls it and what they spin\\n- **Censorship**: what was cut, softened, or invented this issue\\n### The Truth Behind the Stories\\n- **<headline>**: what actually happened, one entry per story that hides something\\n### Adventure Hooks\\n- hook (match the requested hook density; each hook ties to a story, rumour, or classified above and names who is involved and what the party can do)\\n### Entity Seeds\\n- 3-4 Codex entity suggestions arising from this issue (e.g. '**Character**: the missing dockhand')",
  "labels": ["2-4 lowercase genre-appropriate tags, plus 'rpg-handout', 'screamsheet-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every story, ad, and rumour must fit the genre's technology, slang, and concerns.
- The bias and censor level must visibly shape the writing — a censored sheet has suspicious gaps or bland euphemisms; a propaganda organ praises its owner.
- Stories should name specific people, places, and factions; at least one story, one rumour, and one classified should connect to the same underlying event from different angles.
- Rumours and classifieds should be specific and slightly wrong in interesting ways, not generic filler.
- The handout must read as a real in-world document a GM can print and hand to players.
- ${NAME_BAN_PROMPT}
${sessionContext}`;

  const userMessage = `Generate an in-world news sheet. Variation seed: ${resolved.varianceSeed}.
- Genre / Setting: ${resolved.genre}
- Publication Type: ${resolved.publicationType}
- Editorial Tone: ${resolved.tone}
- Ownership / Bias: ${resolved.bias}
- Censor Level: ${resolved.censorLevel}
- Hook Density: ${resolved.hookDensity}${resolved.placeName ? `\n- Settlement / Region / Publication Name: ${resolved.placeName}` : ""}${resolved.headlineEvent ? `\n- Current Crisis or Headline Event (lead with this): ${resolved.headlineEvent}` : ""}${resolved.campaignContext ? `\n- Campaign Context: ${resolved.campaignContext}` : ""}`;

  return { systemInstruction, userMessage, resolved };
}

export function parseScreamsheetResponse(text: string): PublicGeneratorOutput {
  const data = parseFencedJson<Record<string, unknown>>(text);
  return {
    type: "note",
    title: asString(data.title) || "The Unnamed Bulletin",
    summary: asString(data.summary),
    content: asString(data.content),
    lore: asString(data.lore),
    labels: Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string => typeof label === "string",
        )
      : ["rpg-handout", "screamsheet-generator", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Local table-based fallback
// ---------------------------------------------------------------------------

const PUBLICATION_ADJECTIVES = [
  "Gutter",
  "Harbourside",
  "Midnight",
  "Copper",
  "Crooked",
  "Honest",
  "Iron",
  "Grey",
  "Last",
  "Northside",
  "Broken",
  "Free",
];

const PUBLICATION_NOUNS_BY_GENRE: Record<string, string[]> = {
  Cyberpunk: ["Signal", "Feed", "Wire", "Static", "Uplink", "Splice"],
  "Sci-Fi": ["Relay", "Beacon", "Dispatch", "Transmission", "Orbit"],
  Modern: ["Ledger", "Observer", "Dispatch", "Record", "Examiner"],
  Horror: ["Vigil", "Lantern", "Register", "Witness", "Knell"],
  "Post-Apocalyptic": ["Bulletin", "Wind", "Salvage", "Warning", "Ember"],
  Western: ["Clarion", "Telegraph", "Sentinel", "Star", "Dust"],
  Steampunk: ["Gazette", "Cog", "Whistle", "Manifold", "Pressure"],
  Fantasy: ["Herald", "Crier", "Quill", "Bellman", "Proclamation"],
};

function publicationNouns(genre: string): string[] {
  return (
    PUBLICATION_NOUNS_BY_GENRE[genre] ?? PUBLICATION_NOUNS_BY_GENRE["Fantasy"]
  );
}

const TAGLINES = [
  "All the truth we are allowed to print",
  "First with the worst",
  "Read it before they deny it",
  "Independent since the last change of management",
  "The only sheet that pays its informants",
  "If we printed everything, we'd be dead",
];

const LEAD_EVENTS = [
  "a warehouse fire that officials call an accident and witnesses call anything but",
  "the disappearance of a well-known local figure, three days gone and counting",
  "a sudden shortage that has doubled prices overnight",
  "an arrest that has more to do with who was arrested than what they did",
  "an unexplained closure of a route everyone depends on",
  "a body found somewhere bodies are not supposed to be found",
];

const SECONDARY_STORIES = [
  {
    headline: "Local Authority Denies Everything, Twice",
    body: "A spokesperson dismissed the reports as rumour, then dismissed the follow-up questions as hostile. Observers note the denial arrived before anyone had made an accusation.",
  },
  {
    headline: "Prices Up, Patience Down at the Market",
    body: "Traders blame the routes. The routes blame the weather. The weather, as usual, declines to comment. Locals are stockpiling what they can carry.",
  },
  {
    headline: "Night Watch Doubled After 'Isolated Incident'",
    body: "The third isolated incident this month. Patrols have been doubled around the old quarter, though nobody official will say what they are watching for.",
  },
  {
    headline: "Notable Visitor Arrives With Unusual Escort",
    body: "A traveller of some means took rooms in the better part of town this week, accompanied by guards who do not dress like hired help. Their business here is unstated.",
  },
  {
    headline: "Repairs Announced for Structure That Was Fine Last Week",
    body: "Workers have sealed off the lower levels for 'long-planned maintenance'. Residents report the work crews arrive at night and leave before dawn.",
  },
];

const CLASSIFIEDS = [
  "LOST: One key, iron, old. No questions asked on return. Reward negotiable. Enquire at the sign of the lantern.",
  "WANTED: Discreet persons for short-term escort work. Must not be squeamish. Pay in advance, half on survival.",
  "FOR SALE: Storage space, dry, private, recently vacated. Owner motivated. Viewing by night only.",
  "SEEKING: Anyone with knowledge of a vessel, cart, or caravan that left in a hurry last week. Family is worried. Others are also asking.",
  "NOTICE: The establishment formerly known for its back room wishes it known that there is no back room and never was.",
  "PERSONAL: M — the arrangement stands. Same place. Bring what you owe. — V",
];

const RUMOURS = [
  "Someone has been buying up debts around the old quarter — quietly, and at full price",
  "A watchman resigned mid-shift last week and has not been seen since",
  "The recent 'accident' left marks no accident leaves, according to one who saw it",
  "There is a new face collecting protection money, and the old faces have not objected",
  "Cargo is moving through town at night without paying tolls — which means someone important already got paid",
];

const NOTICES = [
  "By order of the authority: the curfew remains in effect for everyone it has always applied to.",
  "Public reminder: reporting suspicious activity is a civic duty. Reporting it accurately is appreciated but optional.",
  "The census has been postponed again. Citizens are asked to remain countable.",
];

const ADVERTS = [
  "TRUSTED HANDS SECURITY — because the watch works for someone, and it isn't you.",
  "GRANDMOTHER'S REMEDY — for aches, dread, and memories. Now in the larger bottle.",
  "THE HONEST SCALES, PURVEYORS OF GOODS — everything legitimate, receipts on request, no refunds.",
];

const HOOKS = [
  "The lead story is wrong about one load-bearing detail — a name. Whoever fed the publication that name wanted the real person protected, and will pay to keep it that way.",
  "The classified about lost property was placed by someone who cannot go to the authorities. What they lost is worth far more than the reward, and others have noticed the ad.",
  "One of the rumours is entirely true, and the person it concerns knows the sheet printed it. They want to know who talked, and they are hiring outsiders to find out.",
  "The publication's editor is sitting on the real story and is looking for deniable freelancers to confirm one final fact before printing it — or selling it back to its subject.",
  "The advert is a coded message. Anyone who answers it precisely as written receives a very different offer than the one printed.",
  "A censor's redaction in this issue was sloppy — part of a location is still legible. The party are not the only readers who noticed.",
];

function hookCount(hookDensity: string): number {
  if (hookDensity.startsWith("Light")) return 1;
  if (hookDensity.startsWith("Dense")) return 4;
  return 2;
}

export function generateScreamsheetLocal(
  options: ScreamsheetGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveScreamsheet(options, rng);
  const publicationName =
    resolved.placeName ||
    `The ${pickFrom(PUBLICATION_ADJECTIVES, rng)} ${pickFrom(publicationNouns(resolved.genre), rng)}`;
  const tagline = pickFrom(TAGLINES, rng);
  const issueNumber = Math.floor(rng() * 900) + 12;
  const leadEvent = resolved.headlineEvent || pickFrom(LEAD_EVENTS, rng);
  const stories = pickRandomItems(SECONDARY_STORIES, 3, rng);
  const classifieds = pickRandomItems(CLASSIFIEDS, 4, rng);
  const rumours = pickRandomItems(RUMOURS, 3, rng);
  const notice = pickFrom(NOTICES, rng);
  const advert = pickFrom(ADVERTS, rng);
  const hooks = pickRandomItems(HOOKS, hookCount(resolved.hookDensity), rng);
  const witnessName = generateName(rng);
  const editorName = generateName(rng);

  const summary = `Issue ${issueNumber} of ${publicationName}, a ${resolved.tone.toLowerCase()} ${resolved.publicationType.toLowerCase()} whose lead story concerns this: ${leadEvent}.`;

  const content = `# ${publicationName}
*${tagline} — Issue No. ${issueNumber}*

## THE STORY THEY DIDN'T WANT ON THE FRONT PAGE
This publication has confirmed what the street already suspects: ${leadEvent}. Official sources describe the situation as under control, which readers will recognise as the phrase officials use when it is not. A witness, ${witnessName}, spoke to us on condition that we print their account exactly as given — we have, minus the parts our ${resolved.censorLevel === "Uncensored" ? "lawyers" : "censors"} removed.${resolved.campaignContext ? ` Readers following events in ${resolved.campaignContext} will draw their own conclusions.` : ""}

### ${stories[0].headline}
${stories[0].body}

### ${stories[1].headline}
${stories[1].body}

### ${stories[2].headline}
${stories[2].body}

### Notices & Classifieds
- ${notice}
${classifieds.map((c) => `- ${c}`).join("\n")}

### Word on the Street
${rumours.map((r) => `- ${r}`).join("\n")}

### A Message from Our Sponsors
${advert}`;

  const lore = `### Editorial Slant
- **Publication**: ${publicationName} — ${resolved.publicationType}
- **Ownership / Bias**: ${resolved.bias}. Editor ${editorName} decides what runs — and what gets buried.
- **Censorship**: ${resolved.censorLevel}. Assume at least one story this issue was softened, and one was killed entirely.

### The Truth Behind the Stories
- **The lead story**: The witness ${witnessName} saw more than was printed; the missing detail identifies someone with the power to make witnesses disappear.
- **${stories[0].headline}**: The official denial is technically accurate and completely misleading.

### Adventure Hooks
${hooks.map((h) => `- ${h}`).join("\n")}

### Entity Seeds
- **📰 ${publicationName}**: The publication itself — its office, press, and archive are all scene-worthy locations.
- **👤 ${editorName} (editor)**: Knows more than the sheet prints, and owes protection to the people who let it keep printing.
- **👤 ${witnessName} (witness)**: The lead story's source, now a loose end someone may want tidied.
- **👥 Whoever is behind the lead story**: The faction or figure the printed version carefully fails to name.`;

  return {
    type: "note",
    title: `${publicationName} — Issue ${issueNumber}`,
    summary,
    content,
    lore,
    labels: ["rpg-handout", "screamsheet-generator", "imported-draft"],
    status: "active",
  };
}
