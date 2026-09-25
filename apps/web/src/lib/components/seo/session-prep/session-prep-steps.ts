import {
  CONSEQUENCE_KEYS,
  isSessionPrepStepEmpty,
  type SessionPrep,
  type SessionPrepStep,
} from "generator-engine";

export interface SessionPrepStepInfo {
  /** Short section name used on the run sheet and in the adjust view. */
  label: string;
  /** The wizard question for this step. */
  question: string;
  hint: string;
  /** Example steer shown in the "Guide the AI" field. */
  guideExample: string;
}

export const SESSION_PREP_STEP_INFO: Record<
  SessionPrepStep,
  SessionPrepStepInfo
> = {
  start: {
    label: "Start",
    question: "Where does play begin?",
    hint: "What just happened, and what demands the characters' attention.",
    guideExample: "open mid-chase through the market",
  },
  pressure: {
    label: "Pressure",
    question: "What is moving tonight?",
    hint: "What happens if the characters do nothing.",
    guideExample: "a ticking clock that ends at dawn",
  },
  people: {
    label: "People",
    question: "Who matters tonight?",
    hint: "What each person wants, and what they do next.",
    guideExample: "a rival who wants the same thing",
  },
  places: {
    label: "Places",
    question: "Where might the characters go?",
    hint: "Likely places, each with a danger and something worth finding.",
    guideExample: "somewhere underground and flooded",
  },
  information: {
    label: "Information",
    question: "What might the players need to find out?",
    hint: "Each fact, and the different ways they can find it.",
    guideExample: "a clue hidden in a folk song",
  },
  complications: {
    label: "Complications",
    question: "What could go sideways?",
    hint: "Things that might happen depending on choices. Not a scene order.",
    guideExample: "the weather turns against them",
  },
  consequences: {
    label: "Consequences",
    question: "How does the world react?",
    hint: "What happens if they succeed, fail, delay or avoid the pressure.",
    guideExample: "keep failure survivable",
  },
  reserve: {
    label: "Reserve",
    question: "What do you want in your back pocket?",
    hint: "Spare names, a minor NPC, a complication or a place you can use anywhere.",
    guideExample: "names with a Norse feel",
  },
};

const PREVIEW_LENGTH = 60;

function clip(text: string): string {
  const value = text.trim();
  return value.length > PREVIEW_LENGTH
    ? `${value.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…`
    : value;
}

function names(values: string[]): string {
  const shown = values.slice(0, 2).join(", ");
  return values.length > 2 ? `${shown} +${values.length - 2}` : shown;
}

const filled = (value: string) => value.trim().length > 0;

/** One line describing what a step holds, for the collapsed adjust view. */
export function previewSessionPrepStep(
  prep: SessionPrep,
  step: SessionPrepStep,
): string {
  if (isSessionPrepStepEmpty(prep, step)) return "Empty";
  switch (step) {
    case "start":
    case "pressure":
      return clip(prep[step]);
    case "people":
      return names(prep.people.map((p) => p.name.trim()).filter(Boolean));
    case "places":
      return names(prep.places.map((p) => p.name.trim()).filter(Boolean));
    case "information":
      return names(
        prep.information.map((clue) => clip(clue.fact)).filter(Boolean),
      );
    case "complications":
    case "reserve":
      return names(prep[step].map((note) => clip(note.text)).filter(Boolean));
    case "consequences":
      return `${
        CONSEQUENCE_KEYS.filter((key) => filled(prep.consequences[key])).length
      } of ${CONSEQUENCE_KEYS.length} outcomes`;
  }
}
