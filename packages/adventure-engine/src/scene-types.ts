export interface AdventureScene {
  id: string;
  placeId: string;
  introducedTurnId: string;
  endedTurnId?: string;
  title?: string;
}

export interface SceneTransitionInput {
  sceneId?: string;
  placeId: string;
  turnId: string;
  title?: string;
  moodOnly?: boolean;
}

export interface SceneTransitionResult {
  scenes: AdventureScene[];
  scene: AdventureScene | null;
  reason?: "invalid" | "capacity";
}
