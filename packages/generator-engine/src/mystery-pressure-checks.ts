import { list, record, text, type Obj } from "./mystery-obj";
import type { DraftCheck } from "./staged-runtime";
import { findBrokenReferences } from "./mystery-consistency";
import {
  hasText,
  missing,
  uniqueIds,
  knownIds,
  missingFields,
} from "./mystery-stage-validation";

/** The goal is fixed; how the party reaches it is open. */
function missingSolutionSpace(data: Obj): string[] {
  const hard = missing(data, ["objective"]);
  const approaches = list(data.approaches)
    .map(text)
    .map((approach) => approach.trim().toLowerCase())
    .filter(Boolean);
  if (new Set(approaches).size < 3)
    hard.push(
      '"approaches" needs at least three different ways the party could reach the objective',
    );
  return hard;
}

function checkClock(data: Obj): string[] {
  const hard: string[] = [];
  const clock = list(data.pressureClock).map(record);
  if (clock.length < 3) hard.push("pressureClock needs at least three steps");
  hard.push(
    ...missingFields(clock, ["trigger", "consequence"], "pressure step"),
  );
  return hard;
}

function responseActorRange(complexity?: string): {
  min: number;
  max: number;
  label?: string;
} {
  if (complexity?.startsWith("Lean")) return { min: 2, max: 2, label: "Lean" };
  if (complexity?.startsWith("Standard"))
    return { min: 2, max: 3, label: "Standard" };
  if (complexity?.startsWith("Dense"))
    return { min: 3, max: 4, label: "Dense" };
  return { min: 2, max: 4 };
}

function checkResponses(data: Obj, cast: Obj, complexity?: string): string[] {
  const hard: string[] = [];
  const personIds = new Set(uniqueIds(list(cast.suspects)));
  const responses = list(data.npcResponses).map(record);
  const responsePersonIds = responses.map((response) =>
    text(response.personId),
  );
  const distinctKnownPersonIds = new Set(
    responsePersonIds.filter((personId) => personIds.has(personId)),
  );
  const range = responseActorRange(complexity);
  if (
    distinctKnownPersonIds.size < range.min ||
    distinctKnownPersonIds.size > range.max
  ) {
    const expectedCount =
      range.min === range.max
        ? `exactly ${range.min}`
        : `between ${range.min} and ${range.max}`;
    const complexityLabel = range.label ? ` for ${range.label} complexity` : "";
    hard.push(
      `npcResponses must describe ${expectedCount} distinct known suspects${complexityLabel}`,
    );
  }
  if (responses.length > 4)
    hard.push("npcResponses must contain no more than four actor rows");
  if (new Set(responsePersonIds).size !== responsePersonIds.length)
    hard.push("npcResponses must include each suspect at most once");
  responses.forEach((response, index) => {
    if (!personIds.has(text(response.personId)))
      hard.push(`NPC response ${index + 1} references an unknown personId`);
    if (!hasText(response.trigger) || !hasText(response.response))
      hard.push(`NPC response ${index + 1} needs a trigger and response`);
    if (!hasText(response.observableEffect))
      hard.push(`NPC response ${index + 1} needs an observableEffect`);
  });
  return hard;
}

function checkOutcomes(data: Obj): string[] {
  const hard: string[] = [];
  const outcomes = record(data.outcomes);
  for (const key of ["correct", "partial", "mistaken", "failed", "unsolved"]) {
    const outcome = record(outcomes[key]);
    if (!hasText(outcome.condition) || !hasText(outcome.consequence))
      hard.push(`outcome ${key} needs a condition and consequence`);
  }
  if (!hasText(record(outcomes.unsolved).continuation))
    hard.push("unsolved outcome needs a continuation hook");
  return hard;
}

export function checkPressure(
  data: Obj,
  cast: Obj,
  foundation: Obj,
  clues: Obj,
  complexity?: string,
): DraftCheck {
  const hard = missing(data, ["escalation"]);
  hard.push(
    ...findBrokenReferences(
      [
        text(data.escalation),
        text(data.objective),
        ...list(data.approaches).map(text),
        ...list(data.pressureClock).flatMap((step) => [
          text(record(step).trigger),
          text(record(step).consequence),
        ]),
        ...list(data.npcResponses).flatMap((response) => [
          text(record(response).trigger),
          text(record(response).response),
          text(record(response).observableEffect),
          text(record(response).testableLead),
        ]),
        ...["correct", "partial", "mistaken", "failed", "unsolved"].flatMap(
          (key) => {
            const outcome = record(record(data.outcomes)[key]);
            return [
              text(outcome.condition),
              text(outcome.consequence),
              text(outcome.continuation),
            ];
          },
        ),
      ],
      knownIds(foundation, cast, uniqueIds(list(clues.clues))),
    ),
  );
  hard.push(
    ...checkClock(data),
    ...checkResponses(data, cast, complexity),
    ...checkOutcomes(data),
  );
  hard.push(...missingSolutionSpace(data));
  return { hard, soft: [] };
}

export function checkAudit(data: Obj): DraftCheck {
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
