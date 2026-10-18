/**
 * Our own focus and action tables for random events (spec 174, FR-008, FR-014).
 * Written for genre-neutral play. They are not copied from any published system.
 */

export interface Focus {
  id: string;
  label: string;
  /** Which subject this focus points at. */
  subject: "thread" | "party" | "place" | "newcomer";
}

export const FOCI: readonly Focus[] = [
  { id: "thread-moves", label: "A thread moves forward", subject: "thread" },
  {
    id: "thread-turns",
    label: "A thread takes an unexpected turn",
    subject: "thread",
  },
  {
    id: "party-spotlight",
    label: "Someone in the party is in the spotlight",
    subject: "party",
  },
  {
    id: "party-trouble",
    label: "Trouble finds someone in the party",
    subject: "party",
  },
  {
    id: "place-shifts",
    label: "The place around you changes",
    subject: "place",
  },
  {
    id: "place-danger",
    label: "Danger gathers in this place",
    subject: "place",
  },
  { id: "place-opening", label: "An opening appears here", subject: "place" },
  { id: "newcomer-arrives", label: "Someone new arrives", subject: "newcomer" },
  {
    id: "past-resurfaces",
    label: "Something from the past resurfaces",
    subject: "newcomer",
  },
  { id: "quiet-breaks", label: "A quiet moment breaks", subject: "newcomer" },
];

export const ACTIONS: readonly string[] = [
  "reveal more about",
  "complicate",
  "delay",
  "reverse",
  "escalate",
  "soften",
  "expose",
  "threaten",
  "reward",
  "distract from",
  "test",
  "bring back",
  "ask for help with",
  "hide",
  "speed up",
  "undermine",
  "strengthen",
  "break",
  "offer a way through",
  "shift the blame onto",
  "call into question",
  "bargain over",
  "lose track of",
  "leave a clue about",
  "set a trap around",
  "spread a rumour about",
  "find a way past",
  "forget",
  "celebrate",
  "return to",
];
