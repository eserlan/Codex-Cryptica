/**
 * Everyday-life content for the settlement generator (#2536).
 *
 * A settlement should answer four questions: why it exists, what everyday life
 * is like, who lives there, and what is happening right now. The smart schema
 * (#2341) already answers the first and fourth through its resolved axes. This
 * module answers the other two, and it does it the same way the schema does its
 * job: by composing the trait vocabulary already annotated on the axis options,
 * rather than hand-authoring a second set of tables per genre. A trait like
 * "trade" or "religious" already means the same thing across all 13 genres, so
 * an occupation, a role title or a point-of-interest category built from it
 * works everywhere for free.
 *
 * Nothing here reads `mainTension`, on purpose, except the one authority-figure
 * slot that is allowed to. A settlement should read as a place that would keep
 * existing if its current crisis vanished tomorrow.
 */

import { pickFrom, pickRandomItems, type Rng } from "./random-utils";
import { settlementConfig } from "./public-settlement-constants";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";
import {
  AUTHORITY_TRAITS,
  ENVIRONMENT_TRAITS,
  FACTION_TRAITS,
  FUNCTION_TRAITS,
  LOCATION_TRAITS,
  TONE_TRAITS,
  type SettlementTrait,
} from "./public-settlement-traits";
import { selectSmart, type ResolveContext, type SmartOption } from "./smart";

/** Where a settlement's size falls on its genre's own four-rung ladder. */
export function rungFor(
  sizes: readonly { name: string }[],
  sizeName: string,
): number {
  const index = sizes.findIndex((s) => s.name === sizeName);
  // A custom scale the user typed has no rung of its own; the middle of the
  // ladder is the least surprising place to borrow institutional complexity
  // from, same choice `resolveSettlement` already makes for population range.
  return index >= 0 ? index : Math.floor((sizes.length - 1) / 2);
}

export interface ScaleTargets {
  notableInhabitants: number;
  factions: number;
  economicGroups: number;
}

const SCALE_LADDER: readonly ScaleTargets[] = [
  { notableInhabitants: 3, factions: 2, economicGroups: 2 },
  { notableInhabitants: 4, factions: 2, economicGroups: 3 },
  { notableInhabitants: 5, factions: 3, economicGroups: 4 },
  { notableInhabitants: 6, factions: 3, economicGroups: 5 },
];

export function scaleFor(rung: number): ScaleTargets {
  return SCALE_LADDER[Math.min(Math.max(rung, 0), SCALE_LADDER.length - 1)];
}

type TraitPhrases = Partial<Record<SettlementTrait, readonly string[]>>;

/**
 * Believable approximations of who makes up a settlement's economy, not a
 * census. Each trait offers a few phrasings so the same trait does not read
 * identically every time it appears.
 */
const OCCUPATION_BY_TRAIT: TraitPhrases = {
  trade: [
    "a small but influential merchant community",
    "traders and caravan hands moving goods through daily",
    "a market district that runs on credit and reputation as much as coin",
  ],
  maritime: [
    "many fishers, net-menders and boat hands",
    "a working waterfront of crews, haulers and dockhands",
  ],
  mining: [
    "many miners and prospectors",
    "most working residents down in the shafts or supporting those who are",
  ],
  industrial: [
    "shift workers and foremen running the works around the clock",
    "a labouring class that outnumbers everyone else combined",
  ],
  agrarian: [
    "many herders and agricultural workers",
    "farming families who make up most of the population outside the centre",
  ],
  military: [
    "~25% military personnel, garrisoned or billeted locally",
    "a soldiery large enough to shape the town's daily rhythm",
  ],
  religious: [
    "a visible clergy and a steady stream of the devout",
    "temple staff, pilgrims and those who serve them",
  ],
  academic: [
    "students and scholars who outnumber most other newcomers",
    "a resident academic community that treats the place as a company town",
  ],
  research: [
    "a small cadre of researchers and their support staff",
    "technicians and specialists who rarely mix with the rest of the population",
  ],
  criminal: [
    "an underworld presence everyone pretends not to notice",
    "smugglers, fences and the people who quietly work for them",
  ],
  administrative: [
    "clerks, officials and the paperwork they generate",
    "a bureaucracy sized for a settlement twice this large",
  ],
  entertainment: [
    "innkeepers, performers and those who cater to visitors",
    "a hospitality trade that survives on travellers passing through",
  ],
  transit: [
    "waystation staff and the travellers who never quite stay",
    "hostlers, guides and provisioners serving the road",
  ],
  medical: [
    "healers and orderlies stretched thin",
    "a medical staff larger than the population would otherwise justify",
  ],
  refuge: [
    "recent arrivals who outnumber anyone born here",
    "displaced families still finding their footing",
  ],
  forest: ["foresters, trappers and those who work the treeline"],
  desert: ["caravan crews and well-keepers who know the routes that matter"],
  urban: ["a dense mix of trades that would spread out more anywhere else"],
  underground: [
    "tunnel-wrights and lamp-tenders who rarely see daylight on shift",
  ],
  prosperous: [
    "a comfortable merchant and landholding class visibly doing well",
  ],
  declining: [
    "more empty storefronts than full ones, and fewer young people each year",
  ],
  frontier: ["settlers and newcomers still outnumbering anyone born here"],
};

/** Occasionally noted, since not every settlement's population moves seasonally. */
const SEASONAL_BY_TRAIT: TraitPhrases = {
  agrarian: [
    "a seasonal harvest crew that swells the population for a few weeks",
  ],
  maritime: [
    "a fishing fleet's crews, present or absent depending on the season",
  ],
  entertainment: [
    "a wave of seasonal visitors who never quite become residents",
  ],
  transit: [
    "caravans and travellers who pass through in numbers, never staying",
  ],
  religious: [
    "pilgrims arriving in numbers around a particular date each year",
  ],
  mining: [
    "prospectors who drift in during a good season and out during a lean one",
  ],
};

/** "Unusually few X" reads as characterful contrast against the dominant groups. */
const SPARSE_BY_TRAIT: TraitPhrases = {
  isolated: [
    "unusually few specialist craftspeople, most goods made do or made at home",
  ],
  military: [
    "unusually few tradespeople outside what the garrison itself needs",
  ],
  academic: ["unusually few farmers; most food arrives from outside"],
  criminal: ["unusually few who will admit what they actually do for a living"],
};

function firstMatch<T>(
  traits: readonly string[],
  table: Partial<Record<string, readonly T[]>>,
): T | undefined {
  for (const trait of traits) {
    const options = table[trait];
    if (options && options.length > 0) return options[0];
  }
  return undefined;
}

/** Like `firstMatch`, but returns the whole matched list rather than just its
 * first entry — for callers that want to choose among several options for the
 * one trait that matched, e.g. picking a profession title. */
function firstMatchList<T>(
  traits: readonly string[],
  table: Partial<Record<string, readonly T[]>>,
): readonly T[] | undefined {
  for (const trait of traits) {
    const options = table[trait];
    if (options && options.length > 0) return options;
  }
  return undefined;
}

function pickMatch<T>(
  traits: readonly string[],
  table: Partial<Record<string, readonly T[]>>,
  rng: Rng,
): T | undefined {
  for (const trait of traits) {
    const options = table[trait];
    if (options && options.length > 0) return pickFrom(options, rng);
  }
  return undefined;
}

export interface InhabitantsOverview {
  economicGroups: string[];
  transient?: string;
}

/**
 * The trait priority a settlement's occupations follow: what it is for comes
 * first, then where it is, then who runs it. A hamlet only reaches as many
 * groups as its `economicGroups` target allows, which is where scale actually
 * changes the description rather than just the population number.
 */
export function buildInhabitants(
  values: Readonly<Record<string, string>>,
  scale: ScaleTargets,
  rng: Rng,
): InhabitantsOverview {
  const functionTraits = FUNCTION_TRAITS[values.primaryFunction] ?? [];
  const environmentTraits = ENVIRONMENT_TRAITS[values.environment] ?? [];
  const authorityTraits = AUTHORITY_TRAITS[values.authorityType] ?? [];
  const toneTraits = TONE_TRAITS[values.tone] ?? [];
  // What the settlement is for drives the dominant groups; where it sits, who
  // runs it and how it feels fill out the rest. A larger settlement's higher
  // target only means something if there is enough trait material to reach it.
  const priority = [
    ...functionTraits,
    ...environmentTraits,
    ...authorityTraits,
    ...toneTraits,
  ];

  const economicGroups: string[] = [];
  const used = new Set<string>();
  for (const trait of priority) {
    if (economicGroups.length >= scale.economicGroups) break;
    if (used.has(trait)) continue;
    const phrase = pickMatch([trait], OCCUPATION_BY_TRAIT, rng);
    if (!phrase) continue;
    used.add(trait);
    economicGroups.push(phrase);
  }

  // A sparse-group contrast line, roughly a third of the time, gives the
  // description texture beyond a flat list of who is present.
  if (economicGroups.length < scale.economicGroups && rng() < 0.35) {
    const sparse = pickMatch(priority, SPARSE_BY_TRAIT, rng);
    if (sparse) economicGroups.push(sparse);
  }

  if (economicGroups.length === 0) {
    economicGroups.push(
      "a mostly self-sufficient population with no single dominant trade",
    );
  }

  const seasonal =
    rng() < 0.4 ? pickMatch(priority, SEASONAL_BY_TRAIT, rng) : undefined;

  return { economicGroups, transient: seasonal };
}

export type InhabitantCategory =
  "authority" | "profession" | "social" | "ordinary" | "eccentric";

export interface NotableInhabitant {
  name: string;
  role: string;
  note: string;
  category: InhabitantCategory;
}

const AUTHORITY_ROLE_BY_TRAIT: TraitPhrases = {
  elected: ["Council Member"],
  oligarchic: ["Guild Representative"],
  "criminal-rule": ["Enforcer"],
  autocratic: ["Household Officer"],
  feudal: ["Steward"],
  military: ["Garrison Officer"],
  religious: ["Temple Elder"],
  tribal: ["Elder"],
  imperial: ["Imperial Officer"],
  artificial: ["System Liaison"],
};

const PROFESSION_BY_TRAIT: TraitPhrases = {
  trade: ["Caravan Master", "Market Broker"],
  maritime: ["Ship's Chandler", "Harbourmaster's Mate"],
  mining: ["Mine Foreman", "Assayer"],
  industrial: ["Works Supervisor", "Machinist"],
  agrarian: ["Herd Master", "Grain Factor"],
  military: ["Quartermaster", "Drill Sergeant"],
  religious: ["Lay Priest", "Shrine Keeper"],
  academic: ["Archivist", "Visiting Scholar"],
  research: ["Field Technician", "Survey Lead"],
  criminal: ["Fence", "Information Broker"],
  administrative: ["Records Clerk", "Tax Assessor"],
  entertainment: ["Innkeeper", "Troupe Leader"],
  medical: ["Herbalist", "Ward Orderly"],
};

const SOCIAL_ROLE_BY_TRAIT: TraitPhrases = {
  religious: ["Priest"],
  isolated: ["Guide"],
  academic: ["Teacher"],
  criminal: ["Fixer"],
  maritime: ["Harbour Healer"],
};
const DEFAULT_SOCIAL_ROLES = ["Innkeeper", "Healer", "Teacher", "Town Gossip"];

const ORDINARY_NOTE_VARIANTS = [
  (settlement: string) =>
    `has lived through three changes of fortune in ${settlement} and expects a fourth`,
  () => "knows every shortcut and every debt owed in the district",
  (settlement: string, environment: string) =>
    `remembers what ${settlement} was like before the ${environment.toLowerCase()} shaped it into what it is now`,
  () => "trades in small favours and never quite says no",
  (settlement: string) =>
    `has opinions about ${settlement}'s leadership and will share them unasked`,
] as const;

const ECCENTRIC_NOTE_VARIANTS = [
  () =>
    "keeps a private theory about the place that nobody else takes seriously, and might be right",
  (settlement: string) =>
    `claims to remember something about ${settlement} that the official histories do not`,
  () =>
    "collects a thing nobody understands the point of, and will happily explain it at length",
  () =>
    "is either harmless or the most dangerous person here, and opinion in town is split",
] as const;

const AUTHORITY_NOTE_VARIANTS = [
  (tension: string) =>
    `is quietly working an angle on ${tension.toLowerCase()} that the rest of the leadership does not know about`,
  () =>
    "holds real influence that has nothing to do with the official chain of command",
  (tension: string) =>
    `wants ${tension.toLowerCase()} resolved quietly, before it becomes everyone else's problem`,
] as const;

const PROFESSION_NOTE_VARIANTS = [
  (role: string) =>
    `is the person everyone actually goes to when the official ${role.toLowerCase()} process is too slow`,
  () =>
    "has strong opinions about how things used to be done, and is not shy about them",
  () =>
    "is good enough at the job to be indispensable and just difficult enough to resent",
] as const;

const SOCIAL_NOTE_VARIANTS = [
  () => "hears everything that passes through and forgets very little of it",
  () => "is the closest thing the settlement has to a neutral party",
  () => "will help almost anyone, for a price that is not always coin",
] as const;

/**
 * A person's name, not a place's. `namePrefixesByGenre`/`nameSuffixesByGenre`
 * in `public-settlement-constants.ts` are built to combine into settlement
 * names ("Ashveil" + " Village"); reusing them here produced NPCs named
 * things like "Deepwell Village". `INHABITANT_NAMES_BY_GENRE` is a flat pool
 * built to read as a person instead.
 */
function makeName(
  genre: string,
  settlementName: string,
  taken: Set<string>,
  rng: Rng,
): string {
  const names =
    INHABITANT_NAMES_BY_GENRE[genre] ?? INHABITANT_NAMES_BY_GENRE["Fantasy"];

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = pickFrom(names, rng);
    if (candidate !== settlementName && !taken.has(candidate)) return candidate;
  }
  // Exceedingly unlikely with the pool sizes involved, but a name must be
  // returned rather than the caller silently losing an inhabitant.
  return `${pickFrom(names, rng)} the Younger`;
}

/**
 * Build the settlement's notable inhabitants: not all faction leaders, not all
 * strangers to each other's business. Slot order is deliberate — authority
 * first (capped low), then a working profession, a socially useful role, an
 * ordinary resident, and only at the top of the scale an eccentric.
 */
export function buildNotableInhabitants(
  values: Readonly<Record<string, string>>,
  genre: string,
  count: number,
  settlementName: string,
  rng: Rng,
): NotableInhabitant[] {
  const functionTraits = FUNCTION_TRAITS[values.primaryFunction] ?? [];
  const authorityTraits = AUTHORITY_TRAITS[values.authorityType] ?? [];

  const plan: InhabitantCategory[] = [];
  // At most 2 authority/faction figures, per spec, regardless of scale.
  plan.push("authority");
  plan.push("profession");
  plan.push("social");
  plan.push("ordinary");
  if (count >= 5) plan.push("profession");
  if (count >= 6) plan.push("eccentric");
  const slots = plan.slice(0, count);

  const taken = new Set<string>();
  const usedRoles = new Set<string>();
  const inhabitants: NotableInhabitant[] = [];

  for (const category of slots) {
    const name = makeName(genre, settlementName, taken, rng);
    taken.add(name);

    let role: string;
    let note: string;

    switch (category) {
      case "authority": {
        role =
          firstMatch(authorityTraits, AUTHORITY_ROLE_BY_TRAIT) ??
          "Local Notable";
        note = pickFrom(AUTHORITY_NOTE_VARIANTS, rng)(values.mainTension);
        break;
      }
      case "profession": {
        const candidates = firstMatchList(
          functionTraits,
          PROFESSION_BY_TRAIT,
        ) ??
          firstMatchList(authorityTraits, PROFESSION_BY_TRAIT) ?? [
            "Local Tradesperson",
          ];
        // A second profession slot (scale 5+) should read as a different job,
        // not the same title worn by two different people.
        const fresh = candidates.filter((c) => !usedRoles.has(c));
        role = pickFrom(fresh.length > 0 ? fresh : candidates, rng);
        usedRoles.add(role);
        note = pickFrom(PROFESSION_NOTE_VARIANTS, rng)(role);
        break;
      }
      case "social": {
        role =
          pickMatch(
            [...functionTraits, ...(values.environment ? [] : [])],
            SOCIAL_ROLE_BY_TRAIT,
            rng,
          ) ?? pickFrom(DEFAULT_SOCIAL_ROLES, rng);
        note = pickFrom(SOCIAL_NOTE_VARIANTS, rng)();
        break;
      }
      case "ordinary": {
        role = "Local Resident";
        note = pickFrom(ORDINARY_NOTE_VARIANTS, rng)(
          settlementName,
          values.environment,
        );
        break;
      }
      case "eccentric": {
        role = "Notable Character";
        note = pickFrom(ECCENTRIC_NOTE_VARIANTS, rng)(settlementName);
        break;
      }
    }

    inhabitants.push({ name, role, note, category });
  }

  return inhabitants;
}

type LifeCategory =
  | "livelihood"
  | "tradeOrIndustry"
  | "custom"
  | "recreation"
  | "complaint"
  | "commonTopic"
  | "outsiderMisunderstanding";

const LIFE_HERE_BY_CATEGORY: Record<LifeCategory, TraitPhrases> = {
  livelihood: {
    trade: [
      "Most working days revolve around what arrived, what left, and what it fetched.",
    ],
    mining: [
      "The day is shaped by shift changes at the mine, whether anyone works there or not.",
    ],
    agrarian: ["Life runs on the growing season more than the calendar."],
    maritime: ["The tide, not the clock, decides when the working day starts."],
    military: [
      "The garrison's drum and drill mark the hours for everyone nearby.",
    ],
  },
  tradeOrIndustry: {
    trade: [
      "A weekly market is the closest thing the settlement has to a town-wide event.",
    ],
    industrial: ["The works never fully stop, and neither does the noise."],
    agrarian: ["Surplus goes out in cart-loads; not much stays behind."],
    academic: [
      "Paper, ink and copying work quietly support a surprising number of households.",
    ],
  },
  custom: {
    religious: [
      "A small daily observance is kept even by residents who would not call themselves devout.",
    ],
    trade: ["A handshake still counts for more here than a signature."],
    isolated: [
      "Newcomers are watched for a full season before anyone calls them a neighbour.",
    ],
    military: ["Rank is observed off duty as carefully as on it."],
  },
  recreation: {
    entertainment: [
      "An evening at the common house is where most disputes actually get settled.",
    ],
    religious: ["Feast days double as the settlement's real social calendar."],
    maritime: [
      "A wager on the day's catch is the closest thing to a local sport.",
    ],
    academic: [
      "Debate, formal or otherwise, passes for entertainment more than most visitors expect.",
    ],
  },
  complaint: {
    trade: [
      "Everyone agrees the tolls or tariffs are too high, and nobody agrees on what to do about it.",
    ],
    industrial: [
      "The noise, the smoke, or both, and nobody who could fix it seems inclined to.",
    ],
    isolated: [
      "How long it takes for anything, or anyone, to arrive from anywhere else.",
    ],
    military: [
      "How much of daily life answers to people who were not born here.",
    ],
  },
  commonTopic: {
    trade: ["Prices, and whether they will hold through the season."],
    mining: ["Whether the current seam is running thin."],
    religious: [
      "Whatever the last sermon or sign was actually supposed to mean.",
    ],
    isolated: ["Who left, who arrived, and what either one might mean."],
  },
  outsiderMisunderstanding: {
    trade: ["Visitors assume the wealth is evenly spread. It is not."],
    military: [
      "Visitors assume the garrison and the town want the same things. They mostly don't.",
    ],
    religious: [
      "Visitors assume the observance is about belief. For most residents it is about belonging.",
    ],
    isolated: [
      "Visitors assume the isolation makes people simple. It mostly makes them careful.",
    ],
  },
};

const GENERIC_LIFE_LINES: Record<LifeCategory, string> = {
  livelihood:
    "Most residents work at whatever the settlement's function actually demands, day to day.",
  tradeOrIndustry:
    "Goods and services move through informal networks as much as any market.",
  custom:
    "A small local custom marks newcomers as newcomers, at least for a while.",
  recreation:
    "A regular gathering, however modest, is where most social business actually happens.",
  complaint: "Everyone has a shared grievance that outsiders would find minor.",
  commonTopic: "Local news travels faster than anything official.",
  outsiderMisunderstanding:
    "Visitors tend to misjudge how the place actually works, at least at first.",
};

/**
 * A small selection of everyday-life detail, not a checklist. Categories are
 * templated by trait so the detail differs by what the settlement is for and
 * where it sits, without ever leaning on the current tension for content.
 */
/**
 * `pois` is optional so existing callers (and the parity test suite) are
 * unaffected; when given, the "recreation" line sometimes names one of the
 * settlement's own points of interest instead of describing a generic
 * gathering place, so Life Here reads as connected to Points of Interest
 * rather than assembled as an independent section.
 */
export function buildLifeHere(
  values: Readonly<Record<string, string>>,
  rng: Rng,
  pois: readonly string[] = [],
): string[] {
  const functionTraits = FUNCTION_TRAITS[values.primaryFunction] ?? [];
  const environmentTraits = ENVIRONMENT_TRAITS[values.environment] ?? [];
  const traits = [...functionTraits, ...environmentTraits];

  const categories = Object.keys(LIFE_HERE_BY_CATEGORY) as LifeCategory[];
  const chosen = pickRandomItems(categories, 4 + Math.floor(rng() * 2), rng);

  return chosen.map((category) => {
    if (category === "recreation" && pois.length > 0 && rng() < 0.5) {
      return `Residents gather at ${pickFrom(pois, rng)} more than anywhere else in the settlement.`;
    }
    const table = LIFE_HERE_BY_CATEGORY[category];
    return firstMatch(traits, table) ?? GENERIC_LIFE_LINES[category];
  });
}

/** Which purpose a point of interest or faction serves, independent of genre. */
export type PoiCategory =
  "government" | "trade" | "social" | "religious" | "unusual" | "dangerous";

const POI_CATEGORY_TRAITS: Record<PoiCategory, readonly SettlementTrait[]> = {
  government: [
    "administrative",
    "military",
    "bureaucratic",
    "imperial",
    "feudal",
  ],
  trade: ["trade", "industrial", "mining", "maritime"],
  social: ["entertainment", "cosy", "vibrant"],
  religious: ["religious"],
  unusual: ["mysterious", "eerie", "supernatural"],
  dangerous: ["ruined", "criminal", "wasteland", "underground"],
};

export function settlementLocationCategoryPool(genre: string): SmartOption[] {
  const pool =
    settlementConfig.notableLocationsByGenre[genre] ??
    settlementConfig.notableLocationsByGenre["Fantasy"];
  return pool.map((value) => ({ value, traits: LOCATION_TRAITS[value] ?? [] }));
}

export interface DiverseSelection<C extends string = PoiCategory> {
  values: string[];
  categories: C[];
}

function selectDiverse<C extends string>(
  pool: readonly SmartOption[],
  count: number,
  ctx: ResolveContext,
  categoryTraits: Record<C, readonly SettlementTrait[]>,
  rng: Rng,
): DiverseSelection<C> {
  const values: string[] = [];
  const categories: C[] = [];
  const remaining = new Map(pool.map((o) => [o.value, o]));

  const order = pickRandomItems(
    Object.keys(categoryTraits) as C[],
    Object.keys(categoryTraits).length,
    rng,
  );

  for (const category of order) {
    if (values.length >= count) break;
    const traits = categoryTraits[category];
    const candidates = [...remaining.values()].filter((o) =>
      o.traits?.some((t) => traits.includes(t as SettlementTrait)),
    );
    if (candidates.length === 0) continue;
    const picked = selectSmart(candidates, 1, ctx, {}, rng).values[0];
    if (!picked) continue;
    values.push(picked);
    categories.push(category);
    remaining.delete(picked);
  }

  if (values.length < count) {
    const fill = selectSmart(
      [...remaining.values()],
      count - values.length,
      ctx,
      {},
      rng,
    );
    values.push(...fill.values);
    // Filled entries have no clear single category; they still read fine in
    // context, and the diversity guarantee is about the categorised entries.
    const fallback = order[0];
    categories.push(...fill.values.map(() => fallback));
  }

  return { values, categories };
}

export function selectDiversePoi(
  pool: readonly SmartOption[],
  count: number,
  ctx: ResolveContext,
  rng: Rng,
): DiverseSelection<PoiCategory> {
  return selectDiverse(pool, count, ctx, POI_CATEGORY_TRAITS, rng);
}

export type FactionCategory = "political" | "economic" | "cultural";

const FACTION_CATEGORY_TRAITS: Record<
  FactionCategory,
  readonly SettlementTrait[]
> = {
  political: ["administrative", "elected", "autocratic", "imperial", "feudal"],
  economic: ["trade", "oligarchic", "industrial", "mining", "criminal"],
  cultural: ["religious", "academic", "tribal", "supernatural"],
};

export function settlementFactionCategoryPool(genre: string): SmartOption[] {
  const pool =
    settlementConfig.factionsByGenre[genre] ??
    settlementConfig.factionsByGenre["Fantasy"];
  return pool.map((value) => ({ value, traits: FACTION_TRAITS[value] ?? [] }));
}

export function selectDiverseFactions(
  pool: readonly SmartOption[],
  count: number,
  ctx: ResolveContext,
  rng: Rng,
): DiverseSelection<FactionCategory> {
  return selectDiverse(pool, count, ctx, FACTION_CATEGORY_TRAITS, rng);
}

/**
 * Three deliberately different hooks: one tied to the current tension, one
 * from ordinary settlement life that has nothing to do with it, and one from
 * exploration, history or the wider region. A settlement whose hooks all
 * restate the tension reads as a location built around one plot rather than a
 * place with its own separate problems (#2536).
 */
export interface HookContext {
  environment: string;
  primaryFunction: string;
  authorityType: string;
  mainTension: string;
  factions: readonly string[];
  pois: readonly string[];
  inhabitants: readonly NotableInhabitant[];
}

/** Everything a hook variant might reach for, resolved once per generation. */
interface HookIngredients {
  tension: string;
  authority: string;
  environment: string;
  faction: string;
  secondFaction: string;
  poi: string;
  explorationPoi: string;
  social: NotableInhabitant | undefined;
}

const DANGEROUS_LOCATION_TRAITS: readonly SettlementTrait[] = [
  "ruined",
  "criminal",
  "wasteland",
  "underground",
  "mysterious",
  "eerie",
  "supernatural",
];

function gatherHookIngredients(ctx: HookContext, rng: Rng): HookIngredients {
  const faction = pickFrom(ctx.factions, rng);
  const secondFaction = ctx.factions.find((f) => f !== faction) ?? faction;
  // A dangerous or unusual location makes the sharper exploration hook when
  // one was drawn; any point of interest still works if none was.
  const explorationPoi =
    ctx.pois.find((p) =>
      (LOCATION_TRAITS[p] ?? []).some((t) =>
        DANGEROUS_LOCATION_TRAITS.includes(t),
      ),
    ) ?? pickFrom(ctx.pois, rng);
  // Drawn from what is left, so the ordinary-life hook does not land on the
  // exact same landmark the exploration hook just used.
  const remainingPois = ctx.pois.filter((p) => p !== explorationPoi);
  const poi = pickFrom(
    remainingPois.length > 0 ? remainingPois : ctx.pois,
    rng,
  );
  const social = ctx.inhabitants.find((i) => i.category !== "authority");

  return {
    tension: ctx.mainTension,
    authority: ctx.authorityType,
    environment: ctx.environment,
    faction,
    secondFaction,
    poi,
    explorationPoi,
    social,
  };
}

type HookVariant = (i: HookIngredients) => string;

const POLITICAL_HOOK_VARIANTS: readonly HookVariant[] = [
  (i) =>
    `Someone with real information about ${i.tension.toLowerCase()} has gone missing, and ${i.authority.toLowerCase()} wants it found quietly.`,
  (i) =>
    `${i.faction} is quietly working an angle on ${i.tension.toLowerCase()} that the official response has not accounted for.`,
  (i) =>
    `${i.authority} wants outside help with ${i.tension.toLowerCase()} without admitting they cannot handle it themselves.`,
];

const ORDINARY_HOOK_VARIANTS: readonly HookVariant[] = [
  (i) =>
    `A dispute over ${i.poi.toLowerCase()} has drawn in ${i.secondFaction.toLowerCase()}, for reasons that have nothing to do with the settlement's larger troubles.`,
  (i) =>
    `Something has gone wrong at ${i.poi.toLowerCase()}: a debt unpaid, a shipment short, an accident nobody wants to explain.`,
  (i) =>
    i.social
      ? `${i.social.name}, the local ${i.social.role.toLowerCase()}, needs a problem solved that has nothing to do with the tension in town.`
      : `A local resident needs a problem solved that has nothing to do with the tension in town.`,
  (i) =>
    `${i.secondFaction} has a routine problem — a shortage, a theft, a broken agreement — that would make a fine day's work for outsiders.`,
];

const EXPLORATION_HOOK_VARIANTS: readonly HookVariant[] = [
  (i) =>
    `${i.explorationPoi} has a history nobody currently living fully understands, and something about it has recently changed.`,
  (i) =>
    `The ${i.environment.toLowerCase()} beyond the settlement's edge holds something worth investigating, unconnected to anything happening in town.`,
  (i) =>
    `Access to ${i.explorationPoi.toLowerCase()} is restricted for reasons the settlement's current authority did not create and cannot fully explain.`,
];

export function buildAdventureHooks(ctx: HookContext, rng: Rng): string[] {
  const ingredients = gatherHookIngredients(ctx, rng);
  return [
    pickFrom(POLITICAL_HOOK_VARIANTS, rng)(ingredients),
    pickFrom(ORDINARY_HOOK_VARIANTS, rng)(ingredients),
    pickFrom(EXPLORATION_HOOK_VARIANTS, rng)(ingredients),
  ];
}

/**
 * Scale-appropriate vocabulary for describing what a settlement is (#2536
 * refinement pass). `primaryFunction` is a conceptual role, not mandatory
 * prose: an "Academic city" resolved at hamlet scale should read as a
 * "scholarly community", not a city, or the settlement's own scale collapses
 * into contradiction the moment prose repeats the raw option string.
 *
 * Four phrases per trait, one per rung, smallest to largest. Traits not
 * covered here fall back to a genre-neutral scale-noun ladder, so nothing is
 * ever left without a phrase.
 */
const SCALE_PHRASE_BY_TRAIT: Partial<
  Record<SettlementTrait, readonly [string, string, string, string]>
> = {
  academic: [
    "scholarly community",
    "academic enclave",
    "college town",
    "university district",
  ],
  research: [
    "research camp",
    "research outpost",
    "research station",
    "research complex",
  ],
  religious: [
    "shrine settlement",
    "temple town",
    "pilgrimage town",
    "religious capital",
  ],
  trade: ["trading hamlet", "market town", "trade hub", "mercantile city"],
  military: [
    "garrison outpost",
    "garrison town",
    "fortress town",
    "military stronghold",
  ],
  mining: ["mining camp", "mining town", "mining settlement", "mining city"],
  industrial: [
    "workshop hamlet",
    "mill town",
    "industrial hub",
    "industrial city",
  ],
  administrative: [
    "outpost",
    "administrative town",
    "administrative seat",
    "administrative capital",
  ],
  criminal: [
    "hideout",
    "smugglers' town",
    "criminal enclave",
    "underworld hub",
  ],
  agrarian: [
    "farming hamlet",
    "farming village",
    "farming town",
    "agricultural hub",
  ],
  maritime: ["fishing hamlet", "fishing village", "harbour town", "port city"],
  entertainment: [
    "wayside stop",
    "entertainment town",
    "entertainment district",
    "entertainment capital",
  ],
  refuge: ["refuge camp", "refuge settlement", "refuge town", "refuge city"],
  transit: ["waystation", "crossroads town", "transit hub", "transit city"],
  medical: [
    "aid post",
    "clinic town",
    "medical waystation",
    "medical district",
  ],
};

const GENERIC_SCALE_NOUNS: readonly [string, string, string, string] = [
  "outpost",
  "settlement",
  "town",
  "city",
];

/**
 * A scale-honest noun phrase for what a settlement is, e.g. "academic
 * enclave" rather than "academic city" at hamlet scale. Traits are checked in
 * priority order; the first with a scale table wins.
 *
 * A custom function the user typed (or an unrecognised legacy value like the
 * deprecated `economy` option) carries no traits, so there is no honest basis
 * to scale-adjust it — the raw value is used verbatim instead, the same call
 * the rest of the framework already makes for a custom axis value.
 */
export function scaleFunctionPhrase(
  traits: readonly SettlementTrait[],
  rung: number,
  rawFunction?: string,
): string {
  const clamped = Math.min(Math.max(rung, 0), 3);
  for (const trait of traits) {
    const phrases = SCALE_PHRASE_BY_TRAIT[trait];
    if (phrases) return phrases[clamped];
  }
  return rawFunction?.trim()
    ? rawFunction.toLowerCase()
    : GENERIC_SCALE_NOUNS[clamped];
}

const VOWEL_SOUND = /^(a|e|i|o|u)/i;

/** "a" or "an", by the phrase's leading sound rather than strict spelling rules. */
export function withArticle(phrase: string): string {
  return `${VOWEL_SOUND.test(phrase) ? "an" : "a"} ${phrase}`;
}

/**
 * What modest infrastructure actually looks like at hamlet or village scale,
 * so a small settlement does not imply the institutional footprint of a city
 * built around the same function. Only meaningful at the bottom of the
 * ladder — a city-rung settlement earns whatever scale the reader assumes.
 */
const INSTITUTIONAL_NOTE_BY_TRAIT: TraitPhrases = {
  academic: [
    "one lecture hall, a few workshops, and a single hostel for visiting scholars",
  ],
  research: [
    "a single laboratory shed and a handful of instruments, nothing more",
  ],
  religious: ["one shrine hall and a caretaker's lodge, nothing grander"],
  trade: ["a single market square and a few storerooms"],
  military: ["a single watch post housing a few dozen"],
  mining: ["one shaft head and a modest smithy"],
  industrial: [
    "a single workshop doing the work a larger settlement would spread across several",
  ],
  administrative: ["one clerk's office handling everything official"],
  medical: ["a single healer's room, not a proper ward"],
};

export function institutionalNote(
  traits: readonly string[],
  rung: number,
): string | undefined {
  if (rung > 1) return undefined;
  return firstMatch(traits, INSTITUTIONAL_NOTE_BY_TRAIT);
}

/**
 * Current Tension names people rather than only institutions, and those
 * people are drawn from the already-built notable inhabitants rather than
 * invented fresh — the only way to guarantee a named actor in this paragraph
 * also appears in Notable Inhabitants is to build it from the same list.
 */
const TENSION_VARIANTS_WITH_TWO = [
  (t: string, a: NotableInhabitant, o: NotableInhabitant) =>
    `${t} is one important thing happening here, not the reason for everything about the place. ${a.name}, the ${a.role.toLowerCase()}, is at the center of the official response, while ${o.name} has a view on it that the official line does not share.`,
  (t: string, a: NotableInhabitant, o: NotableInhabitant) =>
    `${t} is the open concern of the moment. ${a.name} is trying to manage it quietly as ${a.role.toLowerCase()}; ${o.name} thinks quiet is exactly the wrong approach.`,
] as const;

const TENSION_VARIANTS_WITH_ONE = [
  (t: string, a: NotableInhabitant) =>
    `${t} is one important thing happening here, not the reason for everything about the place. ${a.name}, the ${a.role.toLowerCase()}, is at the center of the official response, for whatever that is worth.`,
  (t: string, a: NotableInhabitant) =>
    `${t} is the open concern of the moment, and ${a.name} carries more of the weight of it than the ${a.role.toLowerCase()} title alone would suggest.`,
] as const;

const TENSION_VARIANTS_WITH_NONE = [
  (t: string) =>
    `${t} is one important thing happening here, not the reason for everything about the place. The longer it goes unresolved, the worse the outcome for everyone — including the people in power.`,
] as const;

export function buildCurrentTensionParagraph(
  mainTension: string,
  inhabitants: readonly NotableInhabitant[],
  rng: Rng,
): string {
  const authority = inhabitants.find((i) => i.category === "authority");
  const other = inhabitants.find(
    (i) => i.category !== "authority" && i !== authority,
  );

  if (authority && other) {
    return pickFrom(TENSION_VARIANTS_WITH_TWO, rng)(
      mainTension,
      authority,
      other,
    );
  }
  if (authority) {
    return pickFrom(TENSION_VARIANTS_WITH_ONE, rng)(mainTension, authority);
  }
  return pickFrom(TENSION_VARIANTS_WITH_NONE, rng)(mainTension);
}
