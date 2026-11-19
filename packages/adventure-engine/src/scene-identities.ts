import type {
  AdventureScene,
  SceneTransitionInput,
  SceneTransitionResult,
} from "./scene-types";

export const MAX_ADVENTURE_SCENES = 200;

export function commitSceneTransition(
  existing: readonly AdventureScene[],
  input: SceneTransitionInput,
): SceneTransitionResult {
  const scenes = [...existing];
  if (
    input.moodOnly ||
    !input.sceneId?.trim() ||
    !input.placeId.trim() ||
    !input.turnId.trim()
  ) {
    return { scenes, scene: null, reason: "invalid" };
  }

  const found = scenes.find((s) => s.id === input.sceneId);
  if (found) {
    return { scenes, scene: found };
  }

  if (scenes.length >= MAX_ADVENTURE_SCENES) {
    return { scenes, scene: null, reason: "capacity" };
  }

  const created: AdventureScene = {
    id: input.sceneId,
    placeId: input.placeId,
    introducedTurnId: input.turnId,
    ...(input.title?.trim() ? { title: input.title.trim().slice(0, 120) } : {}),
  };
  scenes.push(created);
  return { scenes, scene: created };
}
