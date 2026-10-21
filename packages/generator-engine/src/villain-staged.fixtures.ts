import type { JsonObject } from "./staged-runtime";

/** Stage replies that pass every check and agree with each other. */
export const VALID_CONCEPT: JsonObject = {
  title: "Ottoline Brack, the Quiet Toll",
  conflictDomain: "Harbour Politics",
  publicFace: "A harbour reeve who keeps the tide tables honest.",
  signature: "Every ship she touches leaves port with one extra seal.",
  firstSigns: [
    "Harbour tolls rose twice in a month without a notice.",
    "Three warehouse licences were quietly withdrawn.",
  ],
  coreConcept: "A reeve who is turning the harbour tolls into a private tax.",
  trueNature: "She answers to a creditor who bought the harbour debt.",
  ultimateGoal:
    "Every harbour toll and warehouse licence in the city pays into her creditor's strongroom.",
  whyNow:
    "The harbour charter expires at midsummer, and whoever holds the licences then keeps them for a generation.",
  motivation: "She believes only a single owner can keep the harbour solvent.",
  fatalFlaw:
    "She cannot let a debt stay unpaid, even when forgiving it would save the plan.",
  methods: "Licences, tolls and quiet foreclosures.",
  resources: "The harbour office, its clerks and a creditor's gold.",
};

export const VALID_ORGANISATION: JsonObject = {
  organisation:
    "Orders flow through the harbour office, where every licence clerk answers to a deputy reeve.",
  territory: "The harbour office and the customs warehouse beside it.",
  lieutenants: [
    {
      name: "Tobias Arlen",
      role: "Spokesman who reads the tolls aloud",
      relationship: "A rival who wants the reeve's chair",
      motivation: "Wants the harbour chair for himself.",
      loyalty: "Conditional on being named her successor.",
      secret: "Is courting the guild masters.",
    },
    {
      name: "Sister Odell Marsh",
      role: "Keeper of the harbour oaths",
      relationship: "A true believer in the reeve's cause",
      motivation: "Thinks solvency is a sacred duty.",
      loyalty: "Absolute, until the oaths are broken.",
      secret: "Has kept a second copy of every oath.",
    },
    {
      name: "Wick Dunmore",
      role: "Quartermaster of the bonded warehouses",
      relationship: "An apprentice who has outgrown the teacher",
      motivation: "Wants out from under the reeve.",
      loyalty: "Grudging.",
      secret: "Sells manifests to a smuggler.",
    },
  ],
};

const STAGES: ReadonlyArray<{
  name: string;
  kind: "required" | "conditional";
  timing: string;
  trigger?: string;
}> = [
  { name: "Raise the tolls", kind: "required", timing: "Days 1-5" },
  { name: "Withdraw the licences", kind: "required", timing: "Days 4-9" },
  {
    name: "Foreclose on the warehouses",
    kind: "required",
    timing: "Days 8-14",
  },
  { name: "Silence the guild masters", kind: "required", timing: "Days 13-20" },
  {
    name: "Chase the fled clerk",
    kind: "conditional",
    timing: "Any time after Day 9",
    trigger: "the clerk who forged the notices is found",
  },
  { name: "Renew the harbour charter", kind: "required", timing: "Day 21" },
];

export const VALID_PLAN: JsonObject = {
  timeline:
    "Twenty-one days to the midsummer charter, then nine days to bring the outlying landings in.",
  stages: STAGES.map((stage, i) => ({
    name: stage.name,
    kind: stage.kind,
    timing: stage.timing,
    ...(stage.trigger ? { trigger: stage.trigger } : {}),
    objective: `${stage.name} so that the harbour tolls and warehouse licences move closer to the creditor.`,
    actions: "The clerks act on forged notices.",
    clues: "Notices that differ from the posted copies.",
    consequences: "The harbour pays more and the creditor holds more.",
    interference: "Compare the notices with the posted copies.",
    disruption: `The reeve's hold on the harbour loosens (stage ${i + 1} disrupted).`,
    ...(stage.kind === "required" && i < STAGES.length - 1
      ? {
          disruptionEffect: {
            stage: STAGES.length,
            change:
              "The charter hearing opens with the notices already in doubt, so the reeve must win it in open court.",
          },
        }
      : {}),
  })),
  dependencyChain: [
    "raise tolls",
    "withdraw licences",
    "foreclose warehouses",
    "silence guilds",
    "renew charter",
  ],
  escalation:
    "By midsummer every harbour toll and licence belongs to the creditor.",
  discovery: {
    world: "The tolls rose.",
    servants: "The licences were withdrawn on purpose.",
    gmOnly: "A creditor owns the harbour debt.",
  },
  personalConnections: [
    "A character's family lost a warehouse licence.",
    "A character once vouched for the reeve.",
  ],
};

export const VALID_ENDING: JsonObject = {
  atAGlance: [
    "Wants every harbour toll and licence to pay into her creditor.",
    "Deadline: the midsummer charter, twenty-one days away.",
    "Method: forged notices, withdrawn licences and foreclosures.",
    "Backed by a rival spokesman, a believer and a restless apprentice.",
    "Stopped by turning the guild masters, whose pensions she must keep paying.",
    "Beating her leaves the dredging crews unpaid.",
  ],
  weakness:
    "The guild masters only follow the reeve while she keeps paying their pensions, and the creditor has not agreed to that cost.",
  moralComplication:
    "The harbour really is insolvent, and the reeve's tolls are what keeps the dredging crews paid.",
  finalConfrontation:
    "At the harbour office on charter night, with the licences laid out on the counter.",
  ifDefeated:
    "The creditor sends a successor, and the dredging crews go unpaid until the harbour finds new money.",
};
