import { describe, expect, it } from "vitest";
import {
  commitSceneTransition,
  MAX_ADVENTURE_SCENES,
} from "../src/scene-identities";
import type { AdventureScene } from "../src/scene-types";

describe("adventure scene identities", () => {
  it("creates an explicit scene tied to current place and turn", () => {
    const res = commitSceneTransition([], {
      sceneId: "scene-1",
      placeId: "place-harbour",
      turnId: "turn-1",
      title: "Midnight Dock",
    });
    expect(res.scene?.id).toBe("scene-1");
    expect(res.scene?.placeId).toBe("place-harbour");
    expect(res.scene?.introducedTurnId).toBe("turn-1");
  });

  it("does not allocate a scene for mood-only or missing place/turn inputs", () => {
    const missingPlace = commitSceneTransition([], {
      sceneId: "scene-1",
      placeId: "",
      turnId: "turn-1",
      moodOnly: true,
    });
    expect(missingPlace.scene).toBeNull();
    expect(missingPlace.scenes).toHaveLength(0);
  });

  it("enforces 200 scenes capacity without truncating existing scenes", () => {
    const full: AdventureScene[] = Array.from(
      { length: MAX_ADVENTURE_SCENES },
      (_, i) => ({
        id: `scene-${i}`,
        placeId: "place-1",
        introducedTurnId: `turn-${i}`,
      }),
    );
    const over = commitSceneTransition(full, {
      sceneId: "scene-201",
      placeId: "place-1",
      turnId: "turn-201",
    });
    expect(over.scenes).toHaveLength(MAX_ADVENTURE_SCENES);
    expect(over.scene).toBeNull();
    expect(over.reason).toBe("capacity");
  });
});
