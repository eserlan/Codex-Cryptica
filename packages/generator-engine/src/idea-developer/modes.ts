/**
 * The ways the Idea Developer can examine an idea (#3228).
 *
 * This table is the single extension seam: a mode is one entry here. Every mode
 * returns the same sections; modes change emphasis, not structure. Only modes
 * defined here are ever offered to the user.
 */

export interface ModeDefinition {
  id: string;
  label: string;
  description: string;
  /** Sent with the turn to say how the response should lean. */
  emphasis: string;
}

export const MODES = {
  assess: {
    id: "assess",
    label: "Assess",
    description:
      "See what is already working, what is still unanswered, and how playable the idea is.",
    emphasis:
      "Assess the idea as it stands. Lean on what is already interesting, the central question, what is still unanswered, and how playable it is. Do not invent new factions or plot beyond what the idea already implies; for the people who care, name only those the idea already points to, and where something is missing say so and ask about it in the creator questions.",
  },
  develop: {
    id: "develop",
    label: "Develop",
    description:
      "Add pressure, people with opposing goals, choices for the players, and consequences.",
    emphasis:
      "Lean toward developing the idea: add pressure, people with incompatible interests, player choices and consequences.",
  },
} as const satisfies Record<string, ModeDefinition>;

export type ModeId = keyof typeof MODES;

export const DEFAULT_MODE: ModeId = "develop";

export function isModeId(value: unknown): value is ModeId {
  return typeof value === "string" && Object.hasOwn(MODES, value);
}

export function getMode(id: string): ModeDefinition | undefined {
  return isModeId(id) ? MODES[id] : undefined;
}

/** The modes to offer, in table order. Takes the table so it can be tested. */
export function listModes(
  table: Record<string, ModeDefinition> = MODES,
): ModeDefinition[] {
  return Object.values(table);
}

export function emphasisFor(id: ModeId): string {
  return MODES[id].emphasis;
}
