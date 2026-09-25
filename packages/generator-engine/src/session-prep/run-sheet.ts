import {
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

function section(heading: string, lines: string[]): string[] {
  return lines.length ? [`## ${heading}\n${lines.join("\n")}`] : [];
}

function textSection(heading: string, text: string): string[] {
  return oneLine(text) ? section(heading, [oneLine(text)]) : [];
}

/** The table-facing view: only what the GM needs to see during play. */
export function toRunSheetMarkdown(prep: SessionPrep): string {
  const bottlenecks = new Set(findSingleRouteClues(prep).map((c) => c.id));

  const people = prep.people
    .filter((person) => oneLine(person.name))
    .map((person) => {
      const parts = [
        oneLine(person.wants) && `wants ${sentence(person.wants)}`,
        oneLine(person.doesNext) && `Next: ${sentence(person.doesNext)}`,
      ].filter(Boolean);
      return parts.length
        ? `- **${oneLine(person.name)}:** ${parts.join(" ")}`
        : `- **${oneLine(person.name)}**`;
    });

  const places = prep.places
    .filter((place) => oneLine(place.name))
    .map((place) =>
      oneLine(place.detail)
        ? `- **${oneLine(place.name)}:** ${oneLine(place.detail)}`
        : `- **${oneLine(place.name)}**`,
    );

  const information = prep.information
    .filter((clue) => oneLine(clue.fact))
    .map((clue) => {
      const routes = clue.routes.map(oneLine).filter(Boolean);
      const tag = clue.critical
        ? bottlenecks.has(clue.id)
          ? " (needed, only one route)"
          : " (needed)"
        : "";
      // Never "**fact**: routes": the shared renderer turns that into a label block.
      return `- **${sentence(clue.fact)}**${tag}${routes.length ? ` Found by: ${routes.join("; ")}` : ""}`;
    });

  // A plain "- Label: text" line would be restyled as a label block by the
  // shared generator renderer, so bold the label like every other line.
  const notes = (items: SessionPrep["reserve"]) =>
    items
      .map((note) => oneLine(note.text))
      .filter(Boolean)
      .map((line) => `- ${line.replace(/^([^:*]{1,60}): /, "**$1:** ")}`);

  const consequences = (
    Object.keys(CONSEQUENCE_LABELS) as (keyof PrepConsequences)[]
  )
    .filter((key) => oneLine(prep.consequences[key]))
    .map(
      (key) =>
        `- **${CONSEQUENCE_LABELS[key]}:** ${oneLine(prep.consequences[key])}`,
    );

  return [
    ...textSection("Open", prep.start),
    ...textSection("Pressure", prep.pressure),
    ...section("People", people),
    ...section("Places", places),
    ...section("Information", information),
    ...section("Complications", notes(prep.complications)),
    ...section("Consequences", consequences),
    ...section("Reserve", notes(prep.reserve)),
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
      return [
        oneLine(person.name),
        oneLine(person.wants) && `wants ${oneLine(person.wants)}`,
        oneLine(person.doesNext) && `next: ${oneLine(person.doesNext)}`,
      ]
        .filter(Boolean)
        .join(", ");
    }
    case "places": {
      const place = option as PrepPlaceDraft;
      return [oneLine(place.name), oneLine(place.detail)]
        .filter(Boolean)
        .join(": ");
    }
    case "information": {
      const clue = option as PrepClueDraft;
      const routes = clue.routes.map(oneLine).filter(Boolean);
      return routes.length
        ? `${oneLine(clue.fact)} (found by: ${routes.join("; ")})`
        : oneLine(clue.fact);
    }
    case "complications":
    case "reserve":
      return oneLine((option as PrepNoteDraft).text);
    case "consequences": {
      const set = option as PrepConsequences;
      return (Object.keys(CONSEQUENCE_LABELS) as (keyof PrepConsequences)[])
        .filter((key) => oneLine(set[key]))
        .map((key) => `${CONSEQUENCE_LABELS[key]}: ${oneLine(set[key])}`)
        .join(" / ");
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
