/**
 * Option-keyed detail for the offline tavern draft (#5240).
 *
 * The offline tavern used to print the same owner note, signature drink,
 * hook, patron notes and rumours on every run, whatever the form said. Each
 * detail here is keyed by the option that should drive it, with a fallback
 * that quotes a typed-in custom value, so every choice on the page reaches the
 * draft.
 */

import { pickRandomItems, type Rng } from "./random-utils";
import { withArticle } from "./public-settlement-community";

const OWNER_NOTE_BY_ATMOSPHERE: Record<string, string> = {
  "Rowdy and welcoming": "loud, generous and quick to break up a fight",
  "Tense and suspicious": "watchful, short with strangers and slow to pour",
  "Quiet and melancholic":
    "soft-spoken, still keeping a chair empty for someone who is not coming back",
  "Festive and chaotic": "always mid-song and always one server short",
  "Cold and professional": "polite, exact and impossible to read",
  "Warm but secretive": "kind to every guest and honest with none of them",
};

const SIGNATURE_BY_WEALTH: Record<string, string> = {
  "Destitute (dirt floors, watered-down drinks)":
    "Thin barley beer ladled from an open barrel, a copper a cup",
  "Poor (cheap but honest)":
    "Turnip stew and small beer at a price that has not changed in ten years",
  "Modest (reliable, no frills)":
    "A dark cellar ale the owner brews in small batches",
  "Comfortable (decent food and beds)":
    "Roast mutton with a pear cider strong enough to end the evening early",
  "Prosperous (good drink, private rooms)":
    "Spiced red wine warmed with honey and served in pewter",
  "Wealthy (exclusive clientele)":
    "Amber brandy poured by the thimble from a locked cabinet",
};

const ROOM_BY_WEALTH: Record<string, string> = {
  "Destitute (dirt floors, watered-down drinks)":
    "The floor is packed dirt, the drinks are watered and nobody complains aloud.",
  "Poor (cheap but honest)":
    "The benches are scarred and the food is plain, but the measures are fair.",
  "Modest (reliable, no frills)":
    "Nothing here is fancy, but the fire is lit and the beds are dry.",
  "Comfortable (decent food and beds)":
    "The kitchen is good, the rooms upstairs are clean and the place is rarely empty.",
  "Prosperous (good drink, private rooms)":
    "Private rooms upstairs can be hired by the hour, and the cellar is well stocked.",
  "Wealthy (exclusive clientele)":
    "A doorman decides who gets in, and the prices keep the rest away.",
};

const PATRON_NOTES_BY_CLIENTELE: Record<string, readonly [string, string]> = {
  "Adventurers and wanderers": [
    "A retired sellsword who sells maps of places they swear they have been",
    "A young wanderer paying for a room with old, foreign coin",
  ],
  "Merchants and traders": [
    "A wool trader who knows every price in town and every debt behind it",
    "A merchant's agent who buys rounds for anyone with news from the road",
  ],
  "Soldiers and mercenaries": [
    "A one-handed sergeant who keeps the peace when the owner cannot",
    "A mercenary captain hiring quietly for a job nobody will describe",
  ],
  "Pilgrims and clergy": [
    "A lay brother who has walked the pilgrim road twice and blesses the bread",
    "A pilgrim who arrived alone, though they booked a room for two",
  ],
  "Criminals and fence-seekers": [
    "A fence who does business at the corner table and never orders food",
    "A pickpocket who drinks here because the owner pays them to work elsewhere",
  ],
  "Mixed locals": [
    "The miller's widow, who hears everything said at the bar",
    "A carter who has started paying for drinks with suspiciously new coin",
  ],
};

interface TroubleDetail {
  hook: string;
  rumours: readonly string[];
  seed: string;
}

const TROUBLE_DETAILS: Record<string, TroubleDetail> = {
  "The owner owes a dangerous debt that is coming due": {
    hook: "A polite stranger leaves a sealed note for the owner and asks the party to make sure it is read tonight",
    rumours: [
      "The owner sold the good silver last month and told nobody why",
      "Two hard-faced visitors come every tenth day and never pay for their drinks",
      "The deed to the building is said to be held by someone in another town",
    ],
    seed: "**👤 The creditor**: Whoever holds the owner's debt, and what they will take instead of coin.",
  },
  "A recent violent incident was quietly buried, and the responsible party may still be inside":
    {
      hook: "The party finds a fresh bloodstain under a rug the staff insist has always been there",
      rumours: [
        "A guest left last week without paying and without their boots",
        "The night porter was paid a month's wages to forget something",
        "Someone scrubbed the stairs at dawn three days running",
      ],
      seed: "**👤 The one responsible**: Whoever did the violence, and who helped bury it.",
    },
  "A protected criminal is hiding among the staff": {
    hook: "A bounty notice by the door shows a face the party has just seen carrying plates",
    rumours: [
      "The new cook flinches every time the watch comes in",
      "One of the staff never sets foot outside after dark",
      "Someone in town pays the owner to keep a name off the wage book",
    ],
    seed: "**👤 The hidden fugitive**: The staff member in hiding, and who wants them found.",
  },
  "A back room connects to something the owner refuses to discuss": {
    hook: "A patron the party spoke to an hour ago went through the back door and has not come out",
    rumours: [
      "Cold air rises through the floorboards behind the bar, even in summer",
      "Deliveries go into the back room and nobody sees them come out",
      "The owner keeps the only key on a cord round their neck",
    ],
    seed: "**📍 Beyond the back room**: The place it connects to, and who else uses it.",
  },
  "A faction is using the venue as a dead-drop without the owner's knowledge": {
    hook: "A folded message drops out of a loaf of bread served to one of the party",
    rumours: [
      "The same corner table is booked under a different name every week",
      "Strangers leave coins under a loose board and never come back for them",
      "A watch captain has started drinking here and noting who sits where",
    ],
    seed: "**👥 The faction behind the dead-drop**: Who leaves the messages, and who collects them.",
  },
  "The place is being squeezed out by a rival backed by local power": {
    hook: "A town official arrives mid-evening to inspect the cellar, and the owner asks the party to stall them",
    rumours: [
      "A new house across the square serves free drink on market days",
      "The licence is up for review and the council has gone quiet",
      "Two regular suppliers stopped delivering on the same morning",
    ],
    seed: "**👥 The rival and their backer**: The competing house, and the local power behind it.",
  },
};

const RUMOUR_BY_SETTLEMENT: Record<string, string> = {
  "Capital city":
    "A palace clerk drinks here in plain clothes and listens more than they talk",
  "Market town":
    "A trader swears the market scales have been weighted since spring",
  "Frontier outpost":
    "The last patrol came back one rider short, and nobody will say where it happened",
  "Coastal port":
    "A ship in the harbour has not unloaded in a week, and its crew drink here every night",
  "Remote village":
    "The miller's family has not been seen at the well since the new moon",
  "Crossroads hamlet":
    "A coach that should have arrived two days ago never did",
};

export interface TavernDetailInput {
  atmosphere: string;
  wealthLevel: string;
  clientele: string;
  settlementType: string;
  trouble: string;
}

export interface TavernDetails {
  ownerNote: string;
  roomNote: string;
  signature: string;
  patronNotes: readonly [string, string];
  hook: string;
  rumours: string[];
  troubleSeed: string;
}

function lower(value: string): string {
  return value.trim().toLowerCase();
}

function troubleDetailFor(trouble: string): TroubleDetail {
  return (
    TROUBLE_DETAILS[trouble] ?? {
      hook: "A regular patron has not shown up for three days, and their usual table is still reserved",
      rumours: [
        `Some of the regulars say the trouble started earlier than the owner admits: ${lower(trouble)}`,
        "Someone was seen leaving through the back door well after midnight",
      ],
      seed: "**👥 Whoever is behind the trouble**: The people who gain if it keeps growing.",
    }
  );
}

/** Builds the option-driven lines of an offline tavern draft. */
export function buildTavernDetails(
  input: TavernDetailInput,
  rng: Rng,
): TavernDetails {
  const trouble = troubleDetailFor(input.trouble);
  const settlementRumour =
    RUMOUR_BY_SETTLEMENT[input.settlementType] ??
    `Travellers say this ${lower(input.settlementType)} is less quiet than it looks`;
  return {
    ownerNote:
      OWNER_NOTE_BY_ATMOSPHERE[input.atmosphere] ??
      `guarded, practical and in tune with the ${lower(input.atmosphere)} mood of the room`,
    roomNote:
      ROOM_BY_WEALTH[input.wealthLevel] ??
      `The wealth level is ${lower(input.wealthLevel)}, and the room shows it.`,
    signature:
      SIGNATURE_BY_WEALTH[input.wealthLevel] ??
      `The house speciality, priced for ${withArticle(lower(input.wealthLevel))} house`,
    patronNotes: PATRON_NOTES_BY_CLIENTELE[input.clientele] ?? [
      `A regular from the ${lower(input.clientele)} crowd who knows more than they let on`,
      `A newcomer among the ${lower(input.clientele)} whose story does not add up`,
    ],
    hook: trouble.hook,
    rumours: [...pickRandomItems(trouble.rumours, 2, rng), settlementRumour],
    troubleSeed: trouble.seed,
  };
}
