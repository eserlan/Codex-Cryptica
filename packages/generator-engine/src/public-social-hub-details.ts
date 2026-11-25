/**
 * Option-keyed detail for the offline social-hub draft (#5241).
 *
 * The offline social hub used to print the same owner note, signature
 * service, hook, regulars and rumours on every run, whatever the form said,
 * and gave a cyberpunk noodle bar fantasy names. Each detail here is keyed by
 * the option that should drive it (genre, atmosphere, wealth level, primary
 * clientele or the hidden trouble), with a fallback that quotes a typed-in
 * custom value, so every choice on the page reaches the draft.
 */

import {
  generatePlaceholderName,
  pickFrom,
  pickRandomItems,
  type Rng,
} from "./random-utils";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";

const OWNER_NOTE_BY_ATMOSPHERE: Record<string, string> = {
  "Rowdy and welcoming":
    "loud, quick to laugh and quicker to step between two people squaring up",
  "Tense and suspicious":
    "careful with every word and slow to serve a face they do not know",
  "Quiet and melancholic":
    "gentle and tired, and still waiting on news of someone who left",
  "Festive and chaotic":
    "running three conversations at once and losing track of the takings",
  "Cold and professional":
    "courteous, precise and unwilling to discuss anything but business",
  "Warm but secretive": "friendly to everyone and candid with no one",
};

const ROOM_BY_WEALTH: Record<string, string> = {
  "Destitute (dirt floors, watered-down drinks)":
    "Seating is whatever is to hand, the drinks are watered and nobody expects better.",
  "Poor (cheap but honest)":
    "The fittings are worn and the menu is short, but nobody gets cheated.",
  "Modest (reliable, no frills)":
    "Nothing here is fancy, but it is clean, dependable and open late.",
  "Comfortable (decent food and beds)":
    "The food is good, there are beds or bunks to rent, and the place is rarely empty.",
  "Prosperous (good drink, private rooms)":
    "Private booths can be hired by the hour, and the stock is better than it needs to be.",
  "Wealthy (exclusive clientele)":
    "Someone at the door decides who gets in, and the prices keep the rest away.",
};

const SIGNATURE_BY_GENRE: Record<string, string> = {
  Fantasy: "Spiced mead in horn cups, with bread baked that morning",
  "Dark Fantasy":
    "Black wine cut with something bitter that the staff swear keeps the sickness away",
  Pirate: "Dark rum aged in a barrel salvaged from a wreck",
  Cyberpunk:
    "Synth-noodles in chilli broth, and a back booth with a clean data jack",
  "Sci-Fi":
    "Station-distilled spirits flavoured to taste like a planet nobody here has visited",
  Modern: "Bottomless filter coffee and a back room with no cameras",
  Horror: "A house red so dark it stains the glass",
  "Cosmic Horror":
    "Strong black tea and a logbook where guests are asked to record their dreams",
  "Post-Apocalyptic":
    "Clean water sold by the measure, and still-brewed spirit for those who can pay",
  Western: "Rotgut whiskey and a card table that never closes",
  Steampunk:
    "Smoked porter drawn through brass taps, with a pressure gauge on every barrel",
  Lancer: "Printed protein stew and a quiet bay for running mech diagnostics",
  "Space Opera Resistance":
    "Blue fizz cocktails, and a booth with a signal jammer under the table",
  "Optimistic Exploration Sci-Fi":
    "A rotating menu of dishes from every species aboard",
  "Space Western": "Hydroponic moonshine poured from an old fuel can",
  "Superhero / Comic Book":
    "Free coffee for anyone in a mask, and no questions about the bruises",
};

/** Genres without their own name pool borrow the closest one. */
const NAME_POOL_ALIASES: Record<string, string> = { Lancer: "Sci-Fi" };

const REGULAR_NOTES: readonly ((clientele: string) => string)[] = [
  (c) =>
    `A long-standing regular from the ${c} who knows every face and most of the secrets`,
  (c) =>
    `One of the ${c}, who keeps a usual seat and notices when anyone takes it`,
  (c) => `A fixture among the ${c}, owed small favours by half the room`,
];

const NEWCOMER_NOTES: readonly ((clientele: string) => string)[] = [
  (c) =>
    `A newcomer who claims to be one of the ${c}, though their story keeps changing`,
  (c) => `A stranger to the ${c} who pays well and asks careful questions`,
  (c) => `A recent arrival the ${c} have not yet decided whether to trust`,
];

interface TroubleDetail {
  hook: string;
  rumours: readonly string[];
  seed: string;
}

const TROUBLE_DETAILS: Record<string, TroubleDetail> = {
  "The owner owes a dangerous debt that is coming due": {
    hook: "A polite stranger asks the party to pass a sealed message to the owner before closing",
    rumours: [
      "The owner has been selling off fittings and stock one piece at a time",
      "Two visitors come by on the same day each week and never pay",
      "Someone else is said to hold the lease on the building now",
    ],
    seed: "**👤 The creditor**: Who holds the owner's debt, and what they will accept instead of payment.",
  },
  "A recent violent incident was quietly buried, and the responsible party may still be inside":
    {
      hook: "The party notices a fresh stain that the staff insist has always been there",
      rumours: [
        "A guest left in a hurry last week and has not been seen since",
        "One of the staff was paid well to forget a particular night",
        "The floor by the back exit was scrubbed three mornings running",
      ],
      seed: "**👤 The one responsible**: Who did the violence, and who helped hide it.",
    },
  "A protected criminal is hiding among the staff": {
    hook: "A wanted notice near the entrance shows a face the party has just seen working behind the counter",
    rumours: [
      "One of the staff goes quiet whenever the law walks in",
      "A worker here never leaves the building after dark",
      "Someone powerful pays the owner to keep a name off the books",
    ],
    seed: "**👤 The hidden fugitive**: The staff member in hiding, and who wants them found.",
  },
  "A back room connects to something the owner refuses to discuss": {
    hook: "Someone the party spoke to an hour ago went through the back door and has not come out",
    rumours: [
      "Cold air comes up through the floor behind the counter",
      "Deliveries go into the back room and nobody sees them come out",
      "The owner keeps the only key on their person at all times",
    ],
    seed: "**📍 Beyond the back room**: Where it leads, and who else uses it.",
  },
  "A faction is using the venue as a dead-drop without the owner's knowledge": {
    hook: "A folded message falls out of something served to one of the party",
    rumours: [
      "The same table is booked under a different name every week",
      "Strangers leave small packages behind and never return for them",
      "Someone has started sitting by the window and noting who meets whom",
    ],
    seed: "**👥 The faction behind the dead-drop**: Who leaves the messages, and who collects them.",
  },
  "The place is being squeezed out by a rival backed by local power": {
    hook: "An official arrives mid-evening to inspect the premises, and the owner asks the party to stall them",
    rumours: [
      "A new place nearby is giving drinks away to lure the regulars",
      "The owner's permit is under review and nobody will say why",
      "Two regular suppliers stopped delivering on the same day",
    ],
    seed: "**👥 The rival and their backer**: The competing venue, and the local power behind it.",
  },
};

export interface SocialHubDetailInput {
  genre: string;
  venueType: string;
  atmosphere: string;
  wealthLevel: string;
  clientele: string;
  trouble: string;
}

export interface SocialHubDetails {
  ownerNote: string;
  roomNote: string;
  signature: string;
  patronNotes: readonly [string, string];
  hook: string;
  rumours: string[];
  troubleSeed: string;
}

/**
 * Lower-cases an option for use mid-sentence, keeping acronyms such as
 * "HQ" or "NHP", and reads "Tavern / Inn" as "tavern and inn".
 */
export function toProse(value: string): string {
  return value
    .trim()
    .replace(/\s+\/\s+/g, " and ")
    .split(" ")
    .map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}

function troubleDetailFor(trouble: string): TroubleDetail {
  return (
    TROUBLE_DETAILS[trouble] ?? {
      hook: "A regular has not shown up for three days, and their usual spot is still being held",
      rumours: [
        `Some regulars say the trouble started earlier than the owner admits: ${toProse(trouble)}`,
        "Someone was seen leaving through the back way well after hours",
      ],
      seed: "**👥 Whoever is behind the trouble**: The people who gain if it keeps growing.",
    }
  );
}

/**
 * Three different names for the operator and two regulars, from the genre's
 * own pool. A custom genre with no pool falls back to placeholder names.
 */
export function pickSocialHubNames(
  genre: string,
  rng: Rng,
): [string, string, string] {
  const pool = INHABITANT_NAMES_BY_GENRE[NAME_POOL_ALIASES[genre] ?? genre];
  const names = pool ? pickRandomItems(pool, 3, rng) : [];
  for (let tries = 0; names.length < 3 && tries < 50; tries++) {
    const name = generatePlaceholderName(rng);
    if (!names.includes(name)) names.push(name);
  }
  while (names.length < 3) names.push(`${names[0]} the Younger`);
  return [names[0], names[1], names[2]];
}

/** Builds the option-driven lines of an offline social-hub draft. */
export function buildSocialHubDetails(
  input: SocialHubDetailInput,
  rng: Rng,
): SocialHubDetails {
  const trouble = troubleDetailFor(input.trouble);
  const clientele = toProse(input.clientele);
  return {
    ownerNote:
      OWNER_NOTE_BY_ATMOSPHERE[input.atmosphere] ??
      `steady, guarded and well suited to the ${toProse(input.atmosphere)} mood of the place`,
    roomNote:
      ROOM_BY_WEALTH[input.wealthLevel] ??
      `The wealth level is ${toProse(input.wealthLevel)}, and it shows in the fittings.`,
    signature:
      SIGNATURE_BY_GENRE[input.genre] ??
      `A house speciality that only this ${toProse(input.venueType)} serves`,
    patronNotes: [
      pickFrom(REGULAR_NOTES, rng)(clientele),
      pickFrom(NEWCOMER_NOTES, rng)(clientele),
    ],
    hook: trouble.hook,
    rumours: [
      ...pickRandomItems(trouble.rumours, 2, rng),
      `Some of the ${clientele} have stopped coming on certain nights, and none of them will say why`,
    ],
    troubleSeed: trouble.seed,
  };
}
