import { list, record, text, type Obj } from "./mystery-obj";
import type { DraftCheck } from "./staged-runtime";
import type { ResolvedMysteryOptions } from "./public-mystery";
import { addBannedNameFindings } from "./staged-runtime";
import { findPlacementIssues } from "./mystery-consistency";
import {
  allowedThirdRevelationKinds,
  expectedThirdRevelationKind,
} from "./mystery-type-guidance";
import {
  hasText,
  missing,
  uniqueIds,
  hasCrossGroupIdCollision,
  missingFields,
  hasUniqueIds,
} from "./mystery-stage-validation";

/** What the GM needs to know about the case's central object, beyond who took it. */
const KEY_ITEM_FIELDS = [
  "keyItem",
  "keyItemLocation",
  "keyItemFate",
  "recovery",
  "methodReason",
  "disputedFact",
] as const;

function missingRevelationKinds(
  revelations: Obj[],
  mysteryType = "Other",
): string[] {
  const kinds = new Set(
    revelations.map((item) => text(item.kind).trim().toLowerCase()),
  );
  const hard: string[] = [];
  if (!kinds.has("culprit"))
    hard.push('a revelation with kind "culprit" is required');
  if (!kinds.has("motive"))
    hard.push('a revelation with kind "motive" is required');

  const allowedThird = allowedThirdRevelationKinds(mysteryType);
  if (!allowedThird.some((k) => kinds.has(k))) {
    const expected = expectedThirdRevelationKind(mysteryType);
    hard.push(
      `a revelation with kind "${expected}" (or ${allowedThird.join(", ")}) is required`,
    );
  }
  return hard;
}

export function checkFoundation(
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
      "atStart",
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
  if (!hasUniqueIds(revelationIds))
    hard.push("revelation ids must be present and unique");
  revelations.forEach((item, index) => {
    if (!hasText(item.fact)) hard.push(`revelation ${index + 1} needs a fact`);
  });
  hard.push(...missingRevelationKinds(revelations, resolved.mysteryType));
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
  if (!hasUniqueIds(locationIds))
    hard.push("location ids must be present and unique");
  hard.push(
    ...missingFields(locations, ["name", "activity", "evidence"], "location"),
  );
  if (!locationIds.includes(text(data.keyItemLocationId)))
    hard.push(
      '"keyItemLocationId" must be the id of the location where the key item is now',
    );
  return hard;
}

export function checkCast(
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
  hard.push(...missingFields(suspects, fields, "suspect"));
  hard.push(...checkLocations(data));
  hard.push(...findPlacementIssues(data));
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
