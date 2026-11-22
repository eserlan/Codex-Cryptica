import { afterEach, describe, expect, it } from "vitest";
import { packageRefFor, rollProposal } from "./adventure-fixtures";
import { canaryReferencePackage, canarySecretText } from "./gm-canary-fixture";
import { createPlay, turn } from "./gm-play-support";

const ENDING_TITLE = "Ending: The Mill Turns";

describe("scripted package playthrough", () => {
  let play: ReturnType<typeof createPlay>;
  afterEach(() => play?.stop());

  it("plays to the authored ending, survives a reload and never leaks", async () => {
    play = createPlay(canaryReferencePackage);
    const pin = packageRefFor(canaryReferencePackage);
    let checks = 0;
    const clean = async (label: string) => {
      await play.checkPlayerOutputs(label);
      checks += 1;
    };

    play.queue.push(
      turn("Mist lies over the ferry landing.", {
        fact: {
          name: "Maren Holt the dockhand",
          summary: "She waits at the jetty with a lantern.",
        },
      }),
    );
    await play.start();
    expect(play.guarded.length).toBeGreaterThan(10);
    await clean("opening");

    const act = async (action: string, ...proposals: unknown[]) => {
      play.queue.push(...proposals);
      await play.manager.submitAction(action);
      expect(play.manager.errorMessage).toBeNull();
      await clean(action);
    };

    await act(
      "Walk to the mill yard",
      turn("You reach the mill yard.", { sceneId: "ros-scene-2-yard" }),
    );
    await act("Look around", turn("Barrels crowd the cobbles."));
    await act(
      "Enter the wheel room",
      turn("The great wheel looms in the dark.", {
        sceneId: "ros-scene-3-wheel-room",
      }),
    );
    expect(play.session.packageProgress?.sceneId).toBe(
      "ros-scene-3-wheel-room",
    );

    const before = play.manager;
    await play.reload();
    expect(play.manager).not.toBe(before);
    expect(play.session.sourcePackage).toEqual(pin);
    await clean("after reload");

    await act(
      "Check the axle",
      turn("Something scratches in the walls.", {
        secret: canarySecretText,
      }),
    );
    for (let i = 0; i < 10; i += 1) await act(`Search the room (${i})`);

    // A roll-required turn, rolled through the stubbed dice.
    play.queue.push(rollProposal);
    await play.manager.submitAction("Force the sluice gate");
    await clean("roll required");
    await play.manager.rollCodexDice();
    expect(play.manager.lastRollResult).toBe("1d20 = 12");
    await clean("roll resolved");

    await act(
      "Descend to the cellar",
      turn("Cold water laps the cellar steps.", {
        sceneId: "ros-scene-4-cellar",
      }),
    );
    await act("Throw the lever", turn(`The wheel groans. ${ENDING_TITLE}.`));

    const session = play.session;
    expect(session.turns.length).toBeGreaterThanOrEqual(17);
    expect(session.packageProgress?.sceneId).toBe("ros-scene-4-cellar");
    expect(session.turns.at(-1)!.narration).toContain(ENDING_TITLE);
    expect(session.hiddenState.secrets.map((s) => s.text)).toContain(
      canarySecretText,
    );
    expect(session.sourcePackage).toEqual(pin);
    expect(play.requests.length).toBeGreaterThan(0);
    // One check per committed turn, plus the reload and the roll checkpoints.
    expect(checks).toBeGreaterThanOrEqual(session.turns.length);
  });
});
