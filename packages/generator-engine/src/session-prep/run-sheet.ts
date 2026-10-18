import {
  CONSEQUENCE_KEYS,
  findSingleRouteClues,
  type PrepClueDraft,
  type PrepConsequences,
  type PrepNoteDraft,
  type PrepPersonDraft,
  type PrepPlaceDraft,
  type SessionPrep,
  type SessionPrepSuggestion,
} from "./model";

const oneLine = (text: string) => text.trim().replace(/\s+/g, " ");
const sentence = (text: string) => {
  const line = oneLine(text);
  return /[.!?…]$/.test(line) ? line : `${line}.`;
};

const CONSEQUENCE_LABELS: Record<keyof PrepConsequences, string> = {
  success: "If they succeed",
  failure: "If they fail",
  delay: "If they delay",
  avoidance: "If they avoid it",
};

/** Maps each item to a line and keeps the non-empty ones, in a single pass. */
function linesOf<T>(
  items: readonly T[],
  toLine: (item: T) => string,
): string[] {
  const lines: string[] = [];
  for (const item of items) {
    const line = toLine(item);
    if (line) lines.push(line);
  }
  return lines;
}

/** Joins the non-empty values, without building a filtered copy. */
function joinPresent(separator: string, values: readonly string[]): string {
  let joined = "";
  for (const value of values) {
    if (!value) continue;
    joined = joined ? `${joined}${separator}${value}` : value;
  }
  return joined;
}

function section(heading: string, lines: string[]): string[] {
  return lines.length ? [`## ${heading}\n${lines.join("\n")}`] : [];
}

function textSection(heading: string, text: string): string[] {
  return oneLine(text) ? section(heading, [oneLine(text)]) : [];
}

function personLine(person: SessionPrep["people"][number]): string {
  const name = oneLine(person.name);
  if (!name) return "";
  const details = joinPresent(" ", [
    oneLine(person.wants) && `wants ${sentence(person.wants)}`,
    oneLine(person.doesNext) && `Next: ${sentence(person.doesNext)}`,
  ]);
  return details ? `- **${name}:** ${details}` : `- **${name}**`;
}

function placeLine(place: SessionPrep["places"][number]): string {
  const name = oneLine(place.name);
  if (!name) return "";
  const detail = oneLine(place.detail);
  return detail ? `- **${name}:** ${detail}` : `- **${name}**`;
}

function clueLine(
  clue: SessionPrep["information"][number],
  bottlenecks: ReadonlySet<string>,
): string {
  if (!oneLine(clue.fact)) return "";
  const routes = joinPresent("; ", clue.routes.map(oneLine));
  const tag = clue.critical
    ? bottlenecks.has(clue.id)
      ? " (needed, only one route)"
      : " (needed)"
    : "";
  // Never "**fact**: routes": the shared renderer turns that into a label block.
  return `- **${sentence(clue.fact)}**${tag}${routes ? ` Found by: ${routes}` : ""}`;
}

// A plain "- Label: text" line would be restyled as a label block by the
// shared generator renderer, so bold the label like every other line.
function noteLine(note: SessionPrep["reserve"][number]): string {
  const line = oneLine(note.text);
  return line ? `- ${line.replace(/^([^:*]{1,60}): /, "**$1:** ")}` : "";
}

/** The table-facing view: only what the GM needs to see during play. */
export function toRunSheetMarkdown(prep: SessionPrep): string {
  const bottlenecks = new Set(findSingleRouteClues(prep).map((c) => c.id));
  const consequences = linesOf(CONSEQUENCE_KEYS, (key) => {
    const text = oneLine(prep.consequences[key]);
    return text ? `- **${CONSEQUENCE_LABELS[key]}:** ${text}` : "";
  });

  return [
    ...textSection("Open", prep.start),
    ...textSection("Pressure", prep.pressure),
    ...section("People", linesOf(prep.people, personLine)),
    ...section("Places", linesOf(prep.places, placeLine)),
    ...section(
      "Information",
      linesOf(prep.information, (clue) => clueLine(clue, bottlenecks)),
    ),
    ...section("Complications", linesOf(prep.complications, noteLine)),
    ...section("Consequences", consequences),
    ...section("Reserve", linesOf(prep.reserve, noteLine)),
  ].join("\n\n");
}

/** A one-line preview of an AI option, for the GM to choose from. */
export function describeSuggestionOption(
  suggestion: SessionPrepSuggestion,
  index: number,
): string {
  const option = suggestion.options[index];
  if (option === undefined) return "";
  switch (suggestion.step) {
    case "start":
    case "pressure":
      return oneLine(option as string);
    case "people": {
      const person = option as PrepPersonDraft;
      return joinPresent(", ", [
        oneLine(person.name),
        oneLine(person.wants) && `wants ${oneLine(person.wants)}`,
        oneLine(person.doesNext) && `next: ${oneLine(person.doesNext)}`,
      ]);
    }
    case "places": {
      const place = option as PrepPlaceDraft;
      return joinPresent(": ", [oneLine(place.name), oneLine(place.detail)]);
    }
    case "information": {
      const clue = option as PrepClueDraft;
      const routes = joinPresent("; ", clue.routes.map(oneLine));
      return routes
        ? `${oneLine(clue.fact)} (found by: ${routes})`
        : oneLine(clue.fact);
    }
    case "complications":
    case "reserve":
      return oneLine((option as PrepNoteDraft).text);
    case "consequences": {
      const set = option as PrepConsequences;
      return joinPresent(
        " / ",
        CONSEQUENCE_KEYS.map((key) =>
          oneLine(set[key])
            ? `${CONSEQUENCE_LABELS[key]}: ${oneLine(set[key])}`
            : "",
        ),
      );
    }
  }
}

/** Background kept beside the run sheet, starting with the GM's own hook. */
export function toSessionPrepLore(prep: SessionPrep): string {
  const hook = prep.seed.trim();
  if (!hook) return "";
  return [
    "### Your hook",
    ...hook.split(/\r?\n/).map((line) => `> ${line}`),
  ].join("\n");
}
