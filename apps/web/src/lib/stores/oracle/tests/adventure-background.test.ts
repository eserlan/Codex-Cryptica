import { describe, expect, it, vi } from "vitest";
import { AdventureBackground } from "../adventure-background";
import { AdventureGroundingService } from "#lib/services/adventure/adventure-grounding-service.js";
import { createAdventureBackgroundRequest } from "#lib/services/adventure/adventure-background-request.js";
import { initialSession } from "../adventure-session";
import { now, startInput } from "./adventure-fixtures";

function setup() {
  let id = 0;
  const current = initialSession({
    ...startInput,
    now: "2026-11-03T12:00:00Z",
    idGenerator: () => `id-${++id}`,
  });
  current.worldEntry = {
    version: 1,
    location: { kind: "provisional", name: "Town" },
    at: { year: 618 },
    intent: "explore",
  };
  const context = {
    resolveAnchors: vi.fn(async () => []),
    resolveOpeningRelevant: vi.fn(async () => [
      {
        recordId: "past",
        displayName: "Old Treaty",
        content: "[Period applicability: historical] Treaty of 610.",
        lore: "Hidden motive",
        role: "turn-source" as const,
      },
    ]),
    resolveActionRelevant: vi.fn(async () => []),
  };
  const background = new AdventureBackground(
    () => `id-${++id}`,
    new AdventureGroundingService(context),
  );
  return { current, context, background };
}

describe("grounded background generation", () => {
  it("delivers prepared sources and period/session knowledge without broad generator context", async () => {
    const { current, context, background } = setup();
    const generator = vi.fn(async (session, _signal, grounding) => {
      const request = createAdventureBackgroundRequest(
        session,
        grounding,
        true,
        "fantasy",
      );
      expect(request.vaultContext?.currentDate).toBe("618");
      expect(request.vaultContext?.worldSample).toEqual([
        expect.objectContaining({ id: "past", loreExcerpt: "Hidden motive" }),
      ]);
      expect(request.vaultContext?.neighbors).toEqual([]);
      expect(request.interaction).toBeUndefined();
      expect(request.instructions).toContain("GM-only");
      throw new Error("optional-model-failure");
    });
    background.setGenerator(generator);
    const prepared = await background.prepare(current);
    expect(context.resolveOpeningRelevant).toHaveBeenCalledOnce();
    expect(generator).toHaveBeenCalledOnce();
    expect(prepared.scenarioCollection?.items).toHaveLength(3);
    expect(current.hiddenState.gmThreads).toEqual([]);
  });

  it("does not invoke the generator or silently seed fallback after a failed lookup", async () => {
    const { current, context, background } = setup();
    context.resolveOpeningRelevant.mockRejectedValue(
      new Error("secret storage error"),
    );
    const generator = vi.fn();
    background.setGenerator(generator);
    await expect(background.prepare(current)).rejects.toThrow(
      "Unable to load world context",
    );
    expect(generator).not.toHaveBeenCalled();
    expect(current.hiddenState.gmThreads).toEqual([]);
  });

  it("does not dispatch a background request after cancellation during retrieval", async () => {
    const { current, context, background } = setup();
    const controller = new AbortController();
    context.resolveOpeningRelevant.mockImplementation(async () => {
      controller.abort();
      return [];
    });
    const generator = vi.fn();
    background.setGenerator(generator);
    await expect(
      background.prepare(current, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generator).not.toHaveBeenCalled();
  });

  it("rejects a context from another session", async () => {
    const { current, context } = setup();
    const grounding = await new AdventureGroundingService(context).prepare({
      session: current,
      purpose: "background",
    });
    expect(() =>
      createAdventureBackgroundRequest(
        current,
        { ...grounding, sessionId: "other" },
        true,
      ),
    ).toThrow("invalid-background-context");
  });
});

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
    expect(prepared.scenarioCollection?.items).toHaveLength(3);
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
