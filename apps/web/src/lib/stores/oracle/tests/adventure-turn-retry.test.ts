import { describe, expect, it, vi } from "vitest";
import {
  AdventureTurnRejectedError,
  generateAcceptedTurn,
  TURN_REJECTED_COPY,
  turnErrorCopy,
} from "../adventure-turn-retry";

const live = () => new AbortController().signal;

describe("generateAcceptedTurn", () => {
  it("accepts the first reply without asking again", async () => {
    const generate = vi.fn(async () => "reply");
    const reset = vi.fn();
    const result = await generateAcceptedTurn({
      generate,
      apply: (reply) => `${reply}!`,
      signal: live(),
      resetProviderContext: reset,
    });
    expect(result).toBe("reply!");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });

  it("asks once more with the reason when the engine refuses, after resetting the provider thread", async () => {
    const calls: Array<string | undefined> = [];
    const order: string[] = [];
    const result = await generateAcceptedTurn({
      generate: async (correction) => {
        calls.push(correction);
        order.push("generate");
        return calls.length === 1 ? "bad" : "good";
      },
      apply: (reply) => {
        if (reply === "bad") throw new Error("leaked a secret");
        return reply;
      },
      signal: live(),
      resetProviderContext: () => {
        order.push("reset");
      },
    });
    expect(result).toBe("good");
    expect(calls).toEqual([undefined, "leaked a secret"]);
    expect(order).toEqual(["generate", "reset", "generate"]);
  });

  it("gives up after one retry with a plain refusal that keeps the reason", async () => {
    const generate = vi.fn(async () => "bad");
    const failure = generateAcceptedTurn({
      generate,
      apply: () => {
        throw new Error("still leaking");
      },
      signal: live(),
      resetProviderContext: () => {},
    });
    await expect(failure).rejects.toBeInstanceOf(AdventureTurnRejectedError);
    await expect(failure).rejects.toMatchObject({ reason: "still leaking" });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("does not retry a generation failure", async () => {
    const generate = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      generateAcceptedTurn({
        generate,
        apply: (x: string) => x,
        signal: live(),
        resetProviderContext: () => {},
      }),
    ).rejects.toThrow("offline");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("does not retry a cancelled turn", async () => {
    const controller = new AbortController();
    const generate = vi.fn(async () => "bad");
    await expect(
      generateAcceptedTurn({
        generate,
        apply: () => {
          controller.abort();
          throw new Error("refused");
        },
        signal: controller.signal,
        resetProviderContext: () => {},
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("still retries when resetting the provider thread fails", async () => {
    let calls = 0;
    const result = await generateAcceptedTurn({
      generate: async () => (++calls === 1 ? "bad" : "good"),
      apply: (reply) => {
        if (reply === "bad") throw new Error("refused");
        return reply;
      },
      signal: live(),
      resetProviderContext: async () => {
        throw new Error("reset failed");
      },
    });
    expect(result).toBe("good");
  });
});

describe("turnErrorCopy", () => {
  it("shows plain copy, never the engine's reason, for a refused turn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const copy = turnErrorCopy(
      new AdventureTurnRejectedError("hidden info"),
      "turn-rejected",
    );
    expect(copy).toBe(TURN_REJECTED_COPY);
    expect(copy).not.toContain("hidden");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("leaves other failures as they were", () => {
    expect(turnErrorCopy(new Error("offline"), "offline")).toBe("offline");
  });
});
