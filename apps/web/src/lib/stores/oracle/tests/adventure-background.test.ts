import { describe, expect, it, vi } from "vitest";
import { AdventureBackground } from "../adventure-background";
import { initialSession } from "../adventure-session";
import { now, startInput } from "./adventure-fixtures";

function session(worldEntry = true) {
  let id = 0;
  return initialSession({
    ...startInput,
    now,
    idGenerator: () => String(++id),
    ...(worldEntry
      ? {
          worldEntry: {
            version: 1 as const,
            location: { kind: "provisional" as const, name: "Northbrook" },
            intent: "explore" as const,
          },
        }
      : {}),
  });
}

describe("AdventureBackground", () => {
  it("leaves ordinary sessions untouched without calling the generator", async () => {
    const background = new AdventureBackground(() => "id");
    const generate = vi.fn();
    background.setGenerator(generate);
    const original = session(false);
    expect(await background.prepare(original)).toBe(original);
    expect(generate).not.toHaveBeenCalled();
  });

  it("seeds deterministic background after optional generation fails", async () => {
    let id = 0;
    const background = new AdventureBackground(() => String(++id));
    background.setGenerator(async () => {
      throw new Error("offline");
    });
    const original = session();
    const prepared = await background.prepare(original);
    expect(prepared.hiddenState.gmThreads).toHaveLength(3);
    expect(original.hiddenState.gmThreads).toHaveLength(0);
  });

  it("propagates cancellation instead of seeding a fallback", async () => {
    const background = new AdventureBackground(() => "id");
    const controller = new AbortController();
    const reason = new DOMException("Cancelled", "AbortError");
    background.setGenerator(async () => {
      controller.abort(reason);
      throw reason;
    });
    await expect(background.prepare(session(), controller.signal)).rejects.toBe(
      reason,
    );
  });
});
