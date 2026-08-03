/**
 * World Generator — an offline-first foundation for detailed sci-fi planets,
 * moons, and artificial worlds. The campaign registry adds vault context when
 * an AI-enhanced draft is requested; this module remains pure and reusable.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";

export const worldConfig = {
  worldTypes: [
    "Terrestrial World",
    "Ocean World",
    "Desert World",
    "Ice World",
    "Volcanic World",
    "Gas Giant Moon",
    "Artificial World",
  ],
  habitability: [
    "Earthlike",
    "Marginal",
    "Hostile",
    "Habitable with technology",
    "Impossible without technology",
  ],
  civilisations: [
    "Uninhabited",
    "Colony",
    "Frontier",
    "Developed World",
    "Ecumenopolis",
    "Fallen Civilisation",
  ],
  societalModels: [
    "Scientific Expedition",
    "Pilgrimage World",
    "Military Protectorate",
    "Indigenous Civilisation",
    "Resort or Sanctuary",
    "Prison Society",
    "Distributed Machine Culture",
    "Post-Scarcity Enclave",
    "Multigenerational Refugee Settlement",
    "Contested Diplomatic Neutral Zone",
  ],
  worldTags: [
    "Abandoned Colony",
    "Alien Ruins",
    "Altered Humanity",
    "Anarchists",
    "Anthropomorphs",
    "Area 51",
    "Badlands World",
    "Battleground",
    "Beastmasters",
    "Bubble Cities",
    "Cheap Life",
    "Civil War",
    "Cold War",
    "Colonized Population",
    "Cultural Power",
    "Cybercommunists",
    "Cyborgs",
    "Cyclical Doom",
    "Desert World",
    "Doomed World",
    "Dying Race",
    "Eugenic Cult",
    "Exchange Consulate",
    "Fallen Hegemon",
    "Feral World",
    "Flying Cities",
    "Forbidden Tech",
    "Former Warriors",
    "Freak Geology",
    "Freak Weather",
    "Friendly Foe",
    "Gold Rush",
    "Great Work",
    "Hatred",
    "Heavy Industry",
    "Heavy Mining",
    "Hivemind",
    "Holy War",
    "Hostile Biosphere",
    "Hostile Space",
    "Immortals",
    "Local Specialty",
    "Local Tech",
    "Major Spaceyard",
    "Mandarinate",
    "Mandate Base",
    "Maneaters",
    "Megacorps",
    "Mercenaries",
    "Minimal Contact",
    "Misandry/Misogyny",
    "Night World",
    "Nomads",
    "Oceanic World",
    "Out of Contact",
    "Outpost World",
    "Perimeter Agency",
    "Pilgrimage Site",
    "Pleasure World",
    "Police State",
    "Post-Scarcity",
    "Preceptor Archive",
    "Pretech Cultists",
    "Primitive Aliens",
    "Prison Planet",
    "Psionics Academy",
    "Psionics Fear",
    "Psionics Worship",
    "Quarantined World",
    "Radioactive World",
    "Refugees",
    "Regional Hegemon",
    "Restrictive Laws",
    "Revanchists",
    "Revolutionaries",
    "Rigid Culture",
    "Rising Hegemon",
    "Ritual Combat",
    "Robots",
    "Seagoing Cities",
    "Sealed Menace",
    "Secret Masters",
    "Sectarians",
    "Seismic Instability",
    "Shackled World",
    "Societal Despair",
    "Sole Supplier",
    "Taboo Treasure",
    "Terraform Failure",
    "Theocracy",
    "Tomb World",
    "Trade Hub",
    "Tyranny",
    "Unbraked AI",
    "Urbanized Surface",
    "Utopia",
    "Warlords",
    "Xenophiles",
    "Xenophobes",
    "Zombies",
  ],
  defaultWorldTags: ["Colonized Population", "Local Specialty"],
  genres: ["Hard Sci-Fi", "Space Opera", "Cyberpunk", "Hopeful Sci-Fi"],
  names: [
    "Aster Vale",
    "Khepri IV",
    "Nacre-3",
    "Nacre",
    "Orison",
    "Vanta Reach",
    "Vanta Reach 12B",
    "Thalassa",
    "Cinderwake Survey 4",
    "Cinderwake",
  ],
} as const;

export interface WorldTagProfile {
  tag: string;
  friends: readonly string[];
  enemies: readonly string[];
  complications: readonly string[];
  things: readonly string[];
  places: readonly string[];
}

type WorldTagProfileSeed = Omit<WorldTagProfile, "tag">;

const WORLD_TAG_PROFILE_SEEDS: Partial<Record<string, WorldTagProfileSeed>> = {
  "Abandoned Colony": {
    friends: ["A caretaker who kept the settlement's last life-support ledger"],
    enemies: [
      "A salvage crew willing to cut the colony apart while people remain",
    ],
    complications: [
      "The colony's legal owner has returned, but its surviving residents reject the claim",
    ],
    things: [
      "A maintenance archive containing one omission that changes the colony's history",
    ],
    places: [
      "A sealed residential block still running on an autonomous schedule",
    ],
  },
  "Alien Ruins": {
    friends: [
      "A careful translator who wants the site preserved rather than exploited",
    ],
    enemies: [
      "A research sponsor whose funding depends on a spectacular discovery",
    ],
    complications: [
      "The ruins respond differently to locals, visitors, and machines",
    ],
    things: [
      "A tool whose purpose is clear but whose operating assumptions are not",
    ],
    places: [
      "A ruin chamber whose layout changes when nearby infrastructure draws power",
    ],
  },
  "Colonized Population": {
    friends: [
      "A registrar who knows which families were left out of the official census",
    ],
    enemies: [
      "A citizenship office that can make a household's legal existence disappear",
    ],
    complications: [
      "A new arrival cohort needs housing and work before the old districts will accept it",
    ],
    things: [
      "An incomplete census that proves two communities have incompatible claims",
    ],
    places: [
      "A layered immigration district built around an obsolete transport terminal",
    ],
  },
  "Local Specialty": {
    friends: [
      "A craftworker whose livelihood depends on keeping the specialty accessible",
    ],
    enemies: [
      "A broker trying to turn a local practice into a controlled export",
    ],
    complications: [
      "The specialty is valuable because of a fragile custom or ecological limit",
    ],
    things: [
      "A tool, recipe, strain, or process that cannot be reproduced off-world",
    ],
    places: [
      "A workshop or growing site where the specialty is made under strict local rules",
    ],
  },
  "Trade Hub": {
    friends: [
      "A neutral broker who can open doors but cannot guarantee safe passage",
    ],
    enemies: [
      "A logistics cartel that profits from keeping two routes technically available",
    ],
    complications: [
      "A shipment is legal in one jurisdiction and contraband in the next",
    ],
    things: [
      "A manifest whose harmless cargo hides the real balance of power at the hub",
    ],
    places: [
      "A transfer concourse where customs, markets, and informal arbitration overlap",
    ],
  },
  "Terraform Failure": {
    friends: [
      "A field engineer who knows which failing system can still be saved",
    ],
    enemies: [
      "A contractor protecting the reputation of the original terraforming project",
    ],
    complications: [
      "Repairing one climate system shifts the burden onto another region",
    ],
    things: [
      "A control key or environmental model that is valuable only with its missing context",
    ],
    places: [
      "A half-functioning climate installation surrounded by settlements that depend on it",
    ],
  },
  Refugees: {
    friends: [
      "A community organiser balancing welcome, security, and scarce housing",
    ],
    enemies: [
      "A political broker who turns displaced families into a permanent voting bloc",
    ],
    complications: [
      "The refugees' safest route requires cooperation with the people they fled",
    ],
    things: [
      "A portable archive of names, debts, and promises that several factions want",
    ],
    places: [
      "A temporary district that has become too established to remain temporary",
    ],
  },
  Robots: {
    friends: [
      "A maintenance robot whose practical loyalties are more nuanced than its owners expect",
    ],
    enemies: [
      "An authority that treats every autonomous machine as stolen property",
    ],
    complications: [
      "The machines agree on the immediate task but not on who has standing to issue it",
    ],
    things: [
      "A damaged command protocol that grants access without explaining responsibility",
    ],
    places: [
      "A repair yard where human and machine labour have become impossible to separate",
    ],
  },
  "Sealed Menace": {
    friends: [
      "A warden who has spent years preventing panic without being heard",
    ],
    enemies: [
      "A faction that believes the sealed threat is the key to its political future",
    ],
    complications: [
      "The seal is failing for a mundane reason, but opening it may reveal a second danger",
    ],
    things: [
      "A warning record whose missing final section changes what the seal was meant to contain",
    ],
    places: [
      "A maintenance perimeter where ordinary workers unknowingly guard the sealed site",
    ],
  },
  "Pilgrimage Site": {
    friends: [
      "A guide who protects pilgrims from both exploitation and the site's custodians",
    ],
    enemies: [
      "A keeper who controls access to the route as a source of political authority",
    ],
    complications: [
      "The pilgrimage's meaning differs sharply between residents and visitors",
    ],
    things: [
      "A token whose value depends on who carried it and who is allowed to inherit it",
    ],
    places: [
      "A difficult waystation where pilgrims, traders, and local workers share the same shelter",
    ],
  },
  "Heavy Industry": {
    friends: [
      "A shift coordinator who can stop a dangerous process but not the production quota",
    ],
    enemies: [
      "An owner whose safety reforms would threaten the contracts keeping the district alive",
    ],
    complications: [
      "A shutdown protects workers while denying the settlement a critical import",
    ],
    things: [
      "A production sample that proves the plant is making something it was never licensed to make",
    ],
    places: [
      "A furnace, fabrication line, or orbital yard where every faction has a stake",
    ],
  },
  "Post-Scarcity": {
    friends: [
      "A civic steward defending equal access to systems everyone assumes will always work",
    ],
    enemies: [
      "A status faction seeking scarcity in one domain so influence becomes valuable again",
    ],
    complications: [
      "Abundance has removed one kind of hardship while making purpose and obligation contested",
    ],
    things: [
      "A unique decision archive that cannot be regenerated from the normal infrastructure",
    ],
    places: [
      "A public fabrication commons where private demands become visible political choices",
    ],
  },
};

function createWorldTagProfile(tag: string): WorldTagProfile {
  const seed = WORLD_TAG_PROFILE_SEEDS[tag];
  const completeCandidates = (
    entries: readonly string[] | undefined,
    fallbacks: readonly string[],
  ): string[] => [...new Set([...(entries ?? []), ...fallbacks])].slice(0, 3);

  return {
    tag,
    friends: completeCandidates(seed?.friends, [
      `A local person or group who understands the human cost of ${tag.toLowerCase()}`,
      `A practical mediator whose livelihood depends on ${tag.toLowerCase()} remaining workable`,
      `A quiet beneficiary of ${tag.toLowerCase()} who needs outside help to protect it`,
    ]),
    enemies: completeCandidates(seed?.enemies, [
      `A rival actor whose power depends on controlling ${tag.toLowerCase()}`,
      `An outsider trying to turn ${tag.toLowerCase()} into a private advantage`,
      `A faction harmed by any change to the current form of ${tag.toLowerCase()}`,
    ]),
    complications: completeCandidates(seed?.complications, [
      `The benefits and costs of ${tag.toLowerCase()} fall on different communities`,
      `A short-term solution to ${tag.toLowerCase()} creates a long-term obligation`,
      `The people most affected by ${tag.toLowerCase()} disagree about what repair would mean`,
    ]),
    things: completeCandidates(seed?.things, [
      `A concrete tool, record, resource, or device specific to ${tag.toLowerCase()}`,
      `A portable piece of evidence that gives one side leverage over ${tag.toLowerCase()}`,
      `A scarce object whose value changes depending on who controls ${tag.toLowerCase()}`,
    ]),
    places: completeCandidates(seed?.places, [
      `A characteristic site where ${tag.toLowerCase()} becomes impossible to ignore`,
      `A public or restricted facility built around the demands of ${tag.toLowerCase()}`,
      `A border, district, route, or worksite where the costs of ${tag.toLowerCase()} are visible`,
    ]),
  };
}

export const worldTagProfiles: Record<string, WorldTagProfile> =
  Object.fromEntries(
    worldConfig.worldTags.map((tag) => [tag, createWorldTagProfile(tag)]),
  );

export function getWorldTagProfile(tag: string): WorldTagProfile {
  return worldTagProfiles[tag] ?? createWorldTagProfile(tag);
}

export interface WorldGeneratorOptions {
  worldType?: string;
  habitability?: string;
  civilisation?: string;
  societalModel?: string;
  worldTagOne?: string;
  worldTagTwo?: string;
  genre?: string;
  dominantFeature?: string;
  /** Existing titles to avoid when making a local fallback. */
  avoidNames?: string[];
}

export interface WorldPrompt {
  systemInstruction: string;
  userMessage: string;
}

function choose(
  value: string | undefined,
  choices: readonly string[],
  rng: Rng,
): string {
  return value?.trim() || pickFrom(choices, rng);
}

function chooseDistinct(
  value: string | undefined,
  choices: readonly string[],
  excluded: string,
  rng: Rng,
): string {
  const selected = value?.trim();
  if (selected && selected !== excluded) return selected;
  const available = choices.filter((choice) => choice !== excluded);
  return pickFrom(available.length ? available : choices, rng);
}

function chooseName(avoidNames: readonly string[], rng: Rng): string {
  const forbidden = new Set(
    avoidNames.map((name) => name.trim().toLowerCase()),
  );
  const available = worldConfig.names.filter(
    (name) => !forbidden.has(name.toLowerCase()),
  );
  return pickFrom(available.length ? available : worldConfig.names, rng);
}

function genreLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function isForbiddenTitle(title: string, forbiddenNames: Iterable<string>) {
  const normalize = (value: string) =>
    ` ${value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()} `;
  const normalizedTitle = normalize(title);

  for (const name of forbiddenNames) {
    const normalizedName = normalize(name).trim();
    if (normalizedName && normalizedTitle.includes(` ${normalizedName} `)) {
      return true;
    }
  }

  return false;
}

/** Generate a complete local draft without network access or vault writes. */
export function generateWorldLocal(
  options: WorldGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const worldType = choose(options.worldType, worldConfig.worldTypes, rng);
  const habitability = choose(
    options.habitability,
    worldConfig.habitability,
    rng,
  );
  const civilisation = choose(
    options.civilisation,
    worldConfig.civilisations,
    rng,
  );
  const societalModel = choose(
    options.societalModel,
    worldConfig.societalModels,
    rng,
  );
  const worldTagOne = choose(options.worldTagOne, worldConfig.worldTags, rng);
  const worldTagTwo = chooseDistinct(
    options.worldTagTwo,
    worldConfig.worldTags,
    worldTagOne,
    rng,
  );
  const worldTagOneProfile = getWorldTagProfile(worldTagOne);
  const worldTagTwoProfile = getWorldTagProfile(worldTagTwo);
  const worldTagOneFriend = pickFrom(worldTagOneProfile.friends, rng);
  const worldTagOneEnemy = pickFrom(worldTagOneProfile.enemies, rng);
  const worldTagOneComplication = pickFrom(
    worldTagOneProfile.complications,
    rng,
  );
  const worldTagOneThing = pickFrom(worldTagOneProfile.things, rng);
  const worldTagOnePlace = pickFrom(worldTagOneProfile.places, rng);
  const worldTagTwoFriend = pickFrom(worldTagTwoProfile.friends, rng);
  const worldTagTwoEnemy = pickFrom(worldTagTwoProfile.enemies, rng);
  const worldTagTwoComplication = pickFrom(
    worldTagTwoProfile.complications,
    rng,
  );
  const worldTagTwoThing = pickFrom(worldTagTwoProfile.things, rng);
  const worldTagTwoPlace = pickFrom(worldTagTwoProfile.places, rng);
  const genre = choose(options.genre, worldConfig.genres, rng);
  const dominantFeature =
    options.dominantFeature?.trim() ||
    pickFrom(
      [
        "a perpetual twilight belt between a sunward furnace and a frozen nightside",
        "a shattered ring of orbital habitats that throws moving shadows across the equator",
        "an ocean-wide storm system whose calm eye contains the oldest settlements",
        "a planet-spanning transit lattice built by a civilisation that no longer controls it",
      ],
      rng,
    );
  const title = chooseName(options.avoidNames ?? [], rng);
  const atmosphere =
    habitability === "Earthlike"
      ? "Breathable air and a stable biosphere, though local regions remain dangerous."
      : habitability.includes("technology")
        ? "Technically survivable only inside maintained habitats, pressure suits, or adapted enclaves."
        : "Unsafe without specialised protection; the surface itself shapes every political and economic choice.";
  const civilisationDetail =
    civilisation === "Uninhabited"
      ? "There are no permanent settlements, only survey camps, scavengers, and the remains of earlier visitors."
      : civilisation === "Ecumenopolis"
        ? "Ecumenopolis means a connected urban network across the inhabited extent, not a city on every square kilometre: most residents live in linked corridors and arcologies around stable infrastructure, while uninhabited regions remain beyond the managed footprint. Its population is on the order of billions, with density varying sharply by access to power, water, and transport."
        : civilisation === "Fallen Civilisation"
          ? "Successor communities occupy fragments of an older planetary order, each claiming a different inheritance."
          : `${civilisation} communities have adapted their institutions, trade, and daily life to the planet's hard limits.`;

  const content = [
    "## Core Concept",
    `${title} is a ${worldType.toLowerCase()} in a ${genre.toLowerCase()} setting, defined by ${dominantFeature}. Its primary societal model is a ${societalModel.toLowerCase()}. Its two world tags are ${worldTagOne} and ${worldTagTwo}; together they create the setting's main pressure rather than serving as decorative labels.`,
    "",
    "## World Profile",
    `A ${civilisation.toLowerCase()} world whose settlements, institutions, and rivalries are shaped by its difficult physical reality. The tags ${worldTagOne} and ${worldTagTwo} describe the social and material pressures that make it worth visiting.`,
    "",
    "## Environment",
    `Its climate, travel routes, and habitable zones are governed by ${dominantFeature}. Native ecologies are valuable, dangerous, or both.`,
    "",
    "## How People Survive",
    atmosphere,
    "Life clusters where water, heat, and shelter can be controlled, making reliable infrastructure as important as territory.",
    "",
    "## Settlements & Factions",
    civilisationDetail,
    `${worldTagOne} creates one set of obligations and opportunities, while ${worldTagTwo} creates another; the largest settlement and its rival network disagree about which pressure should shape the future.`,
    `Friends: ${worldTagOneFriend}. Enemies: ${worldTagTwoEnemy}.`,
    "The largest settlement controls access to the safest routes and life-support infrastructure, while a rival network profits from those left outside it.",
    "",
    "## Culture & Everyday Life",
    `The ${societalModel.toLowerCase()} shapes who sets the rhythms of work, travel, celebration, and mutual obligation, while ordinary people negotiate access to protected space and reliable infrastructure.`,
    "",
    "## Economy & Technology",
    `The world exports a resource made accessible by ${dominantFeature}, while importing the technology and expertise needed to keep its population secure.`,
    "",
    "## Locations",
    `- **The Terminator Exchange** — a neutral market where rival settlements trade power, water, and information. It is also ${worldTagOnePlace.toLowerCase()}.`,
    `- **The Quiet Latitude** — a place where the planet's dominant feature becomes briefly predictable, attracting researchers and smugglers alike. It is also ${worldTagTwoPlace.toLowerCase()}.`,
  ].join("\n");

  const lore = [
    "## History",
    `The same conditions that made ${title} valuable have repeatedly stranded expeditions and reshaped local borders. Its history is still argued over because every surviving record serves someone's claim.`,
    "",
    "## Current Conflicts",
    `Control of the planet's safest routes and life-support infrastructure is becoming more contested as established agreements fail. ${worldTagOneComplication}.`,
    "",
    "## Mysteries",
    `A buried system connected to ${dominantFeature} is beginning to behave differently. The people who can explain it disagree on whether it is a warning, a weapon, or an opportunity. ${worldTagTwoThing}.`,
    "",
    "## Adventure Hooks",
    `- ${worldTagOneFriend} asks the crew to act before ${worldTagOneEnemy.toLowerCase()}.`,
    `- ${worldTagTwoComplication}; the crew must decide who bears the cost.`,
    `- ${worldTagTwoPlace} contains ${worldTagOneThing.toLowerCase()}, but reaching it requires negotiating with both tag-driven factions. ${worldTagTwoFriend} may help, for a price.`,
  ].join("\n");

  return {
    type: "location",
    title,
    summary: `${title} is a ${worldType.toLowerCase()} defined by ${dominantFeature}.`,
    content,
    lore,
    labels: [
      "world",
      genreLabel(worldType),
      genreLabel(habitability),
      genreLabel(civilisation),
      genreLabel(societalModel),
      genreLabel(worldTagOne),
      genreLabel(worldTagTwo),
      genreLabel(genre),
    ],
    status: "active",
  };
}

/** Build the dedicated AI brief; campaign context is prepended by the registry. */
export function buildWorldPrompt(
  options: WorldGeneratorOptions = {},
): WorldPrompt {
  const worldType = options.worldType?.trim() || "world";
  const habitability =
    options.habitability?.trim() || "appropriate habitability";
  const civilisation =
    options.civilisation?.trim() || "an appropriate civilisation";
  const societalModel =
    options.societalModel?.trim() || "an appropriate societal model";
  const worldTagOne =
    options.worldTagOne?.trim() || worldConfig.defaultWorldTags[0];
  const worldTagTwo =
    options.worldTagTwo?.trim() || worldConfig.defaultWorldTags[1];
  const genre = options.genre?.trim() || "sci-fi";
  const dominantFeature =
    options.dominantFeature?.trim() || "an evocative dominant feature";
  const extraAvoidedNames = options.avoidNames
    ?.map((name) => name.trim())
    .filter(Boolean);
  const extraAvoidedNumbers = extraAvoidedNames
    ?.flatMap((name) => name.match(/\b\d+\b/g) ?? [])
    .filter((number, index, numbers) => numbers.indexOf(number) === index);
  const nameRestrictions = extraAvoidedNames?.length
    ? ` Also do not use these campaign-specific names: ${extraAvoidedNames.join(", ")}.${
        extraAvoidedNumbers?.length
          ? ` Avoid reusing these numeric designations too: ${extraAvoidedNumbers.join(", ")}.`
          : ""
      }`
    : "";
  const worldTagProfilesForPrompt = [worldTagOne, worldTagTwo]
    .map((tag) => {
      const profile = getWorldTagProfile(tag);
      return `Tag: ${profile.tag}
Friends: ${profile.friends.join("; ")}
Enemies: ${profile.enemies.join("; ")}
Complications: ${profile.complications.join("; ")}
Things: ${profile.things.join("; ")}
Places: ${profile.places.join("; ")}`;
    })
    .join("\n\n");
  const normalizedGenre = genre.toLowerCase();
  const genreGuidance =
    normalizedGenre === "hard sci-fi"
      ? "For Hard Sci-Fi, use restrained speculative technology and broadly plausible engineering with clear causality. Track only the practical consequences that matter for the story, including gravity, atmosphere, energy, maintenance, travel time, and communication delay. Keep the result grounded in defensible physics and engineering, but remember that approximate plausibility is enough; do not turn the setting into an astrophysics lecture or make it feel scientific merely by adding numbers, units, and technical vocabulary. Do not use unexplained faster-than-light travel, explicit gravity control, reactionless drives, mystical technology, impossible ecology, or convenient technology that solves a problem without a cost."
      : normalizedGenre === "grounded sci-fi"
        ? "For Grounded Sci-Fi, allow some generous assumptions, but keep technology costly, legible, and constrained. Avoid casual miracle technology and make major social and environmental consequences follow from the assumptions you establish."
        : normalizedGenre === "space opera" ||
            normalizedGenre === "advanced sci-fi"
          ? `For ${genre}, highly speculative technology such as gravity manipulation, exotic materials, and advanced neuroscience is acceptable when it is established clearly and used consistently. Keep it from making every problem effortless; preserve meaningful costs, limits, and social consequences.`
          : `For ${genre}, keep the setting's speculative elements internally consistent. Establish clear rules for what technology, ecology, institutions, and travel can do, then make every major consequence follow those rules.`;

  return {
    systemInstruction:
      "You are a science-fiction worldbuilder creating evocative, coherent, immediately gameable material for a GM. Prioritise a few memorable connected ideas, understandable conflicts, useful locations, and playable hooks while keeping the setting internally consistent. Return only one valid JSON object.",
    userMessage: `Create a ${genre} ${worldType} with ${habitability} conditions, ${civilisation}, and a primary societal model of ${societalModel}. Treat the societal model as an independent variable: do not infer or replace it from the civilisation level. Its dominant feature is: ${dominantFeature}. Its two Stars Without Number world tags are: ${worldTagOne} and ${worldTagTwo}.

Star-system context may be provided before this brief. When it is, develop this world as part of that system: respect its parent star, orbit, neighbouring bodies, existing factions, and active conflicts. Do not regenerate or contradict the supplied system.

Return JSON with "title", "summary", "labels", "connections", and a markdown "lore" field. Labels must match the actual generated content: include only factual tags supported by the world, its world type, civilisation, societal model, and genre. Do not add attractive-sounding labels for features the lore does not contain. The lore must use these exact sections:
## Core Concept
## World Profile
## Environment
## How People Survive
## Settlements & Factions
## Culture & Everyday Life
## Economy & Technology
## Locations
## History
## Current Conflicts
## Mysteries
## Adventure Hooks

Prioritise gameability over simulation. Give the GM a memorable core concept, clear conflicts, useful locations, and playable adventure hooks. Scientific realism should support the premise, not dominate it. Use approximate plausibility unless a contradiction would distract a typical player or GM. Prefer a few strong, connected ideas over exhaustive technical detail: develop the dominant feature and two or three consequences deeply, then let them recur with new information across the sections. If a precise number is not needed, omit it rather than inventing a precise value that can contradict another section.

Make the output a coherent place, not a disconnected list of planetary traits. Each section must introduce distinct information; do not restate the dominant feature, climate, factions, or stakes from an earlier section. Keep the world type and labels truthful: a planet, moon, habitat, and artificial structure are not interchangeable, and an uninhabited world cannot also have an established resident population.

If the civilisation is an Ecumenopolis, do not interpret that as every square kilometre being fully urbanised. In World Profile or Settlements & Factions, define the inhabited extent and population scale clearly: state which regions, corridors, orbital bands, or arcologies are densely settled, what remains uninhabited or lightly managed, and whether the population is in the millions, billions, or another justified scale. Keep density and infrastructure uneven where that creates useful conflicts.

Treat the two selected Stars Without Number world tags as active creative constraints. Interpret each tag specifically through this world's world type, dominant feature, civilisation, and societal model, then combine them into one coherent setting. Each tag must produce concrete consequences for at least one of survival, settlements, technology, culture, factions, economy, conflict, locations, mysteries, or hooks. Do not merely list or repeat the tags, and do not let one tag erase the other.

Use these tag seed tables as raw material. Adapt them to the setting; do not quote them mechanically or force every seed into the result. Choose or invent useful entries for each category, then connect them: a Friend should want something, an Enemy should threaten or contest something, a Complication should create a decision or cost, a Thing should be concrete and desirable, and a Place should be worth visiting. Use the categories to give the GM immediate adventure material without turning the output into an unrelated list.

${worldTagProfilesForPrompt}

Use concrete scientific causality: explain how orbital conditions, gravity, atmosphere, geology, ecology, energy, or resource constraints produce the world's settlement patterns, technology, economy, and conflicts. Avoid generic dramatic adjectives and vague claims of danger, mystery, importance, or ancientness unless a specific mechanism makes them meaningful.

${genreGuidance}

Build a clear chain of cause and effect from the dominant feature through survival, settlement design, culture, economy, political power, conflicts, mysteries, locations, and adventure opportunities. Do not describe an exotic environment and then attach a generic society to it. Show how the feature changes what people can build, eat, transport, protect, afford, inherit, worship, regulate, or fight over. Every major institution, settlement, conflict, and daily practice must follow from the world's constraints and selected societal model.

Give daily life equal weight with political events: show how ordinary people work, travel, eat, communicate, maintain infrastructure, celebrate, raise families, and adapt to constraints. Make factions internally complex and anchor them in understandable material interests such as control of water, food, energy, transport, housing, knowledge, or life-support infrastructure. Give important conflicts reasonable arguments on multiple sides; factions should not be purely heroic or villainous. Include internal disagreements, constituencies, incentives, labour conditions, traditions, and who bears the costs of each policy.

Avoid recycling common sci-fi structures from prior outputs. Do not default to abandoned extraction colonies, corporation-versus-nomad conflicts, energy-unit currencies or currencies named after scientific units, mysterious repeating or rhythmic signals, mysterious repeating signals from underground, hidden alien machinery, resource wars, resource blockades, sabotage as the default conflict, or hostile deep environments unless the user explicitly requests one. For repeated Ocean World generations, vary the underlying premise and conflict, not only the terminology. Do not default to tethered habitats, stranded colonists, conservative maintainers versus mobile harvesters, deep rhythmic signals, or abandoned underwater facilities. Derive the ocean world's pressure from the selected tags, societal model, ecology, infrastructure, and history. A mysterious repeating signal is not a neutral placeholder for a mystery: choose a different mechanism and question. Do not use Greek or Roman sea-related names for every ocean world. Find a different source of pressure, history, or uncertainty that follows from this world's selected inputs.

Vary the title form across outputs. Keep numbered designations available, but do not default to a "name-number" title or repeatedly reuse the same numeric designation, especially 9. Vary designation formats and values: use Roman numerals, hyphenated survey codes, letter-number registry codes, generation marks, orbital or catalogue identifiers, or no number at all when justified by the world's institutions. If a number is used, make it meaningful and never add a decorative number merely to sound like science fiction. When the history supports it, give the world both an official survey or registry designation and a later local name, and explain why the names differ in World Profile or History; do not force both names into every result. Do not reuse any supplied campaign-specific name.

Require the dominant feature to have social consequences, not just environmental description: show who benefits or suffers, how it changes work, household routines, mobility, status, law, rituals, settlement design, faction membership, and political demands. Do not leave those consequences implicit.

Mysteries must use different underlying mechanisms and answer different kinds of questions. Locations, mysteries, and hooks must emerge from this world's defining concept and named institutions; a strong hook should not be transferable unchanged to another planet. Vary factions, mysteries, locations, and adventure hooks between generations: change their structures, material interests, mechanisms, and consequences, not just their names. Adventure hooks must be structurally distinct: vary the decisions, actors, stakes, and resolutions, and draw from a mix of environmental emergencies, political disputes, scientific expeditions, labour conflicts, investigations, diplomacy, migration, ethical dilemmas, exploration, and personal or lineage disputes. Do not make retrieval missions, sabotage, signal investigation, or lost technology the default hook.

Before returning the JSON, perform one internal validation: silently perform one lightweight final review of the complete draft. Run a scientific consistency check. Verify that the world is clearly a planet, moon, habitat, or artificial structure; its labels match its actual content in the title, summary, and lore; every section describes the same world; and the dominant feature shapes the civilisation. Remove or revise labels that conflict with the history or never appear meaningfully in the world. Check for obvious contradictions: gravity broadly matches the world's size without confusing mass with surface gravity; breathable atmospheres contain oxygen; orbital relationships are clear when mentioned; no planetary surface is accidentally described as zero-g without freefall or suitable technology; temperature and phase claims are plausible; resources and materials are not synthesised from nothing; and environmental conditions support the agriculture, settlements, and later sections. If precise orbital numbers are provided, check that they are mutually compatible; otherwise prefer omitting unnecessary numbers. In Hard Sci-Fi, explicitly reject gravity control and similar miracle technology unless the user requested a different level of speculation.

Then run a causal consistency check from environment and dominant feature through survival patterns, societal model, settlements, culture, economy, political power, technology, conflicts, mysteries, locations, and hooks. Check that primary conflicts are understandable and playable, locations and hooks belong specifically to this setting, factions have consistent interests, constituencies, and capabilities, common concepts from recent generations have not been unnecessarily repeated, and there is enough material for a GM to begin planning immediately. Quietly correct contradictions, unsupported claims, weak cause-and-effect links, or repeated structures during this review, then return only the corrected final JSON. Do not describe the review and do not generate a second draft.

Include at least two named settlements or factions, three notable locations, one secret or unresolved mystery, and three playable adventure hooks.

${NAME_BAN_PROMPT}${nameRestrictions}`,
  };
}

/** Parse an AI world draft into the public generator output contract. */
export function parseWorldResponse(
  text: string,
  avoidNames: readonly string[] = [],
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    lore?: unknown;
    labels?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("World response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("World response is missing lore.");
  }
  const usedNumericDesignations = avoidNames.flatMap(
    (name) => name.match(/\b\d+\b/g) ?? [],
  );
  if (
    isForbiddenTitle(data.title, [
      ...BANNED_NAMES,
      ...avoidNames,
      ...usedNumericDesignations,
    ])
  ) {
    throw new Error("World response uses a banned title.");
  }
  const sourceText = [
    data.title,
    typeof data.summary === "string" ? data.summary : "",
    data.lore,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ");
  const labels = [
    "world",
    ...(Array.isArray(data.labels)
      ? data.labels.filter((label): label is string => {
          if (typeof label !== "string" || !label.trim()) return false;
          const words = label
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          return words.every((word) => sourceText.includes(word));
        })
      : ["sci-fi", "imported-draft"]),
  ].filter((label, index, all) => all.indexOf(label) === index);

  return {
    type: "location",
    title: data.title.trim(),
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    content: "",
    lore: data.lore.trim(),
    labels,
    status: "active",
  };
}
