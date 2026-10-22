/** Fixed-truth mystery stages. Each accepted JSON artifact is locked for later stages. */
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import {
  stripMysteryMarkdownImages,
  type ResolvedMysteryOptions,
} from "./public-mystery";
import {
  addBannedNameFindings,
  readJsonObject,
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import { buildMysteryGraph } from "./mystery-graph";
import { list, record, text } from "./mystery-obj";
import { normalizeMysteryStage } from "./mystery-staged-normalize";
import { BANNED_NAMES } from "./naming-policy";
import { StagedProgress, type StagedProgressStep } from "./staged-progress";

export interface MysteryStagedStats {
  outcome: "staged" | "fallback";
  stoppedAt?: string;
  aiCalls: number;
  repairedStages: string[];
}

export interface MysteryStagedDependencies {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  onProgress?: (steps: StagedProgressStep[]) => void;
  onStats?: (stats: MysteryStagedStats) => void;
  contextPrefix?: string;
}

type Obj = JsonObject;
const hasText = (value: unknown): boolean => text(value).length > 0;
const missing = (value: Obj, keys: readonly string[]): string[] =>
  keys
    .filter((key) => !hasText(value[key]))
    .map((key) => `"${key}" is missing`);
const uniqueIds = (items: unknown[]): string[] =>
  items.map((item) => text(record(item).id));
const hasCrossGroupIdCollision = (...groups: string[][]): boolean => {
  const seen = new Set<string>();
  for (const id of groups.flat()) {
    if (!id) continue;
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
};

/** What the GM needs to know about the case's central object, beyond who took it. */
const KEY_ITEM_FIELDS = [
  "keyItem",
  "keyItemLocation",
  "keyItemFate",
  "recovery",
  "methodReason",
  "disputedFact",
] as const;

/** The conclusions players must be able to reach, so each can be tied to evidence. */
const REVELATION_KINDS = ["culprit", "motive", "item"] as const;

function missingRevelationKinds(revelations: Obj[]): string[] {
  const kinds = new Set(revelations.map((item) => text(item.kind)));
  return REVELATION_KINDS.filter((kind) => !kinds.has(kind)).map(
    (kind) => `a revelation with kind "${kind}" is required`,
  );
}

function checkFoundation(
  data: Obj,
  resolved: ResolvedMysteryOptions,
): DraftCheck {
  const hard = missing(data, [
    "title",
    "summary",
    "centralQuestion",
    "openingHook",
    "perpetratorId",
  ]);
  const truth = record(data.truth);
  hard.push(
    ...missing(truth, [
      "perpetratorName",
      "motive",
      "means",
      "opportunity",
      "constraints",
      ...KEY_ITEM_FIELDS,
    ]),
  );
  if (text(data.perpetratorId) !== "person-1")
    hard.push('"perpetratorId" must be the locked id "person-1"');
  const timeline = list(data.timeline);
  if (timeline.length < 3 || timeline.some((event) => !hasText(event)))
    hard.push('"timeline" needs at least three ordered events');
  const revelations = list(data.revelations).map(record);
  if (revelations.length < 3)
    hard.push('"revelations" needs at least three facts');
  const revelationIds = uniqueIds(revelations);
  if (
    new Set(revelationIds).size !== revelationIds.length ||
    revelationIds.some((id) => !id)
  )
    hard.push("revelation ids must be present and unique");
  revelations.forEach((item, index) => {
    if (!hasText(item.fact)) hard.push(`revelation ${index + 1} needs a fact`);
  });
  hard.push(...missingRevelationKinds(revelations));
  addBannedNameFindings(
    [text(truth.perpetratorName), text(data.title)],
    resolved.avoidNames,
    hard,
  );
  return { hard, soft: [] };
}

function checkLocations(data: Obj): string[] {
  const hard: string[] = [];
  const locations = list(data.locations).map(record);
  if (locations.length < 3) hard.push("at least three locations are required");
  const locationIds = uniqueIds(locations);
  if (
    new Set(locationIds).size !== locationIds.length ||
    locationIds.some((id) => !id)
  )
    hard.push("location ids must be present and unique");
  locations.forEach((place, index) =>
    ["name", "activity", "evidence"].forEach((field) => {
      if (!hasText(place[field]))
        hard.push(`location ${index + 1} has no ${field}`);
    }),
  );
  if (!locationIds.includes(text(data.keyItemLocationId)))
    hard.push(
      '"keyItemLocationId" must be the id of the location where the key item is now',
    );
  return hard;
}

function checkCast(
  data: Obj,
  foundation: Obj,
  resolved: ResolvedMysteryOptions,
): DraftCheck {
  const hard: string[] = [];
  const suspects = list(data.suspects).map(record);
  if (suspects.length !== resolved.suspectCount)
    hard.push(
      `expected exactly ${resolved.suspectCount} suspects; received ${suspects.length}`,
    );
  const expectedIds = Array.from(
    { length: resolved.suspectCount },
    (_, i) => `person-${i + 1}`,
  );
  if (
    expectedIds.some(
      (id) => !suspects.some((suspect) => text(suspect.id) === id),
    )
  )
    hard.push("suspect ids must follow the locked person-1...person-N plan");
  const culprit = suspects.find((suspect) => text(suspect.id) === "person-1");
  if (
    !culprit ||
    text(culprit.name) !== text(record(foundation.truth).perpetratorName)
  )
    hard.push(
      "person-1 must match the perpetrator name locked in the foundation",
    );
  const fields = [
    "name",
    "role",
    "motive",
    "secret",
    "alibi",
    "knows",
    "believes",
    "approach",
  ] as const;
  suspects.forEach((suspect, index) =>
    fields.forEach((field) => {
      if (!hasText(suspect[field]))
        hard.push(`suspect ${index + 1} has no ${field}`);
    }),
  );
  hard.push(...checkLocations(data));
  if (
    hasCrossGroupIdCollision(
      uniqueIds(list(foundation.revelations)),
      uniqueIds(suspects),
      uniqueIds(list(data.locations)),
    )
  )
    hard.push("person, place and revelation ids must be unique across groups");
  const names = suspects.map((suspect) => text(suspect.name));
  if (
    new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length
  )
    hard.push("suspects need distinct names");
  addBannedNameFindings(names, resolved.avoidNames, hard);
  return { hard, soft: [] };
}

/** Whether two routes can be followed without sharing a clue or a starting source. */
function independentPair(routes: { clues: string[]; source: string }[]) {
  return routes.some((a, i) =>
    routes
      .slice(i + 1)
      .some(
        (b) =>
          a.source !== b.source && !a.clues.some((id) => b.clues.includes(id)),
      ),
  );
}

function checkClues(data: Obj, foundation: Obj, cast: Obj): DraftCheck {
  const hard: string[] = [];
  const clues = list(data.clues).map(record);
  if (clues.length < 6)
    hard.push(`at least six clues are required; received ${clues.length}`);
  const clueIds = uniqueIds(clues);
  if (clueIds.some((id) => !id) || new Set(clueIds).size !== clueIds.length)
    hard.push("clue ids must be present and unique");
  if (
    hasCrossGroupIdCollision(
      uniqueIds(list(foundation.revelations)),
      uniqueIds(list(cast.suspects)),
      uniqueIds(list(cast.locations)),
      clueIds,
    )
  )
    hard.push(
      "person, place, clue and revelation ids must be unique across groups",
    );
  const allowedSources = new Set([
    ...uniqueIds(list(cast.suspects)),
    ...uniqueIds(list(cast.locations)),
  ]);
  const revelationIds = new Set(uniqueIds(list(foundation.revelations)));
  clues.forEach((clue, index) => {
    if (!hasText(clue.observation) || !hasText(clue.doesNotProve))
      hard.push(
        `clue ${index + 1} must state an observation and what it does not prove`,
      );
    if (!allowedSources.has(text(clue.sourceId)))
      hard.push(`clue ${index + 1} has an unknown sourceId`);
    const supports = list(clue.supports).map(text);
    if (!supports.length || supports.some((id) => !revelationIds.has(id)))
      hard.push(`clue ${index + 1} must support a known revelation`);
    if (
      !list(clue.leadsTo).length ||
      list(clue.leadsTo).some(
        (id) =>
          (!allowedSources.has(text(id)) && !clueIds.includes(text(id))) ||
          text(id) === text(clue.id),
      )
    )
      hard.push(
        `clue ${index + 1} must point to a different, known person, place or clue`,
      );
  });
  const paths = list(data.independentPaths).map(record);
  for (const revelationId of revelationIds) {
    const matching = paths.filter(
      (path) => text(path.revelationId) === revelationId,
    );
    const routes = matching
      .map((path) => {
        const pathClues = list(path.clueIds).map(text);
        const pathItems = pathClues.map((id) =>
          record(clues.find((clue) => text(clue.id) === id)),
        );
        if (
          !pathClues.length ||
          new Set(pathClues).size !== pathClues.length ||
          !pathClues.every((id) => clueIds.includes(id)) ||
          !pathItems.some((clue) =>
            list(clue.supports).map(text).includes(revelationId),
          ) ||
          pathItems.some(
            (clue, index) =>
              index < pathItems.length - 1 &&
              !list(clue.leadsTo)
                .map(text)
                .includes(pathClues[index + 1]),
          )
        ) {
          return null;
        }
        return { clues: pathClues, source: text(pathItems[0].sourceId) };
      })
      .filter((route) => route !== null);
    if (!independentPair(routes))
      hard.push(
        `${revelationId} needs two independent evidence paths from distinct sources that share no clue`,
      );
  }
  const itemPlace = text(cast.keyItemLocationId);
  if (
    itemPlace &&
    !clues.some((clue) => list(clue.leadsTo).map(text).includes(itemPlace))
  )
    hard.push(
      `at least one clue must lead to the key item's location (${itemPlace}) so the party can recover it`,
    );
  return { hard, soft: [] };
}

/** The goal is fixed; how the party reaches it is open. */
function missingSolutionSpace(data: Obj): string[] {
  const hard = missing(data, ["objective"]);
  if (list(data.approaches).filter(hasText).length < 3)
    hard.push(
      '"approaches" needs at least three different ways the party could reach the objective',
    );
  return hard;
}

function checkPressure(data: Obj, cast: Obj): DraftCheck {
  const hard = missing(data, ["escalation"]);
  const clock = list(data.pressureClock).map(record);
  if (clock.length < 3) hard.push("pressureClock needs at least three steps");
  clock.forEach((step, index) =>
    ["trigger", "consequence"].forEach((field) => {
      if (!hasText(step[field]))
        hard.push(`pressure step ${index + 1} has no ${field}`);
    }),
  );
  const personIds = new Set(uniqueIds(list(cast.suspects)));
  const responses = list(data.npcResponses).map(record);
  if (!responses.length)
    hard.push(
      "npcResponses must describe how named people react to party actions",
    );
  responses.forEach((response, index) => {
    if (!personIds.has(text(response.personId)))
      hard.push(`NPC response ${index + 1} references an unknown personId`);
    if (!hasText(response.trigger) || !hasText(response.response))
      hard.push(`NPC response ${index + 1} needs a trigger and response`);
  });
  const outcomes = record(data.outcomes);
  for (const key of ["correct", "partial", "mistaken", "failed", "unsolved"]) {
    const outcome = record(outcomes[key]);
    if (!hasText(outcome.condition) || !hasText(outcome.consequence))
      hard.push(`outcome ${key} needs a condition and consequence`);
  }
  if (!hasText(record(outcomes.unsolved).continuation))
    hard.push("unsolved outcome needs a continuation hook");
  hard.push(...missingSolutionSpace(data));
  return { hard, soft: [] };
}

function checkAudit(data: Obj): DraftCheck {
  const issues = list(data.issues).filter(hasText);
  const hard = missing(data, ["status"]);
  if (
    text(data.status) !== "consistent" &&
    text(data.status) !== "needs-repair"
  )
    hard.push('audit status must be "consistent" or "needs-repair"');
  if (text(data.status) === "consistent" && issues.length)
    hard.push("a consistent audit must have no issues");
  if (text(data.status) === "needs-repair" && !issues.length)
    hard.push("a needs-repair audit must list specific issues");
  return { hard, soft: [] };
}

/**
 * The final pass only reports. Every structural check has already passed by
 * here, so remaining wording-level doubts must not discard a playable case.
 */
const checkFinalAudit = checkAudit;

/** Tidy model prose: stray double stops, ".," runs and a leading "If " we add ourselves. */
function tidy(value: string): string {
  return value
    .replace(/\.,/g, ",")
    .replace(/(^|[^.])\.{2}(?!\.)/g, "$1.")
    .replace(/[ \t]{2,}/g, " ");
}
const trimStop = (value: unknown): string =>
  text(value).replace(/[.;,\s]+$/, "");
const LOWER_AFTER_IF =
  /^(The|A|An|They|He|She|It|Anyone|Someone|Investigators|Players|Party|Any)\b/;
/** The clause without our own "If"/"then", with a common opening word lowercased. */
const afterIf = (value: unknown): string =>
  trimStop(value)
    .replace(/^if\s+/i, "")
    .replace(LOWER_AFTER_IF, (word) => word.toLowerCase());
const sentence = (value: unknown): string => {
  const body = trimStop(value);
  return body ? `${body[0].toUpperCase()}${body.slice(1)}.` : "";
};

function section(title: string, content: string): string {
  return `## ${title}\n${content}`;
}
function items(
  values: unknown[],
  render: (item: Obj, index: number) => string,
): string {
  return values.map((value, index) => render(record(value), index)).join("\n");
}

function assembleOutput(
  foundation: Obj,
  cast: Obj,
  clues: Obj,
  pressure: Obj,
): PublicGeneratorOutput {
  const truth = record(foundation.truth);
  const people = list(cast.suspects).map(record);
  const places = list(cast.locations).map(record);
  const placeNames = new Map(
    places.map((place) => [text(place.id), text(place.name)]),
  );
  const personNames = new Map(
    people.map((person) => [text(person.id), text(person.name)]),
  );
  const sourceName = (id: unknown) =>
    placeNames.get(text(id)) ?? personNames.get(text(id)) ?? text(id);
  // Players never see clue ids: a lead that points at another clue says "Lead N".
  const clueLabels = new Map(
    list(clues.clues).map((clue, index) => [
      text(record(clue).id),
      `Lead ${index + 1}`,
    ]),
  );
  const followUp = (id: unknown) => clueLabels.get(text(id)) ?? sourceName(id);
  const revelationLabels = new Map(
    list(foundation.revelations).map((item, index) => {
      const rev = record(item);
      const kind = text(rev.kind);
      return [
        text(rev.id),
        kind
          ? `${kind[0].toUpperCase()}${kind.slice(1)}`
          : `Conclusion ${index + 1}`,
      ];
    }),
  );
  const label = (id: unknown) => revelationLabels.get(text(id)) ?? followUp(id);
  // Internal ids never reach the reader, even inside model-written prose.
  const withoutIds = (value: string) =>
    value.replace(/\b(?:person|place|clue|rev)-\d+\b/g, (id) => label(id));
  const playerContent = [
    section("Opening Hook", text(foundation.openingHook)),
    section("Central Question", text(foundation.centralQuestion)),
    section(
      "People to Question",
      items(
        people,
        (person) =>
          `- **${text(person.name)} — ${text(person.role)}:** ${text(person.publicFace) || "Their account can be checked against the evidence."}`,
      ),
    ),
    section(
      "Locations",
      items(
        places,
        (place) => `- **${text(place.name)}:** ${text(place.activity)}`,
      ),
    ),
    section(
      "Evidence and Leads",
      items(
        list(clues.clues),
        (clue, index) =>
          `- **Lead ${index + 1} (${sourceName(clue.sourceId)}):** ${text(clue.observation)} Follow up: ${list(clue.leadsTo).map(followUp).join(", ")}.`,
      ),
    ),
    section("Pressure", text(pressure.escalation)),
  ].join("\n\n");
  const fixedTruth = [
    section(
      "Fixed Truth — GM Only",
      `**Responsible party:** ${text(truth.perpetratorName)}.\n\n**Motive:** ${text(truth.motive)}\n\n**Means:** ${text(truth.means)}\n\n**Opportunity:** ${text(truth.opportunity)}\n\n**Why this method:** ${text(truth.methodReason)}\n\n**Constraints:** ${text(truth.constraints)}${text(truth.atStart) ? `\n\n**When play starts:** ${text(truth.atStart)}` : ""}\n\n**At stake:** ${text(truth.disputedFact)}\n\n**Key item:** ${trimStop(truth.keyItem)}. Now at ${placeNames.get(text(cast.keyItemLocationId)) ?? text(truth.keyItemLocation)}. Intended fate: ${text(truth.keyItemFate)}${text(truth.victimStatus) ? `\n\n**Captive or victim:** ${text(truth.victimStatus)}` : ""}\n\n**Recovery and proof:** ${text(truth.recovery)}`,
    ),
  ].join("\n\n");
  // The case file reads top to bottom in the main column; only the fixed
  // facts sit in the side panel. Headings in `MYSTERY_GM_HEADINGS` are cut
  // from the player handout.
  const gmContent = [
    section(
      "Actual Timeline",
      list(foundation.timeline)
        .map((event, index) => `${index + 1}. ${text(event)}`)
        .join("\n"),
    ),
    section(
      "Suspect Knowledge and Alibis",
      items(
        people,
        (person) =>
          `- **${text(person.name)}:** Motive: ${text(person.motive)} Secret: ${text(person.secret)} Alibi: ${text(person.alibi)} Knows: ${text(person.knows)} Believes: ${text(person.believes)} Approach: ${text(person.approach)}`,
      ),
    ),
    section(
      "Revelations",
      items(
        list(foundation.revelations),
        (rev) => `- **${label(rev.id)}:** ${text(rev.fact)}`,
      ),
    ),
    section(
      "Clue Index",
      items(
        list(clues.clues),
        (clue) =>
          `- **${label(clue.id)} — ${sourceName(clue.sourceId)}:** Supports ${list(clue.supports).map(label).join(", ")}. Does not prove: ${text(clue.doesNotProve)}. Leads to: ${list(clue.leadsTo).map(sourceName).join(", ")}.`,
      ),
    ),
    section(
      "Routes to Each Conclusion",
      items(
        list(clues.independentPaths),
        (path) =>
          `- **${label(path.revelationId)}:** ${list(path.clueIds).map(label).join(" → ")}${text(path.reasoning) ? `. ${sentence(path.reasoning)}` : ""}`,
      ),
    ),
    section(
      "Pressure Clock",
      items(
        list(pressure.pressureClock),
        (step, index) =>
          `${index + 1}. **When:** ${trimStop(step.trigger)}. **Then:** ${sentence(step.consequence)}`,
      ),
    ),
    section(
      "NPC Responses",
      items(
        list(pressure.npcResponses),
        (response) =>
          `- **${personNames.get(text(response.personId)) ?? text(response.personId)}:** If ${afterIf(response.trigger)}, then ${afterIf(response.response).replace(/^then\s+/i, "")}.`,
      ),
    ),
    section(
      "Objective and Approaches",
      `**Objective:** ${sentence(pressure.objective)}\n\n${list(
        pressure.approaches,
      )
        .filter(hasText)
        .map((approach) => `- ${sentence(approach)}`)
        .join("\n")}`,
    ),
    section(
      "Possible Outcomes",
      ["correct", "partial", "mistaken", "failed", "unsolved"]
        .map((key) => {
          const outcome = record(record(pressure.outcomes)[key]);
          return `- **${key}:** ${sentence(outcome.condition)} ${sentence(outcome.consequence)}${text(outcome.continuation) ? ` Continue with: ${sentence(outcome.continuation)}` : ""}`;
        })
        .join("\n"),
    ),
  ].join("\n\n");
  return {
    type: "note",
    title: text(foundation.title),
    summary: text(foundation.summary),
    content: tidy(
      withoutIds(
        stripMysteryMarkdownImages(`${playerContent}\n\n${gmContent}`),
      ),
    ),
    lore: tidy(withoutIds(stripMysteryMarkdownImages(fixedTruth))),
    labels: ["mystery", "investigation", "mystery-generator"],
    status: "draft",
    mysteryGraph: buildMysteryGraph(foundation, cast, clues),
  };
}

/** Returns null on an unusable stage so the caller can use its labelled local fallback. */
export async function generateMysteryStaged(
  resolved: ResolvedMysteryOptions,
  deps: MysteryStagedDependencies,
): Promise<{
  output: PublicGeneratorOutput;
  stats: MysteryStagedStats;
} | null> {
  const steps = [
    { id: "mystery-foundation", label: "Case foundation and fixed truth" },
    { id: "mystery-cast", label: "Suspects and locations" },
    { id: "mystery-clues", label: "Clues and independent leads" },
    { id: "mystery-pressure", label: "Pressure and possible outcomes" },
    { id: "mystery-audit", label: "Consistency and spoiler audit" },
    { id: "mystery-repair", label: "Repair flagged case details" },
    { id: "mystery-final-audit", label: "Final consistency check" },
  ] as const;
  const progress = new StagedProgress(steps, deps.onProgress);
  const stats: MysteryStagedStats = {
    outcome: "staged",
    aiCalls: 0,
    repairedStages: [],
  };
  const system =
    "You design fair, playable, system-neutral mysteries for tabletop role-playing games. Return valid JSON only. The case uses Fixed Truth; never change accepted facts or expose GM-only truth in player-facing descriptions." +
    ` Never give any person or the case a name, first name or surname from this banned list (these are overused defaults; invent fresh, genre-fitting names instead): ${[...BANNED_NAMES, ...resolved.avoidNames].join(", ")}.`;
  const run = async (
    id: (typeof steps)[number]["id"],
    message: string,
    check: (data: Obj) => DraftCheck,
    normalize?: (data: Obj) => Obj,
  ) => {
    const complete = normalize
      ? async (systemInstruction: string, userMessage: string) => {
          const reply = await deps.complete(systemInstruction, userMessage);
          const parsed = readJsonObject(reply);
          return parsed ? JSON.stringify(normalize(parsed)) : reply;
        }
      : deps.complete;
    return runCheckedStage(
      complete,
      { progress, stats: stats as never },
      { id, system, message, check },
      deps.signal,
    );
  };
  const foundation = await run(
    "mystery-foundation",
    `STAGE 1 OF 7: Case foundation. ${deps.contextPrefix ?? ""}\nOptions: ${JSON.stringify(resolved)}\nEstablish a fixed mystery, title, player-safe summary, central question, opening hook, perpetratorId exactly "person-1", truth (perpetratorName, motive, means, opportunity, constraints, plus keyItem: the central object, document or evidence at stake; keyItemLocation: where it is now; keyItemFate: what the culprit intends for it; recovery: what the party must do to recover it or prove who took it; methodReason: why the method needed what it used, e.g. why a copied key rather than walking in, and it must agree with the opportunity; it also fixes the physical or magical rules the method relies on, which every later stage must reuse unchanged (if draining an oil silences a ward, nothing may later say the oil quiets it), and mundane steps must be physically plausible (a wax press of a keyhole does not copy a key); atStart: where the key item, the culprit and anyone taken are at the moment play begins, consistent with the last timeline event; disputedFact: the exact fact the case turns on; victimStatus: if anyone was taken, hurt or lured away, how they are held or incapacitated and how the party can free them, otherwise an empty string; and where a magical object has a function, keep it consistent with the motive, so do not make the object preserve what the culprit means to erase without saying which effect is which), an ordered timeline of at least three events, and at least three revelations with stable ids, a fact stating the actual conclusion and a kind (include one each of "culprit", "motive" and "item"). Keep the truth private. Do not create suspects, clues, or outcomes yet.\nReturn JSON of exactly this shape (string values are plain strings): {"title":"","summary":"player-safe summary","centralQuestion":"","openingHook":"","perpetratorId":"person-1","truth":{"perpetratorName":"","motive":"","means":"","opportunity":"","constraints":"one string","keyItem":"","keyItemLocation":"","keyItemFate":"","recovery":"","methodReason":"","disputedFact":"","victimStatus":"","atStart":""},"timeline":["one event string each"],"revelations":[{"id":"rev-1","kind":"culprit","fact":""},{"id":"rev-2","kind":"motive","fact":""},{"id":"rev-3","kind":"item","fact":""}]}.`,
    (data) => checkFoundation(data, resolved),
    normalizeMysteryStage.foundation,
  );
  if (!foundation) return stopped(stats, "foundation");
  const cast = await run(
    "mystery-cast",
    `STAGE 2 OF 7: Suspects and locations. Treat this accepted foundation as locked; do not change its facts, names, IDs, or timeline.\nFOUNDATION: ${JSON.stringify(foundation.data)}\nReturn exactly ${resolved.suspectCount} suspects in "suspects" (people only; never put places there) and the places in "locations". Return exactly ${resolved.suspectCount} suspects with ids person-1 through person-${resolved.suspectCount}; person-1's name must be exactly the locked perpetratorName ${text(record(foundation.data.truth).perpetratorName)}. Each suspect has name, role, publicFace, motive, secret, alibi, knows, believes, approach. Distinguish actual knowledge from belief, lie or omission; no unexplained knowledge or impossible alibis. Return at least three locations with unique stable ids, name, activity and evidence. One location must be where the key item is now (the foundation's keyItemLocation); return its id as keyItemLocationId. Do not write clues or change the truth.\nReturn JSON of exactly this shape: {"keyItemLocationId":"place-1","suspects":[{"id":"person-1","name":"","role":"","publicFace":"","motive":"","secret":"","alibi":"","knows":"","believes":"","approach":""}],"locations":[{"id":"place-1","name":"","activity":"","evidence":""}]}. All values are plain strings.`,
    (data) => checkCast(data, foundation.data, resolved),
    (data) =>
      normalizeMysteryStage.cast(
        data,
        text(record(foundation.data.truth).perpetratorName),
      ),
  );
  if (!cast) return stopped(stats, "cast");
  const clues = await run(
    "mystery-clues",
    `STAGE 3 OF 7: Clue and lead network. FOUNDATION (locked): ${JSON.stringify(foundation.data)}\nCAST AND LOCATIONS (locked): ${JSON.stringify(cast.data)}\nReturn at least six concrete clues, each with id, observation, sourceId, supports (known revelation ids), doesNotProve and leadsTo (known person/place/clue ids). Return independentPaths with at least two paths to EACH revelation; each path must use existing clue ids, connect consecutive clues through leadsTo, contain a clue that supports the revelation, and begin at a distinct clue source. Every revelation must be supported by clues from at least two different sources; the simplest valid independent path is a single clue that supports the revelation, with two such paths from different sources. Include at least two useful investigation routes. The two paths for a revelation must share no clue and begin at different sources. At least one clue must lead to the key item's location (keyItemLocationId in the cast) so the party can actually recover it, and the clues must let players deduce the culprit, the motive and where the item is, without a GM declaration. Each route must by itself give enough information to establish its revelation (a clue that only shows something was prepared does not prove a motive), and a revelation must not hinge on one person agreeing to talk: give a route the party can find without that person's help. Red herrings are true observations with testable alternative readings, never fabricated evidence.\nReturn JSON of exactly this shape: {"clues":[{"id":"clue-1","observation":"","sourceId":"person-or-place id","supports":["revelation id"],"doesNotProve":"","leadsTo":["person, place or clue id"]}],"independentPaths":[{"revelationId":"","clueIds":["clue-1","clue-2"],"reasoning":"how these clues together establish the conclusion"}]}. A route must collectively contain enough evidence for its conclusion: a single-clue route is valid only when that clue alone establishes it, and a route to the culprit must point to that specific person, not merely show tampering. Write each path's reasoning.`,
    (data) => checkClues(data, foundation.data, cast.data),
    (data) =>
      normalizeMysteryStage.clues(
        data,
        uniqueIds(list(foundation.data.revelations)),
      ),
  );
  if (!clues) return stopped(stats, "clues");
  const pressure = await run(
    "mystery-pressure",
    `STAGE 4 OF 7: Pressure and outcomes. FOUNDATION, CAST and CLUE NETWORK are locked; preserve every name, event, ID and connection.\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCAST: ${JSON.stringify(cast.data)}\nCLUES: ${JSON.stringify(clues.data)}\nReturn an escalation description, a pressureClock with at least three trigger/consequence steps that form a real clock: time-ordered beats that advance whether or not the party acts, all strictly after the moment play begins (the foundation's atStart) and never restating an event already in the timeline (each trigger names a moment or deadline, each consequence makes the situation worse than the step before; never restate a conditional reaction there, those belong in npcResponses), npcResponses keyed to known person ids, and outcomes keyed correct, partial, mistaken, failed and unsolved. Every outcome has condition and consequence; unsolved also has a continuation hook and means the theft or crime stays unresolved because the trail went cold; if the historical truth itself is lost, say so in the consequence, and keep any later discovery in the continuation hook rather than contradicting the lost evidence. A plausible wrong conclusion must be testable before irreversible action, and that test must itself be safe: never offer experimentation as a safe option when a wrong attempt is catastrophic; provide a safe way to check first. Describe a solvable situation, not a walkthrough: return an objective (what must be achieved, and by when), and at least three different approaches the party could take (for example intercept, confront, infiltrate, negotiate or interrupt). State hard constraints and what happens to people present, but never prescribe one mandatory sequence of player actions, and never make a step the objective requires (such as opening a container) count as failure. Outcomes describe what results from success or failure, whichever approach is used. Describe a procedure fully once in the truth or the evidence and refer to it by name elsewhere instead of repeating its steps.\nReturn JSON of exactly this shape: {"escalation":"","pressureClock":[{"trigger":"","consequence":""}],"npcResponses":[{"personId":"person-1","trigger":"","response":""}],"outcomes":{"correct":{"condition":"","consequence":""},"partial":{"condition":"","consequence":""},"mistaken":{"condition":"","consequence":""},"failed":{"condition":"","consequence":""},"unsolved":{"condition":"","consequence":"","continuation":""}},"objective":"","approaches":["", "", ""]}. All values are plain strings.`,
    (data) => checkPressure(data, cast.data),
    normalizeMysteryStage.pressure,
  );
  if (!pressure) return stopped(stats, "pressure");
  const audit = await run(
    "mystery-audit",
    `STAGE 5 OF 7: Audit this locked complete case. Do not rewrite or contradict any accepted content.\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCAST: ${JSON.stringify(cast.data)}\nCLUES: ${JSON.stringify(clues.data)}\nPRESSURE AND OUTCOMES: ${JSON.stringify(pressure.data)}\nCheck these invariants and report any that fail: (A) causal consistency: can every significant action happen using the established rules, at the established time and place, and does the pressure clock start after the moment play begins without repeating the timeline; (B) evidence sufficiency: does each claimed route collectively contain enough evidence for its conclusion (a clue that only shows tampering does not identify the culprit; a clue about a group does not establish one person's motive), and is no revelation dependent on one person agreeing to talk; (C) solution flexibility: are the objective and world constraints kept separate from optional methods, with several workable approaches and no single mandatory sequence or self-contradicting failure condition. Also check that the world behaves consistently: items, magical effects, motives, NPC knowledge, timing and consequences agree across stages. Specifically: (1) the method is mechanically possible and its access, timing and tools agree with methodReason and the opportunity; (2) the key item has a known location, custody and fate; (3) every revelation has independent evidence that can actually be followed; (4) the culprit can be identified through evidence, not a GM declaration; (5) the true motive can be established; (6) every outcome is reachable with the evidence and actions that exist. Also check cross-stage contradictions, impossible chronology or knowledge, invalid links, false red herrings, missing consequences, and leakage of truth into player-facing fields. Return {"status":"consistent","issues":[]} only if there are no material defects. Otherwise return {"status":"needs-repair","issues":["specific field-level defect", ...]}.`,
    checkAudit,
    normalizeMysteryStage.audit,
  );
  if (!audit) return stopped(stats, "audit");
  let finalCast = cast.data;
  let finalClues = clues.data;
  let finalPressure = pressure.data;
  if (text(audit.data.status) === "needs-repair") {
    const repair = await run(
      "mystery-repair",
      `STAGE 6 OF 7: Make only the targeted repairs listed in the audit. Keep the foundation and all IDs fixed. You may correct suspect knowledge/alibis, clues, and pressure details where the listed defects require it; do not change unrelated details.\nAUDIT ISSUES: ${JSON.stringify(audit.data.issues)}\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCURRENT CAST: ${JSON.stringify(cast.data)}\nCURRENT CLUES: ${JSON.stringify(clues.data)}\nCURRENT PRESSURE: ${JSON.stringify(pressure.data)}\nReturn complete replacement objects {"cast":{...},"clues":{...},"pressure":{...}}. Correct every listed issue; leave unrelated fields unchanged.`,
      (data) => {
        const nextCast = record(data.cast);
        const nextClues = record(data.clues);
        const nextPressure = record(data.pressure);
        const castCheck = checkCast(nextCast, foundation.data, resolved);
        const clueCheck = checkClues(nextClues, foundation.data, nextCast);
        const pressureCheck = checkPressure(nextPressure, nextCast);
        return {
          hard: [
            ...castCheck.hard.map((issue) => `cast: ${issue}`),
            ...clueCheck.hard.map((issue) => `clues: ${issue}`),
            ...pressureCheck.hard.map((issue) => `pressure: ${issue}`),
          ],
          soft: [],
        };
      },
      (data) =>
        normalizeMysteryStage.repair(data, {
          culpritName: text(record(foundation.data.truth).perpetratorName),
          revelationIds: uniqueIds(list(foundation.data.revelations)),
          previous: {
            cast: cast.data,
            clues: clues.data,
            pressure: pressure.data,
          },
        }),
    );
    // An unusable repair keeps the case as it was: it already passed every check.
    if (repair) {
      finalCast = record(repair.data.cast);
      finalClues = record(repair.data.clues);
      finalPressure = record(repair.data.pressure);
    }
  } else {
    progress.set("mystery-repair", "skipped", "no repair needed");
  }
  const finalAudit = await run(
    "mystery-final-audit",
    `STAGE 7 OF 7: Verify the final locked case. If targeted repairs were requested, confirm they solve every listed issue and preserve all three checks: causal consistency (every action works under the established rules, time and place, and the pressure clock starts after play begins); evidence sufficiency (each route collectively proves its conclusion without any one person's cooperation); and solution flexibility (the objective and constraints are separate from several optional approaches, with no mandatory sequence and no step the objective needs counted as failure). Also recheck item effects versus motive, NPC knowledge and timing after repairs. Confirm player-facing fields still contain no GM-only truth.\nORIGINAL AUDIT ISSUES: ${JSON.stringify(audit.data.issues)}\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCAST: ${JSON.stringify(finalCast)}\nCLUES: ${JSON.stringify(finalClues)}\nPRESSURE AND OUTCOMES: ${JSON.stringify(finalPressure)}\nReturn {"status":"consistent","issues":[]} only when all checks pass; otherwise return {"status":"needs-repair","issues":["specific unresolved issue", ...]}.`,
    checkFinalAudit,
    normalizeMysteryStage.audit,
  );
  if (!finalAudit) return stopped(stats, "final-audit");
  throwIfAborted(deps.signal);
  const output = assembleOutput(
    foundation.data,
    finalCast,
    finalClues,
    finalPressure,
  );
  deps.onStats?.(stats);
  return { output, stats };

  function stopped(state: MysteryStagedStats, stage: string): null {
    state.outcome = "fallback";
    state.stoppedAt = stage;
    deps.onStats?.(state);
    return null;
  }
}
