import { describe, expect, it, vi } from "vitest";
import type { Token } from "../../../types/vtt";
import { MapMoveCoordinator } from "./map-move-coordinator";

function token(x: number): Token {
  return {
    id: "party",
    x,
    y: 0,
    width: 20,
    height: 20,
    isVisionSource: true,
  } as Token;
}

describe("MapMoveCoordinator", () => {
  it("deduplicates repeated settled poses and records a later return as a new move", async () => {
    const completeObservedMove = vi.fn(async (_tokens: readonly Token[]) => {});
    const coordinator = new MapMoveCoordinator({ completeObservedMove });

    await coordinator.settleObserved([token(0)]);
    await coordinator.settleObserved([token(20)]);
    await coordinator.settleObserved([token(20)]);
    await coordinator.settleObserved([token(0)]);
    await coordinator.settleObserved([token(20)]);

    expect(
      completeObservedMove.mock.calls.map(([tokens]) => tokens[0]?.x),
    ).toEqual([0, 20, 0, 20]);
  });

  it("snapshots the settled pose before queued work can observe later mutations", async () => {
    let release!: () => void;
    const seen: number[] = [];
    const coordinator = new MapMoveCoordinator({
      completeObservedMove: async (tokens) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        seen.push(tokens[0]!.x);
      },
    });
    const mutable = token(10);
    const pending = coordinator.settleObserved([mutable]);
    mutable.x = 90;
    await Promise.resolve();
    release();
    await pending;
    expect(seen).toEqual([10]);
  });

  it("drops queued completions when the map scope changes", async () => {
    let scope: string | null = "vault-1:map-1";
    const completeObservedMove = vi.fn(async (_tokens: readonly Token[]) => {});
    const coordinator = new MapMoveCoordinator({
      completeObservedMove,
      getScope: () => scope,
    });
    const pending = coordinator.settleObserved([token(10)]);
    scope = "vault-2:map-1";
    await pending;
    expect(completeObservedMove).not.toHaveBeenCalled();
    await coordinator.settleObserved([token(10)]);
    expect(completeObservedMove).toHaveBeenCalledTimes(1);
  });

  it("gives a journey step exclusive completion and refuses concurrent steps", async () => {
    let releaseMove!: (value: Token) => void;
    const move = vi.fn(
      () =>
        new Promise<Token>((resolve) => {
          releaseMove = resolve;
        }),
    );
    const complete = vi.fn(async () => {});
    const completeObservedMove = vi.fn(async () => {});
    const coordinator = new MapMoveCoordinator({ completeObservedMove });
    await coordinator.settleObserved([token(0)]);
    completeObservedMove.mockClear();

    const running = coordinator.moveJourneyStep("party", token(0), {
      move,
      complete,
    });
    expect(
      await coordinator.moveJourneyStep("party", token(0), {
        move: vi.fn(async () => token(40)),
        complete,
      }),
    ).toEqual({ ok: false, reason: "busy" });
    await coordinator.settleObserved([token(20)]);
    releaseMove(token(20));
    expect(await running).toMatchObject({ ok: true, after: { x: 20 } });
    await coordinator.settleObserved([token(20)]);

    expect(completeObservedMove).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
  });

  it("keeps the journey before-pose when the token store mutates in place", async () => {
    const completeObservedMove = vi.fn(async () => {});
    const coordinator = new MapMoveCoordinator({ completeObservedMove });
    const mutable = token(0);
    const complete = vi.fn(async () => {});

    const result = await coordinator.moveJourneyStep("party", mutable, {
      move: async () => {
        mutable.x = 20;
        return mutable;
      },
      complete,
    });

    expect(result).toMatchObject({
      ok: true,
      before: { x: 0 },
      after: { x: 20 },
    });
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ x: 0 }),
      expect.objectContaining({ x: 20 }),
    );
  });

  it("releases ownership when movement or completion fails", async () => {
    const completeObservedMove = vi.fn(async () => {});
    const coordinator = new MapMoveCoordinator({ completeObservedMove });
    const before = token(0);
    await expect(
      coordinator.moveJourneyStep("party", before, {
        move: async () => token(20),
        complete: async () => {
          throw new Error("settle failed");
        },
      }),
    ).rejects.toThrow("settle failed");

    await expect(
      coordinator.moveJourneyStep("party", before, {
        move: async () => null,
        complete: async () => {},
      }),
    ).resolves.toEqual({ ok: false, reason: "move-refused" });
  });
});
