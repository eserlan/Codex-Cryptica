/**
 * Constants and static profiles for the Alien Race generator.
 */

export const GROUNDED_MODE = "Grounded / Evolutionary";
export const FREEFORM_MODE = "Freeform / Fantastic";

/**
 * A trait's downstream effects. `consequence` is the concrete, non-cosmetic
 * change the trait forces on the species' daily life; the remaining fields
 * feed the specific lore sections that trait should visibly reach into.
 */
export interface TraitProfile {
  name: string;
  /** Only offered in Freeform mode. */
  exotic?: boolean;
  /** One lowercase fragment describing the trait itself. */
  detail: string;
  /** The knock-on effect this trait forces elsewhere in the species design. */
  consequence: string;
}

export interface BodyPlanProfile extends TraitProfile {
  /** How the body plan shows up in tools, architecture, or movement. */
  technology: string;
  /** A biological constraint the body plan imposes. */
  weakness: string;
}

export interface EnvironmentProfile extends TraitProfile {
  /**
   * Compact noun phrase for the three places the environment is referenced
   * after "## Homeworld & Environment" has already described it in full.
   * Without it the same long clause repeats four times in one draft.
   */
  short: string;
  /** What the environment selected for, for "## Evolutionary Origin". */
  selectedFor: string;
  /** The technological speciality the environment pushed them towards. */
  speciality: string;
  /**
   * The speciality as a short noun phrase, for mid-sentence use. Stored
   * rather than derived: splitting `speciality` on its first comma looks
   * equivalent but four entries have no comma, and those dropped the whole
   * 90-plus-character clause into the middle of a sentence.
   */
  specialityShort: string;
  /** A hard limit the environment leaves them with, for "## Weaknesses". */
  constraint: string;
}

export interface PsychologyProfile extends TraitProfile {
  /** How the disposition shows up as a worldview rather than a mood. */
  worldview: string;
}

export interface RelationProfile {
  name: string;
  /** Where the friction with outsiders actually comes from. */
  friction: string;
}

export interface CommunicationProfile extends TraitProfile {
  /** Summary phrase, for the same reason as LifespanProfile's. */
  summaryPhrase: string;
  /** What privacy, secrecy, and lying mean given this channel. */
  privacy: string;
  /** How the channel constrains or shapes their names. */
  naming: string;
}

export interface LifespanProfile extends TraitProfile {
  /**
   * Summary phrase. The name alone cannot be suffixed with "lifespan" —
   * "metamorphic castes lifespan" — so the whole phrase is stored.
   */
  summaryPhrase: string;
  /** How the lifespan reshapes politics, inheritance, and institutions. */
  politics: string;
}

export const BODY_PLANS: readonly BodyPlanProfile[] = [
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

export const ENVIRONMENTS: readonly EnvironmentProfile[] = [
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
    short: "a high-gravity world",
    specialityShort: "structural engineering",
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
    short: "a low-gravity moon",
    specialityShort: "orbital mechanics",
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
    short: "a tidally locked world",
    specialityShort: "thermal management",
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
    short: "an ocean world",
    specialityShort: "pressure vessels",
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
    short: "a desert world",
    specialityShort: "closed-loop recycling",
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
    short: "an ice world",
    specialityShort: "thermal drilling",
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
    short: "a dense-jungle world",
    specialityShort: "biochemistry and pharmacology",
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
    short: "a volcanic world",
    specialityShort: "geothermal power",
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
    short: "the thin-atmosphere highlands",
    specialityShort: "gas separation",
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
    short: "a gas giant's cloud deck",
    specialityShort: "atmospheric chemistry",
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
    short: "the deep void",
    specialityShort: "radiation handling",
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
    short: "a generation ship's interior",
    specialityShort: "life support",
  },
];

export const COMMUNICATION: readonly CommunicationProfile[] = [
  {
    name: "Chemical / pheromonal",
    detail: "emitted chemical signals read directly from the air",
    consequence:
      "emotional state is broadcast whether or not they intend it, so their society developed around managed exposure rather than concealment",
    privacy:
      "they cannot lie about how they feel, only about why — so their deceptions are elaborate constructions of true feelings arranged to mislead, and they consider a species that can simply say something false to be fundamentally dangerous",
    naming:
      "spoken names are transliterations of a scent-signature and are considered approximations at best; each has several equally valid written forms",
    summaryPhrase: "chemical speech",
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
    summaryPhrase: "speech in light",
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
    summaryPhrase: "infrasound speech",
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
    summaryPhrase: "postural speech",
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
    summaryPhrase: "speech in modulated fields",
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
    summaryPhrase: "ordinary speech",
  },
];

export const LIFESPANS: readonly LifespanProfile[] = [
  {
    name: "Brief",
    detail: "a working lifespan of roughly twenty-five years",
    consequence:
      "they are always in a hurry, and other species mistake that urgency for aggression",
    politics:
      "power changes hands constantly, nothing is inherited because nobody lives to inherit it, and their institutions are written down obsessively because no living memory spans two generations",
    summaryPhrase: "twenty-five-year lives",
  },
  {
    name: "Comparable to most species",
    detail: "a lifespan broadly comparable to most spacefaring species",
    consequence:
      "their generational rhythms line up with their neighbours', which is the least remarked-upon reason they integrate so easily",
    politics:
      "their politics run on familiar cycles of succession and reform, making them the species everyone else uses as a baseline",
    summaryPhrase: "unremarkable lifespan",
  },
  {
    name: "Extended",
    detail: "a lifespan measured in three or four centuries",
    consequence:
      "they plan on timescales that make their treaty partners nervous, and routinely outlive the governments they negotiated with",
    politics:
      "offices are held for centuries, inheritance is rare enough to be a scandal, and their reform movements are led by people who personally remember the last three failures",
    summaryPhrase: "centuries-long lives",
  },
  {
    name: "Metamorphic castes",
    detail:
      "a life cycle passing through distinct bodily stages, each with different capabilities",
    consequence:
      "an individual is not one person to them but a sequence, and their languages use different pronouns and often different names per stage",
    politics:
      "authority attaches to a life stage rather than a person, so their leadership rotates biologically and cannot be seized — only waited for",
    summaryPhrase: "metamorphic life stages",
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
    summaryPhrase: "refusal to age",
  },
];

export const PSYCHOLOGIES: readonly PsychologyProfile[] = [
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

/**
 * Non-biological sources of culture. Without these the local draft derives an
 * entire civilisation from one adaptation, which is exactly the biological
 * determinism the prompt forbids — so the local path carries the same rule:
 * something about how they live has to come from contingent history rather
 * than from their bodies.
 */
export const CONTINGENCIES: readonly string[] = [
  "their present institutions date from a treaty signed in bad faith three generations ago, whose terms held anyway and whose original purpose nobody now alive can reconstruct",
  "an early and unusually good relationship with a passing trade power gave them a legal vocabulary they never developed themselves, and they still argue in a grammar borrowed from strangers",
  "a single catastrophic engineering failure, entirely avoidable, made caution a civic virtue in a way nothing about their biology required",
  "the settlement that happened to sit on the only navigable route became their capital by accident and has been defending that accident politically ever since",
  "a religious schism that began as a technical dispute over calendars hardened into two legal traditions that still will not recognise each other's contracts",
  "they adopted a foreign manufacturing technique for one narrow purpose, and it reorganised their labour, their cities and their inheritance law as a side effect nobody intended",
  "a long rivalry between two resource-holding regions shaped their politics far more than any shared trait did, and neither region's interests follow from biology at all",
  "an old prohibition everyone still observes has no remembered reason behind it, and the two competing explanations offered for it are both demonstrably recent inventions",
];

export const RELATIONS: readonly RelationProfile[] = [
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
