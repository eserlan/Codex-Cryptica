export function validStages() {
  const foundation = {
    title: "The Quiet Bell",
    summary: "A keeper vanished before the winter bell.",
    centralQuestion: "Who changed the bell record?",
    openingHook: "The town asks the party to find its missing keeper.",
    perpetratorId: "person-1",
    truth: {
      perpetratorName: "Mara Quill",
      motive: "Hide a forged claim",
      means: "Changed the bell record",
      opportunity: "Held the archive key",
      constraints: "Could not leave the watch post",
      keyItem: "The bell record",
      keyItemLocation: "Archive",
      keyItemFate: "Burn it at the next full moon",
      recovery: "Search the archive vault or catch Mara carrying it",
      methodReason:
        "The archive is locked after hours, so a copied key was needed",
      disputedFact: "Whether the north pasture was common land",
      atStart: "The record is still in the archive vault",
      victimStatus:
        "The keeper is locked in the bell loft and can be freed with the spare key",
    },
    timeline: [
      "The record was copied",
      "The bell was rung",
      "The keeper disappeared",
    ],
    revelations: [
      ["record", "culprit"],
      ["bell", "motive"],
      ["key", "item"],
    ].map(([id, kind]) => ({ id, kind, fact: `${id} was altered` })),
  };
  const cast = {
    keyItemLocationId: "place-1",
    suspects: ["Mara Quill", "Oren Pike", "Sella Reed", "Tovin Elm"].map(
      (name, index) => ({
        id: `person-${index + 1}`,
        name,
        role: "clerk",
        publicFace: "A trusted local",
        startLocationId: `place-${(index % 3) + 1}`,
        motive: "Protect a secret",
        secret: "Knows a detail",
        alibi: "An account to test",
        knows: "One fact",
        believes: "A separate theory",
        approach: "Ask about the archive",
      }),
    ),
    locations: ["Archive", "Bell tower", "Ferry"].map((name, index) => ({
      id: `place-${index + 1}`,
      name,
      activity: "Public place",
      evidence: "Records can be checked",
    })),
  };
  const clues = {
    clues: Array.from({ length: 6 }, (_, index) => ({
      id: `clue-${index + 1}`,
      observation: `Trace ${index + 1}`,
      sourceId: `place-${index < 3 ? index + 1 : ((index - 2) % 3) + 1}`,
      supports: [["record", "bell", "key"][index % 3]],
      doesNotProve: "It does not identify the culprit",
      leadsTo: [`place-${((index + 1) % 3) + 1}`],
    })),
    independentPaths: ["record", "bell", "key"].flatMap(
      (revelationId, index) => [
        {
          revelationId,
          clueIds: [`clue-${index + 1}`],
          reasoning: "This clue directly establishes the conclusion.",
        },
        {
          revelationId,
          clueIds: [`clue-${index + 4}`],
          reasoning:
            "This independent clue directly establishes the conclusion.",
        },
      ],
    ),
  };
  const pressure = {
    escalation: "The watch will seal the archive at dawn.",
    objective: "Recover the bell record before the archive is sealed",
    approaches: [
      "Search the archive vault",
      "Confront Mara with the copied key",
      "Bargain with Oren for the log",
    ],
    pressureClock: [1, 2, 3].map((n) => ({
      trigger: `At step ${n}`,
      consequence: `A witness ${n} leaves`,
    })),
    npcResponses: [
      {
        personId: "person-2",
        trigger: "If asked about the key",
        response: "Oren shares the copied log",
      },
    ],
    outcomes: Object.fromEntries(
      ["correct", "partial", "mistaken", "failed", "unsolved"].map((key) => [
        key,
        {
          condition: `If ${key}`,
          consequence: `Then ${key}`,
          continuation:
            key === "unsolved" ? "A new record surfaces" : undefined,
        },
      ]),
    ),
  };
  return [foundation, cast, clues, pressure] as const;
}
