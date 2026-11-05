import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { stripMysteryMarkdownImages } from "./public-mystery";
import { list, record, text, type Obj } from "./mystery-obj";
import { buildMysteryGraph } from "./mystery-graph";
import { hasText } from "./mystery-stage-validation";

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

function readableUnknownId(id: string): string {
  const kind = /^(person|place|clue|rev)-\d+$/.exec(id)?.[1];
  if (kind === "person") return "an unlisted person";
  if (kind === "place") return "an unlisted place";
  if (kind === "clue") return "an unlisted lead";
  if (kind === "rev") return "an unlisted conclusion";
  return id;
}

function createRenderContext(foundation: Obj, cast: Obj, clues: Obj) {
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
    placeNames.get(text(id)) ??
    personNames.get(text(id)) ??
    readableUnknownId(text(id));
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
  return {
    truth,
    people,
    places,
    placeNames,
    personNames,
    sourceName,
    followUp,
    label,
    withoutIds,
  };
}

type RenderContext = ReturnType<typeof createRenderContext>;

function renderPlayerContent(
  foundation: Obj,
  clues: Obj,
  pressure: Obj,
  { people, places, sourceName, followUp }: RenderContext,
): string {
  return [
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
}

function renderFixedTruth(
  cast: Obj,
  { truth, placeNames }: RenderContext,
): string {
  return [
    section(
      "Fixed Truth — GM Only",
      `**Responsible party:** ${text(truth.perpetratorName)}.\n\n**Motive:** ${text(truth.motive)}\n\n**Means:** ${text(truth.means)}\n\n**Opportunity:** ${text(truth.opportunity)}\n\n**Why this method:** ${text(truth.methodReason)}\n\n**Constraints:** ${text(truth.constraints)}${text(truth.atStart) ? `\n\n**When play starts:** ${text(truth.atStart)}` : ""}\n\n**At stake:** ${text(truth.disputedFact)}\n\n**Key item:** ${trimStop(truth.keyItem)}. Now at ${placeNames.get(text(cast.keyItemLocationId)) ?? text(truth.keyItemLocation)}. Intended fate: ${text(truth.keyItemFate)}${text(truth.victimStatus) ? `\n\n**Captive or victim:** ${text(truth.victimStatus)}` : ""}\n\n**Recovery and proof:** ${text(truth.recovery)}`,
    ),
  ].join("\n\n");
}

function renderInvestigation(
  foundation: Obj,
  clues: Obj,
  { people, placeNames, label, sourceName }: RenderContext,
): string {
  return [
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
          `- **${text(person.name)}:** starts at ${placeNames.get(text(person.startLocationId)) ?? "an unknown place"}. Motive: ${text(person.motive)} Secret: ${text(person.secret)} Alibi: ${text(person.alibi)} Knows: ${text(person.knows)} Believes: ${text(person.believes)} Approach: ${text(person.approach)}`,
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
          `- **${label(clue.id)} — ${sourceName(clue.sourceId)}:** Supports ${list(clue.supports).map(label).join(", ")}. Does not prove: ${text(clue.doesNotProve)}. Leads to: ${list(clue.leadsTo).map(label).join(", ")}.`,
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
  ].join("\n\n");
}

function renderConsequences(
  pressure: Obj,
  { personNames }: RenderContext,
): string {
  return [
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
}

export function assembleOutput(
  foundation: Obj,
  cast: Obj,
  clues: Obj,
  pressure: Obj,
): PublicGeneratorOutput {
  const view = createRenderContext(foundation, cast, clues);
  const playerContent = renderPlayerContent(foundation, clues, pressure, view);
  const fixedTruth = renderFixedTruth(cast, view);
  const gmContent = [
    renderInvestigation(foundation, clues, view),
    renderConsequences(pressure, view),
  ].join("\n\n");
  const { withoutIds } = view;
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
