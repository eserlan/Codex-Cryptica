import type { Goal, JourneyDefinition, JourneyId } from "../types";
import { rpgGm } from "./rpg-gm";
import { worldbuilder } from "./worldbuilder";
import { writer } from "./writer";

export const JOURNEYS: Readonly<Record<JourneyId, JourneyDefinition>> = {
  worldbuilder,
  writer,
  "rpg-gm": rpgGm,
};

const BY_GOAL: Record<Goal, JourneyId> = {
  world: "worldbuilder",
  story: "writer",
  campaign: "rpg-gm",
};

export function journeyForGoal(goal: Goal): JourneyDefinition {
  return JOURNEYS[BY_GOAL[goal]];
}
