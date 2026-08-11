/**
 * Alien Race Generator (#2122) — produces a coherent alien species rather than
 * "humans with unusual appearances".
 *
 * The organising principle is **consequence**: every major biological or
 * environmental trait must visibly change something else about the species.
 * Six limbs should show up in their tools and architecture; chemical
 * communication should change what privacy and deception mean to them;
 * extreme longevity should change how their politics and inheritance work.
 *
 * That principle is enforced in two places, deliberately:
 *   - The **local fallback** encodes it structurally. Each trait profile below
 *     carries the downstream consequences it implies, and the generated
 *     sections are assembled from those consequences rather than from
 *     independent per-section option pools. A local draft therefore cannot
 *     produce a six-limbed species whose technology ignores its limbs.
 *   - The **prompt** states it as a rule and closes with a consistency pass
 *     naming the specific cross-section links to verify.
 *
 * Framework-free, for the marketing/SEO generator surface (no login, no vault
 * context) — mirrors the public-star-system.ts / public-world.ts split used by
 * every generator with an in-app, vault-grounded sibling.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson, sanitizeText } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";

/**
 * Generation modes. "Grounded" restricts trait pools to biologically plausible
 * options shaped by evolution; "Freeform" additionally unlocks exotic life
 * (crystalline, colonial, plasma, machine lineages).
 */
export const GROUNDED_MODE = "Grounded / Evolutionary";
export const FREEFORM_MODE = "Freeform / Fantastic";

/**
 * A trait's downstream effects. `consequence` is the concrete, non-cosmetic
 * change the trait forces on the species' daily life; the remaining fields
 * feed the specific lore sections that trait should visibly reach into.
 */
interface TraitProfile {
  name: string;
  /** Only offered in Freeform mode. */
  exotic?: boolean;
  /** One lowercase fragment describing the trait itself. */
  detail: string;
  /** The knock-on effect this trait forces elsewhere in the species design. */
  consequence: string;
}

interface BodyPlanProfile extends TraitProfile {
  /** How the body plan shows up in tools, architecture, or movement. */
  technology: string;
  /** A biological constraint the body plan imposes. */
  weakness: string;
}

interface EnvironmentProfile extends TraitProfile {
  /** What the environment selected for, for "## Evolutionary Origin". */
  selectedFor: string;
  /** The technological speciality the environment pushed them towards. */
  speciality: string;
  /** A hard limit the environment leaves them with, for "## Weaknesses". */
  constraint: string;
}

interface PsychologyProfile extends TraitProfile {
  /** How the disposition shows up as a worldview rather than a mood. */
  worldview: string;
}

interface RelationProfile {
  name: string;
  /** Where the friction with outsiders actually comes from. */
  friction: string;
}

interface CommunicationProfile extends TraitProfile {
  /** What privacy, secrecy, and lying mean given this channel. */
  privacy: string;
  /** How the channel constrains or shapes their names. */
  naming: string;
}

interface LifespanProfile extends TraitProfile {
  /** How the lifespan reshapes politics, inheritance, and institutions. */
  politics: string;
}

const BODY_PLANS: readonly BodyPlanProfile[] = [
  {
    name: "Hexapodal",
    detail:
      "six limbs, the forward pair specialised for fine manipulation while four remain load-bearing",
    consequence:
      'they never evolved a concept of "free hands" — standing, carrying and working are simultaneous, and idleness reads to them as illness',
    technology:
      "tools are built for three-point grip and are near-unusable by two-handed species; doorways, ladders and seating are wide and low, and their written script runs in three parallel columns because three limbs can write at once",
    weakness:
      "the specialised forward limbs are structurally weak and break easily, and a hexapod who loses one is functionally maimed in a way their medicine has never solved",
  },
  {
    name: "Bipedal (convergent)",
    detail:
      "an upright bipedal frame that arrived at a humanoid silhouette by a completely unrelated evolutionary route",
    consequence:
      "the superficial resemblance to other bipeds is their greatest diplomatic liability — outsiders consistently assume shared instincts that are not there",
    technology:
      "their tools are near-interchangeable with other bipedal species', which made them unusually early and unusually dependent traders",
    weakness:
      "their spine is a repurposed horizontal structure and fails under sustained vertical load; chronic pain is a normal condition of adulthood",
  },
  {
    name: "Quadrupedal with manipulator trunk",
    detail:
      "a four-legged stance with a muscular prehensile trunk doing all fine work",
    consequence:
      "with only one manipulator, every task is sequential — their crafts, their music and their arguments are all built around doing one thing at a time, properly",
    technology:
      "machinery is designed around a single powerful gripper rather than paired hands, and their architecture favours long low galleries over stairs",
    weakness:
      "the trunk carries their airway, so an injury that would merely disable another species' hand suffocates them",
  },
  {
    name: "Serpentine with manipulator hood",
    detail:
      "an elongated body that anchors and coils, with a ring of small manipulators inside a flaring hood",
    consequence:
      'they work while wrapped around their subject rather than facing it, so their crafts have no concept of a "front", and their buildings have no facades',
    technology:
      "their tools are ring-shaped and worked from all sides at once; their vehicles have no seats, only anchor posts",
    weakness:
      "they cannot regulate temperature by movement alone and become slow and stupid in cold, which their rivals have learned to exploit",
  },
  {
    name: "Radially symmetric",
    detail: "five-fold radial symmetry with no front, back, or dominant side",
    consequence:
      "they have no words for left, right, ahead or behind, and their oldest legal texts are unintelligible to species that navigate by facing",
    technology:
      "their instruments are read from any side, their rooms have no head of table, and their maps are centred on the reader rather than oriented to a pole",
    weakness:
      "no centralised brain means no fast reflexes; they are chronically slow to react to sudden physical threat",
  },
  {
    name: "Winged biped",
    detail:
      "light bones and broad wings giving true powered flight over short distances",
    consequence:
      "their cities are vertical and their borders are volumes rather than lines, which makes every treaty they sign with ground-dwellers ambiguous",
    technology:
      "their construction favours tension over compression — spires, cabling and perches — and they never developed the wheel as a primary technology",
    weakness:
      "the hollow skeleton that lets them fly shatters under impact, and their medicine is overwhelmingly the medicine of broken bones",
  },
  {
    name: "Chitinous exoskeletal",
    detail:
      "a segmented external shell that must be shed and regrown to allow growth",
    consequence:
      "every adult has spent days of their life soft, blind and helpless during a moult, so their whole society is organised around who watches over whom",
    technology:
      "their materials science began with their own shed shells and remains obsessed with layered composites; armour is a civil craft, not a military one",
    weakness:
      "a moulting individual is defenceless for days, and their calendar, courts and wars all bend around moult season",
  },
  {
    name: "Amphibious tetrapod",
    detail:
      "a four-limbed body that breathes and works equally well in water and air",
    consequence:
      "they treat the shoreline as the centre of the world rather than its edge, and consider landlocked or fully aquatic species to be living in exile",
    technology:
      "everything they build must survive immersion, so their engineering is corrosion-obsessed and their electronics arrived late and sealed",
    weakness:
      "their skin must stay damp; dry air is a slow injury and an arid environment is a death sentence without constant infrastructure",
  },
  {
    name: "Crystalline lattice",
    exotic: true,
    detail:
      "a growing mineral lattice that computes and remembers in its own structure",
    consequence:
      "they do not reproduce so much as extend, and a fragment broken off is both a child and a copy — which makes their inheritance law incomprehensible to outsiders",
    technology:
      "they grow their tools rather than shaping them, and cannot easily make anything they have not first designed as a seed",
    weakness:
      "resonance at the wrong frequency cracks them, and their enemies have built weapons around exactly that",
  },
  {
    name: "Colonial swarm",
    exotic: true,
    detail:
      "thousands of small bodies whose collective behaviour constitutes one mind",
    consequence:
      "an individual death means nothing and a swarm death means everything, so their ethics are unreadable to species that count bodies",
    technology:
      "their machinery is distributed and redundant, built to be operated by many small hands at once, and it fails gracefully in ways other species find eerie",
    weakness:
      "below a critical mass the collective mind degrades into animal behaviour, and it does not recover what it knew",
  },
  {
    name: "Plasma-bound field",
    exotic: true,
    detail:
      "a self-sustaining plasma structure held inside a woven containment field",
    consequence:
      "they cannot touch anything directly, so their entire material culture is remote-manipulated and their art is made of light and heat rather than substance",
    technology:
      "they are unmatched at energy handling and helpless at fine mechanical work, which forces them into permanent dependence on manufacturing partners",
    weakness:
      "a containment failure is instantly fatal, and their containment is maintained technology, not biology",
  },
  {
    name: "Self-replicating machine lineage",
    exotic: true,
    detail:
      "a manufactured lineage that has been copying and revising itself for far longer than its makers existed",
    consequence:
      "they carry inherited design decisions nobody remembers making, and their oldest cultural taboos are undocumented engineering constraints",
    technology:
      "they build by fabrication rather than assembly and treat repair as a moral act, but cannot improvise outside their own toolchain",
    weakness:
      "each replication accumulates copying drift, and the oldest lines are visibly, irreversibly degrading",
  },
];

const ENVIRONMENTS: readonly EnvironmentProfile[] = [
  {
    name: "High-gravity world",
    detail: "a dense world where everything weighs nearly twice what it should",
    selectedFor: "compact, heavily reinforced bodies and cautious movement",
    consequence:
      "a fall is usually fatal at home, so recklessness never became a virtue in their culture the way it did elsewhere",
    speciality:
      "structural engineering and load-bearing materials, which they export everywhere",
    constraint:
      "standard gravity feels weightless and unsafe to them; they misjudge distances and drop things constantly on other worlds",
  },
  {
    name: "Low-gravity moon",
    detail: "a small world where a careless step carries you a long way",
    selectedFor: "long, light frames and precise, conservative motion",
    consequence:
      "they find standard gravity exhausting and cannot visit most worlds without a support frame, which shapes every diplomatic meeting they attend",
    speciality:
      "orbital mechanics and low-thrust transit, learned early because leaving was always easy",
    constraint:
      "they cannot stand unaided in standard gravity and need a support frame anywhere but home",
  },
  {
    name: "Tidally locked world",
    detail:
      "a world with one face in permanent day and the other in permanent night, life crowded into the terminator band",
    selectedFor:
      "tolerance for constant twilight and extreme lateral migration",
    consequence:
      "they have no concept of a day, and every calendar, contract and shift pattern they use is imported and awkwardly fitted",
    speciality:
      "thermal management and long-distance overland logistics along the habitable band",
    constraint:
      "they have no circadian rhythm to speak of and suffer badly on worlds that impose one",
  },
  {
    name: "Ocean world",
    detail: "a world of open water with no permanent land at all",
    selectedFor: "pressure tolerance and three-dimensional navigation",
    consequence:
      "they think in volumes rather than areas, and find the flat territorial maps other species negotiate with almost insultingly crude",
    speciality:
      "pressure vessels and sealed systems, which made them competent in vacuum far earlier than expected",
    constraint:
      "they dehydrate quickly in open air and cannot go long without immersion",
  },
  {
    name: "Desert world",
    detail:
      "an arid world where water is the only currency that never inflates",
    selectedFor: "extreme water retention and heat tolerance",
    consequence:
      "hospitality is a legal obligation rather than a courtesy, and refusing water to a traveller is prosecuted as attempted murder",
    speciality:
      "closed-loop recycling so efficient that other species buy their reclamation systems outright",
    constraint:
      "humid air waterlogs their respiration and leaves them sluggish and prone to infection",
  },
  {
    name: "Ice world",
    detail: "a frozen world where liquid water exists only under the crust",
    selectedFor: "cold tolerance and slow, deliberate metabolism",
    consequence:
      "they run cold and slow, and other species consistently mistake their deliberation for either stupidity or contempt",
    speciality:
      "thermal drilling and subsurface construction, exported to every ice moon in reach",
    constraint:
      "anything above temperate heat is a slow injury, and they cannot work at all in it",
  },
  {
    name: "Dense-jungle world",
    detail:
      "a crowded biosphere where sightlines are short and something is always competing with you",
    selectedFor: "acute non-visual senses and constant threat assessment",
    consequence:
      "open ground makes them acutely uncomfortable, and their cities are roofed even where there is no weather to keep out",
    speciality:
      "biochemistry and pharmacology, from a very long history of things trying to poison them",
    constraint: "open ground and long sightlines leave them badly agoraphobic",
  },
  {
    name: "Volcanic world",
    detail:
      "a geologically violent world where the ground itself is on a schedule",
    selectedFor: "heat tolerance and a culture of rapid, total relocation",
    consequence:
      "they build nothing to last and consider monumental architecture a form of arrogance, which reads to outsiders as having no history",
    speciality:
      "geothermal power and rapid modular construction they can abandon without regret",
    constraint:
      "they have no institutional memory to speak of, because nothing they built ever survived long enough to hold one",
  },
  {
    name: "Thin-atmosphere highlands",
    detail: "high, cold plateaus where the air is barely sufficient",
    selectedFor: "extraordinary respiratory efficiency and low exertion",
    consequence:
      "they tire visibly in rich air and must ration effort in ways that make them look lazy to species from denser worlds",
    speciality:
      "gas separation and atmospheric processing, the industry their whole economy was built on",
    constraint:
      "oxygen-rich air is mildly toxic to them over long exposure and must be diluted",
  },
  {
    name: "Gas giant cloud deck",
    exotic: true,
    detail:
      "a banded atmosphere with no solid ground anywhere beneath the habitable layer",
    selectedFor: "buoyancy control and lifelong flight or float",
    consequence:
      "they have no concept of land ownership at all, and their entire legal tradition is built around rights of passage instead",
    speciality:
      "atmospheric chemistry and buoyant structures, unmatched by any surface-dwelling species",
    constraint:
      "a solid surface is unusable to them; they cannot support their own weight on one",
  },
  {
    name: "Deep void",
    exotic: true,
    detail: "open space with no planetary origin they can still identify",
    selectedFor: "vacuum tolerance and extremely slow metabolic cycles",
    consequence:
      "planetary life strikes them as a strange, fragile accident, and gravity wells as places one visits reluctantly and leaves quickly",
    speciality:
      "radiation handling and very long-duration systems built to run unattended for centuries",
    constraint:
      "gravity of any strength is exhausting and injurious over days rather than months",
  },
  {
    name: "Generation-ship interior",
    exotic: true,
    detail:
      "the sealed interior of a vessel whose voyage outlasted the species that boarded it",
    selectedFor:
      "tolerance of confinement and absolute deference to resource limits",
    consequence:
      "waste is their central moral category, and they find the casual abundance of planetary species genuinely obscene",
    speciality:
      "life support and closed ecology, maintained with a rigour that borders on religious",
    constraint:
      "open sky triggers a profound and lasting distress they have no cultural framework for",
  },
];

const COMMUNICATION: readonly CommunicationProfile[] = [
  {
    name: "Chemical / pheromonal",
    detail: "emitted chemical signals read directly from the air",
    consequence:
      "emotional state is broadcast whether or not they intend it, so their society developed around managed exposure rather than concealment",
    privacy:
      "they cannot lie about how they feel, only about why — so their deceptions are elaborate constructions of true feelings arranged to mislead, and they consider a species that can simply say something false to be fundamentally dangerous",
    naming:
      "spoken names are transliterations of a scent-signature and are considered approximations at best; each has several equally valid written forms",
  },
  {
    name: "Bioluminescent patterning",
    detail: "rippling light patterns across the skin or shell",
    consequence:
      "conversation requires line of sight and adequate darkness, so their architecture is built around sightlines and their working day is nocturnal",
    privacy:
      "privacy is physical — a closed door is genuinely a sealed conversation — and their law treats being seen speaking as equivalent to being overheard",
    naming:
      "names are short pattern-sequences, written as glyph strings and pronounced only when speaking to species who cannot see properly",
  },
  {
    name: "Infrasound",
    detail: "low-frequency calls that carry for tens of kilometres",
    consequence:
      "no conversation among them is ever fully private, and they developed complex etiquette for pretending not to have heard",
    privacy:
      "secrecy means distance rather than walls, so their conspirators travel rather than whisper, and their intelligence services are organised around geography",
    naming:
      "names are tonal and lose most of their meaning when rendered in another species' script, which they find quietly insulting",
  },
  {
    name: "Postural and gestural",
    detail:
      "whole-body posture carrying the grammatical load that other species put in speech",
    consequence:
      "they must be physically present to communicate fully, so their remote correspondence is famously terse and prone to misunderstanding",
    privacy:
      "concealment is easy and lying is easier, which is precisely why their culture invested so heavily in witnesses, seals and ritual",
    naming:
      "names are stance-descriptions rendered into other languages as short phrases rather than words",
  },
  {
    name: "Electromagnetic field modulation",
    exotic: true,
    detail: "modulated fields read directly by specialised organs",
    consequence:
      "they experience machinery as noisy and talkative, and consider heavily industrialised worlds to be places of constant screaming",
    privacy:
      "shielding is their equivalent of a private room, and the right to be unshielded — legible, unarmoured — is a formal gesture of trust in their law",
    naming:
      "names are frequency signatures, conventionally written as a numeric index that outsiders mistake for a serial number",
  },
  {
    name: "Vocal",
    detail: "a conventional vocal apparatus with a wide expressive range",
    consequence:
      "their communication translates unusually easily, which made them intermediaries and left them over-represented in every treaty ever signed",
    privacy:
      "they lie as easily as any speaking species, and their legal tradition is built almost entirely around testing testimony",
    naming:
      "names are ordinary spoken words and survive translation intact, which is a large part of why other species find them approachable",
  },
];

const LIFESPANS: readonly LifespanProfile[] = [
  {
    name: "Brief",
    detail: "a working lifespan of roughly twenty-five years",
    consequence:
      "they are always in a hurry, and other species mistake that urgency for aggression",
    politics:
      "power changes hands constantly, nothing is inherited because nobody lives to inherit it, and their institutions are written down obsessively because no living memory spans two generations",
  },
  {
    name: "Comparable to most species",
    detail: "a lifespan broadly comparable to most spacefaring species",
    consequence:
      "their generational rhythms line up with their neighbours', which is the least remarked-upon reason they integrate so easily",
    politics:
      "their politics run on familiar cycles of succession and reform, making them the species everyone else uses as a baseline",
  },
  {
    name: "Extended",
    detail: "a lifespan measured in three or four centuries",
    consequence:
      "they plan on timescales that make their treaty partners nervous, and routinely outlive the governments they negotiated with",
    politics:
      "offices are held for centuries, inheritance is rare enough to be a scandal, and their reform movements are led by people who personally remember the last three failures",
  },
  {
    name: "Metamorphic castes",
    detail:
      "a life cycle passing through distinct bodily stages, each with different capabilities",
    consequence:
      "an individual is not one person to them but a sequence, and their languages use different pronouns and often different names per stage",
    politics:
      "authority attaches to a life stage rather than a person, so their leadership rotates biologically and cannot be seized — only waited for",
  },
  {
    name: "Effectively perpetual",
    exotic: true,
    detail:
      "no fixed lifespan, with age ending only by accident, violence, or deliberate cessation",
    consequence:
      "they experience change as loss rather than progress, and their oldest members are functionally unreachable by argument",
    politics:
      "nothing is ever inherited and nothing is ever vacated, so their entire political history is the history of how the young force the old to step aside",
  },
];

const PSYCHOLOGIES: readonly PsychologyProfile[] = [
  {
    name: "Consensus-seeking",
    detail: "consensus-seeking",
    consequence:
      "no decision feels legitimate to them until everyone affected has been heard, which makes them slow allies and immovable ones",
    worldview:
      "a truth nobody has agreed to is treated as merely a proposal, which other species read as relativism and they consider basic honesty about how knowledge works",
  },
  {
    name: "Patiently predatory",
    detail: "patiently predatory",
    consequence:
      "they wait for advantage rather than seizing it, and other species repeatedly mistake that patience for having conceded",
    worldview:
      "they regard timing as the only real virtue, and consider a rushed success to be a failure that has not arrived yet",
  },
  {
    name: "Ritual-bound",
    detail: "ritual-bound",
    consequence:
      "the correct form of an act matters as much as its outcome, so an unceremonious favour can insult them more than an open refusal",
    worldview:
      "they hold that a thing done without its proper form has not really been done, which makes their agreements durable and their improvisation nearly impossible",
  },
  {
    name: "Relentlessly curious",
    detail: "relentlessly curious",
    consequence:
      "they will trade away a real advantage for an answer, which their neighbours have learned to exploit and their own elders consider a standing security risk",
    worldview:
      "they treat an unexamined question as a debt owed, and regard incuriosity as the one genuinely shameful trait",
  },
  {
    name: "Threat-averse",
    detail: "threat-averse",
    consequence:
      "they withdraw rather than escalate, so their territory has contracted for centuries without a single battle being fought over it",
    worldview:
      "survival of the line outranks any individual claim, and a heroic last stand strikes them as an elaborate form of suicide",
  },
  {
    name: "Status-obsessed",
    detail: "status-obsessed",
    consequence:
      "every interaction is also a ranking, and they cannot accept a gift without first working out what accepting it costs them",
    worldview:
      "they believe position is earned continuously rather than held, so their powerful are the most anxious among them, never the most secure",
  },
  {
    name: "Genuinely alien priorities",
    detail: "driven by priorities no other species has managed to model",
    consequence:
      "their behaviour is internally consistent and externally unpredictable, and every attempt to negotiate with them begins by discovering what they actually want",
    worldview:
      "they are not mysterious to themselves; the incomprehension runs one way, and they find the assumption that it should be mutual quietly condescending",
  },
];

const RELATIONS: readonly RelationProfile[] = [
  {
    name: "First contact pending",
    friction:
      "nobody has yet worked out which of their signals are greetings and which are warnings, and both sides are being careful for different reasons",
  },
  {
    name: "Established trade partners",
    friction:
      "the trade works, which is precisely why neither side has ever had to resolve what they actually think of each other",
  },
  {
    name: "Uneasy ceasefire",
    friction:
      "the fighting stopped without either side conceding the point it started over, and every incident since has been read through that unfinished argument",
  },
  {
    name: "Client species",
    friction:
      "their protection arrangement is described by their patrons as generosity and by them as a debt they never agreed to take on",
  },
  {
    name: "Feared isolates",
    friction:
      "their reputation was built almost entirely by species who have never met them, and they have concluded there is no advantage in correcting it",
  },
  {
    name: "Scattered diaspora",
    friction:
      "the communities abroad and the ones at home no longer agree on what their people owe each other, and outsiders keep negotiating with whichever answers first",
  },
  {
    name: "Active belligerents",
    friction:
      "they are fighting for a reason they consider self-evident and have never successfully explained to anyone outside their own species",
  },
];

export const alienRaceConfig = {
  /**
   * Reuses vocabulary that already exists elsewhere in the app (star-system's
   * genres plus the canonical "Cosmic Horror" theme) rather than coining new
   * genre labels — see the theme-map in apps/web for how each maps to a skin.
   */
  genres: [
    "Hard Sci-Fi",
    "Space Opera",
    "Cyberpunk",
    "Cosmic Horror",
    "Post-Apocalyptic",
  ],
  generationModes: [GROUNDED_MODE, FREEFORM_MODE],
  homeEnvironments: ENVIRONMENTS.map((e) => e.name),
  bodyPlans: BODY_PLANS.map((b) => b.name),
  psychologies: PSYCHOLOGIES.map((p) => p.name),
  socialOrganisations: [
    "Clan lineages",
    "Meritocratic guilds",
    "Distributed consensus",
    "Rigid caste system",
    "Eusocial colony",
    "Nomadic bands",
    "Corporate holdings",
    "Gerontocracy",
  ],
  technologyLevels: [
    "Pre-industrial",
    "Industrial",
    "Information age",
    "Interplanetary",
    "Interstellar",
    "Post-collapse salvage",
  ],
  relationsToOutsiders: RELATIONS.map((r) => r.name),
  /**
   * Trait pools restricted by generation mode. Grounded excludes anything
   * flagged exotic, so a grounded species can never come back as a plasma
   * being — the same mechanism as public-quest's locationTypesByTheme.
   */
  bodyPlansByMode: {
    [GROUNDED_MODE]: BODY_PLANS.filter((b) => !b.exotic).map((b) => b.name),
    [FREEFORM_MODE]: BODY_PLANS.map((b) => b.name),
  } as Record<string, string[]>,
  homeEnvironmentsByMode: {
    [GROUNDED_MODE]: ENVIRONMENTS.filter((e) => !e.exotic).map((e) => e.name),
    [FREEFORM_MODE]: ENVIRONMENTS.map((e) => e.name),
  } as Record<string, string[]>,
  names: [
    "Ith'vareen",
    "Cassun Drift-Kin",
    "Ombrelaathe",
    "Sevrin Hollow-Walkers",
    "Tal'sekh",
    "Marrowbright",
    "Veyan Deep-Chorus",
    "Ashkelith",
    "Corvine Reach-Born",
    "Ulmenaar",
  ],
} as const;

export interface AlienRaceGeneratorOptions {
  genre?: string;
  generationMode?: string;
  homeEnvironment?: string;
  bodyPlan?: string;
  psychology?: string;
  socialOrganisation?: string;
  technologyLevel?: string;
  relationToOutsiders?: string;
  /** Free-text world/campaign background from the form's context field. */
  campaignContext?: string;
  /** Existing titles to avoid when making a local fallback. */
  avoidNames?: string[];
}

export interface AlienRacePrompt {
  systemInstruction: string;
  userMessage: string;
}

/** The fully-resolved trait set a draft was built from. */
export interface ResolvedAlienRace {
  genre: string;
  generationMode: string;
  homeEnvironment: string;
  bodyPlan: string;
  psychology: string;
  socialOrganisation: string;
  technologyLevel: string;
  relationToOutsiders: string;
}

function choose(
  value: string | undefined,
  choices: readonly string[],
  rng: Rng,
): string {
  return value?.trim() || pickFrom(choices, rng);
}

const isFreeform = (mode: string) =>
  mode.trim().toLowerCase() === FREEFORM_MODE.toLowerCase();

/** Profile fragments are stored lowercase so they can start or continue a sentence. */
const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Indefinite article for a following word. The technology levels are the only
 * place this matters — "an industrial level" but "a pre-industrial level" —
 * and a first-letter vowel check covers every value in that pool.
 */
const article = (word: string) => (/^[aeiou]/i.test(word.trim()) ? "an" : "a");

/**
 * Resolves a trait against its pool, honouring the generation mode: an exotic
 * trait is only reachable in Freeform mode, but an explicit user choice is
 * always respected (the form can offer a custom value, and a user who typed
 * "Crystalline lattice" meant it).
 */
function chooseProfile<T extends TraitProfile>(
  value: string | undefined,
  profiles: readonly T[],
  mode: string,
  rng: Rng,
): T {
  const requested = value?.trim();
  if (requested) {
    const match = profiles.find(
      (p) => p.name.toLowerCase() === requested.toLowerCase(),
    );
    if (match) return match;
  }
  const available = isFreeform(mode)
    ? profiles
    : profiles.filter((p) => !p.exotic);
  return pickFrom(available.length ? available : profiles, rng);
}

function chooseName(avoidNames: readonly string[], rng: Rng): string {
  const forbidden = new Set(
    avoidNames.map((name) => name.trim().toLowerCase()),
  );
  const available = alienRaceConfig.names.filter(
    (name) => !forbidden.has(name.toLowerCase()),
  );
  return pickFrom(available.length ? available : alienRaceConfig.names, rng);
}

function label(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Picks the communication channel the body plan and environment actually
 * support, rather than rolling it independently — this is the consequence
 * principle applied to a trait the form does not expose. A species with no
 * line of sight in a dense jungle does not signal by light.
 */
function deriveCommunication(
  bodyPlan: BodyPlanProfile,
  environment: EnvironmentProfile,
  rng: Rng,
): CommunicationProfile {
  const byName = (name: string) =>
    COMMUNICATION.find((c) => c.name === name) ?? COMMUNICATION[0];

  // The environment vetoes first: a medium that cannot carry a channel beats
  // any preference the body plan has. Vacuum carries neither air-borne
  // chemistry nor sound; open water carries no air-borne chemistry.
  const supported = COMMUNICATION.filter((channel) => {
    if (environment.name === "Deep void") {
      return (
        channel.name === "Electromagnetic field modulation" ||
        channel.name === "Bioluminescent patterning"
      );
    }
    if (environment.name === "Ocean world") {
      return channel.name !== "Chemical / pheromonal";
    }
    // Short sightlines make visual signalling useless.
    if (environment.name === "Dense-jungle world") {
      return channel.name !== "Bioluminescent patterning";
    }
    return true;
  });
  const supports = (name: string) => supported.some((c) => c.name === name);

  // Body-plan preferences, honoured only where the environment allows.
  const preferred =
    bodyPlan.name === "Plasma-bound field" ||
    bodyPlan.name === "Self-replicating machine lineage"
      ? "Electromagnetic field modulation"
      : bodyPlan.name === "Colonial swarm"
        ? "Chemical / pheromonal"
        : bodyPlan.name === "Crystalline lattice"
          ? "Infrasound"
          : undefined;
  if (preferred && supports(preferred)) return byName(preferred);
  // A plasma or machine lineage always reaches EM, whatever the medium.
  if (preferred === "Electromagnetic field modulation")
    return byName(preferred);

  const available = supported.length ? supported : COMMUNICATION;
  const grounded = available.filter((c) => !c.exotic);
  return pickFrom(grounded.length ? grounded : available, rng);
}

/** Longevity follows metabolism, which follows the environment. */
function deriveLifespan(
  environment: EnvironmentProfile,
  bodyPlan: BodyPlanProfile,
  mode: string,
  rng: Rng,
): LifespanProfile {
  const byName = (name: string) =>
    LIFESPANS.find((l) => l.name === name) ?? LIFESPANS[1];

  if (
    bodyPlan.name === "Self-replicating machine lineage" &&
    isFreeform(mode)
  ) {
    return byName("Effectively perpetual");
  }
  if (bodyPlan.name === "Chitinous exoskeletal") {
    return byName("Metamorphic castes");
  }
  // Cold, slow metabolisms live long; crowded, high-predation ones do not.
  if (environment.name === "Ice world" || environment.name === "Deep void") {
    return byName("Extended");
  }
  if (environment.name === "Dense-jungle world") return byName("Brief");
  const available = isFreeform(mode)
    ? LIFESPANS
    : LIFESPANS.filter((l) => !l.exotic);
  return pickFrom(available, rng);
}

/** Resolve every option, filling unset ones from the mode-appropriate pools. */
export function resolveAlienRace(
  options: AlienRaceGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedAlienRace {
  const generationMode = choose(
    options.generationMode,
    alienRaceConfig.generationModes,
    rng,
  );
  return {
    genre: choose(options.genre, alienRaceConfig.genres, rng),
    generationMode,
    homeEnvironment: chooseProfile(
      options.homeEnvironment,
      ENVIRONMENTS,
      generationMode,
      rng,
    ).name,
    bodyPlan: chooseProfile(options.bodyPlan, BODY_PLANS, generationMode, rng)
      .name,
    psychology: choose(options.psychology, alienRaceConfig.psychologies, rng),
    socialOrganisation: choose(
      options.socialOrganisation,
      alienRaceConfig.socialOrganisations,
      rng,
    ),
    technologyLevel: choose(
      options.technologyLevel,
      alienRaceConfig.technologyLevels,
      rng,
    ),
    relationToOutsiders: choose(
      options.relationToOutsiders,
      alienRaceConfig.relationsToOutsiders,
      rng,
    ),
  };
}

/**
 * Generate a complete local draft without network access or vault writes.
 *
 * Sections are assembled from the resolved traits' own `consequence` fields,
 * so the body plan visibly reaches into Technology and Culture, the
 * communication channel into Psychology and Naming Conventions, and the
 * lifespan into Culture and Beliefs — the issue's core principle, enforced
 * structurally rather than left to chance.
 */
export function generateAlienRaceLocal(
  options: AlienRaceGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveAlienRace(options, rng);
  const bodyPlan =
    BODY_PLANS.find((b) => b.name === resolved.bodyPlan) ?? BODY_PLANS[0];
  const environment =
    ENVIRONMENTS.find((e) => e.name === resolved.homeEnvironment) ??
    ENVIRONMENTS[0];
  const psychology =
    PSYCHOLOGIES.find((p) => p.name === resolved.psychology) ?? PSYCHOLOGIES[0];
  const relation =
    RELATIONS.find((r) => r.name === resolved.relationToOutsiders) ??
    RELATIONS[0];
  const communication = deriveCommunication(bodyPlan, environment, rng);
  const lifespan = deriveLifespan(
    environment,
    bodyPlan,
    resolved.generationMode,
    rng,
  );
  const title = chooseName(options.avoidNames ?? [], rng);

  // Each trait's consequence is spent in exactly one section, so the draft
  // reads as a chain of implications rather than restating the same fragment
  // under several headings.
  const speciality = environment.speciality.split(",")[0];
  const content = [
    "## Overview",
    `The ${title} are a ${resolved.genre.toLowerCase()} species with ${bodyPlan.detail}, native to ${environment.detail}. Their disposition is ${psychology.detail}, they are organised as ${resolved.socialOrganisation.toLowerCase()}, and they currently stand as ${resolved.relationToOutsiders.toLowerCase()} to their neighbours.`,
    "",
    "## Evolutionary Origin",
    `They evolved in ${environment.detail}, which selected for ${environment.selectedFor}. Everything else about them follows from that pressure rather than from any design.`,
    "",
    "## Homeworld & Environment",
    `Their homeworld is ${environment.detail}. Because of it, ${environment.consequence}.`,
    "",
    "## Biology & Lifecycle",
    `Physically they have ${bodyPlan.detail}. They live ${lifespan.detail}; ${lifespan.consequence}.`,
    "",
    "## Senses, Communication & Psychology",
    `They communicate by ${communication.detail}, which means ${communication.consequence}. In practice, ${communication.privacy}. Temperamentally they are ${psychology.detail}: ${psychology.consequence}.`,
    "",
    "## Culture & Social Structure",
    `They organise themselves as ${resolved.socialOrganisation.toLowerCase()}. ${capitalise(lifespan.politics)}. Their body plan shows here too: ${bodyPlan.consequence}.`,
    "",
    "## Technology",
    `At ${article(resolved.technologyLevel)} ${resolved.technologyLevel.toLowerCase()} level, their engineering shows its origins plainly: ${bodyPlan.technology}. Their acknowledged speciality is ${environment.speciality}.`,
    "",
    "## Beliefs & Worldview",
    `${capitalise(psychology.worldview)}. What another species would call faith, they treat as an accurate description of how the world has always behaved for them.`,
    "",
    "## Relations with Outsiders",
    `They are currently ${resolved.relationToOutsiders.toLowerCase()}. The friction is rarely malice: ${relation.friction}.`,
    "",
    "## Internal Factions & Conflicts",
    `One faction holds that their ${speciality} should be traded openly for standing among other species; another argues that dependence is exactly how a species like theirs gets absorbed. Neither side is wrong about the risk.`,
  ].join("\n");

  const lore = [
    "## Weaknesses & Constraints",
    `- ${capitalise(bodyPlan.weakness)}.`,
    `- ${capitalise(environment.constraint)}.`,
    "",
    "## Naming Conventions",
    `${capitalise(communication.naming)}.`,
    "",
    "## Typical Archetypes",
    `- **The Intermediary** — one of the few who can work comfortably with outsiders, and quietly distrusted at home for it.`,
    `- **The Specialist** — trained into their people's speciality, ${speciality}, and worth more abroad than at home.`,
    `- **The Traditionalist** — holds that the accommodations their people keep making will end with there being nothing left to accommodate.`,
    "",
    "## Adventure Hooks",
    `- A delegation of the ${title} needs an outsider to carry a message their own communication cannot safely encode.`,
    `- Something is exploiting a known weakness of theirs deliberately, and they cannot investigate it without admitting the weakness exists.`,
    `- Their two internal factions are both recruiting the party, and each is telling a partial truth about what the other intends.`,
  ].join("\n");

  return {
    type: "creature",
    title,
    // Leads with what makes them non-human rather than what they look like,
    // matching the rule the AI prompt sets for its own summary.
    summary: `The ${title} are a ${resolved.genre.toLowerCase()} species from ${environment.detail}, whose ${communication.name.toLowerCase()} communication and ${lifespan.name.toLowerCase()} lifespan make them persistently difficult for other species to read.`,
    content,
    lore,
    labels: [
      "alien-race",
      label(resolved.genre),
      label(resolved.generationMode.split("/")[0]),
      label(resolved.bodyPlan),
      label(resolved.homeEnvironment),
      label(resolved.socialOrganisation),
      label(resolved.technologyLevel),
    ],
    status: "active",
  };
}

/** Build the dedicated AI brief; campaign context is prepended by the registry. */
export function buildAlienRacePrompt(
  options: AlienRaceGeneratorOptions = {},
): AlienRacePrompt {
  const genre = options.genre?.trim() || "science-fiction";
  const generationMode = options.generationMode?.trim() || GROUNDED_MODE;
  const homeEnvironment =
    options.homeEnvironment?.trim() || "an environment of your choosing";
  const bodyPlan = options.bodyPlan?.trim() || "a body plan of your choosing";
  const psychology =
    options.psychology?.trim() || "a psychology of your choosing";
  const socialOrganisation =
    options.socialOrganisation?.trim() || "a social structure of your choosing";
  const technologyLevel =
    options.technologyLevel?.trim() || "a technology level of your choosing";
  const relationToOutsiders =
    options.relationToOutsiders?.trim() ||
    "a relationship to other species of your choosing";

  const extraAvoidedNames = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  )
    .map((name) => name.trim())
    .filter(Boolean);
  const nameRestrictions = extraAvoidedNames.length
    ? ` Also do not use these campaign-specific names: ${extraAvoidedNames.join(", ")}.`
    : "";

  const modeGuidance = isFreeform(generationMode)
    ? "Generation mode is Freeform / Fantastic: exotic life is permitted — crystalline organisms, colonial swarm minds, plasma structures, self-replicating machine lineages, life with no planetary origin. Exotic does not mean arbitrary: whatever you choose still has to obey its own internal logic consistently, and its strangeness must produce the same concrete downstream consequences a biological trait would."
    : "Generation mode is Grounded / Evolutionary: the species must be biologically plausible and clearly shaped by selection pressure from its environment. No crystalline, plasma, energy-based or machine life. Every trait should have an evolutionary reason a xenobiologist could argue for.";

  const genreGuidance =
    genre.toLowerCase() === "cosmic horror"
      ? "For Cosmic Horror, the species' alienness should be genuinely unsettling rather than merely exotic — what makes them frightening is that their priorities are coherent and simply not ours. Avoid making them evil; make them indifferent in a way that has consequences."
      : genre.toLowerCase() === "hard sci-fi"
        ? "For Hard Sci-Fi, keep biology, biochemistry and technology extrapolated from real principles — no unexplained psionics, no biology that violates thermodynamics for convenience."
        : genre.toLowerCase() === "cyberpunk"
          ? "For Cyberpunk, foreground who profits from this species — their labour, their biology, their homeworld's resources — and what augmentation or dependency that has created."
          : genre.toLowerCase() === "post-apocalyptic"
            ? "For Post-Apocalyptic, the species is living after something ended: their technology should be salvaged or inherited rather than understood, and their culture organised around what was lost."
            : "For Space Opera, the species should slot into a populated interstellar setting — give them a clear niche, a reputation, and a stake in someone else's politics.";

  return {
    systemInstruction:
      "You are a xenobiologist and worldbuilder designing a coherent alien species for a tabletop RPG campaign. Your defining constraint is consequence: every biological and environmental trait you establish must visibly change something else about the species. Never write a species that is humans with unusual appearances. Return only one valid JSON object.",
    userMessage: `Create a ${genre} alien species living in ${homeEnvironment}, with ${bodyPlan}, ${psychology} psychology, organised as ${socialOrganisation}, at a ${technologyLevel} technology level, standing as ${relationToOutsiders} to other species.
${formatCampaignContextBlock(options.campaignContext)}

${modeGuidance}

${genreGuidance}

Return JSON with "title", "summary", "labels", "connections", a markdown "content" field, and a markdown "lore" field. "title" is the species' own name for itself. "summary" must describe the species as a whole in one sentence, leading with what makes them genuinely non-human rather than what they look like.

"content" must use these exact sections:
## Overview
## Evolutionary Origin
## Homeworld & Environment
## Biology & Lifecycle
## Senses, Communication & Psychology
## Culture & Social Structure
## Technology
## Beliefs & Worldview
## Relations with Outsiders
## Internal Factions & Conflicts

"lore" must use these exact sections:
## Weaknesses & Constraints
## Naming Conventions
## Typical Archetypes
## Adventure Hooks

The single most important rule: **every major biological or environmental difference must have consequences elsewhere in the species design.** A trait that appears in "## Biology & Lifecycle" and nowhere else is a failure. Concretely — six limbs must change their tools, their architecture, or a social concept they have that we do not; chemical or broadcast communication must change what privacy, secrecy and deception mean to them, and therefore how their law and their conspiracies work; an extreme lifespan must change their politics, inheritance, and how their institutions retain memory; a hostile home environment must show up in their technological speciality and in what they consider basic hospitality or basic decency. "## Technology" must explicitly reflect the body plan and the homeworld, not describe generic technology at the stated level. "## Culture & Social Structure" and "## Beliefs & Worldview" must both trace back to a specific biological or environmental fact you established earlier. "## Weaknesses & Constraints" must follow from the biology you actually described rather than being a list of unrelated vulnerabilities, and at least one weakness must be something the species cannot simply engineer around. "## Naming Conventions" must be consistent with how they communicate — a species that signals chemically or by light does not have names that survive being spoken aloud unchanged. "## Typical Archetypes" must be roles that only make sense for this species, not portable fantasy classes. "## Adventure Hooks" must contain at least three playable hooks that each depend on something specific to this species — a hook that would work equally well for any other species is a failure.

Keep the species politically ambiguous: "## Internal Factions & Conflicts" must present at least two positions with defensible reasoning, and "## Relations with Outsiders" must make their friction with other species legible as a difference in priorities rather than villainy. Labels must match the actual generated content.

${NAME_BAN_PROMPT}${nameRestrictions}

Before returning, run a consistency pass: confirm the body plan you described in "## Biology & Lifecycle" is visibly reflected in "## Technology" (tools, architecture, or movement) and in at least one social concept in "## Culture & Social Structure"; confirm the communication method drives what "## Senses, Communication & Psychology" says about privacy or deception and matches "## Naming Conventions"; confirm the lifespan you established governs what "## Culture & Social Structure" says about inheritance, succession, or institutional memory; confirm the home environment is reflected in the technological speciality named in "## Technology" and in at least one entry under "## Weaknesses & Constraints"; confirm every weakness follows from a trait you actually described rather than being unrelated; confirm each of the three adventure hooks depends on a specific trait of this species and would not work unchanged for a generic species; confirm neither internal faction nor the species itself is written as simply villainous; and confirm the species could not be described accurately as a human culture with unusual physiology. Quietly correct anything that fails, then return only the corrected final JSON.`,
  };
}

/** Parse an AI alien race draft into the public generator output contract. */
export function parseAlienRaceResponse(
  text: string,
  avoidNames: readonly string[] = [],
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    content?: unknown;
    lore?: unknown;
    labels?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Alien race response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("Alien race response is missing lore.");
  }
  const forbidden = new Set(
    [...BANNED_NAMES, ...avoidNames].map((name) => name.trim().toLowerCase()),
  );
  if (forbidden.has(data.title.trim().toLowerCase())) {
    throw new Error("Alien race response uses a banned title.");
  }

  const labels = [
    "alien-race",
    ...(Array.isArray(data.labels)
      ? data.labels.filter(
          (item): item is string => typeof item === "string" && !!item.trim(),
        )
      : []),
  ].filter((item, index, all) => all.indexOf(item) === index);

  return {
    type: "creature",
    title: data.title.trim(),
    summary: typeof data.summary === "string" ? sanitizeText(data.summary) : "",
    content:
      typeof data.content === "string" ? sanitizeText(data.content.trim()) : "",
    lore: sanitizeText(data.lore.trim()),
    labels,
    status: "active",
  };
}
