import { describe, expect, it } from "bun:test";
import {
  MAX_SUGGESTION_LENGTH,
  suggestEffects,
  type SuggestRunner,
} from "../src/suggest";

const input = {
  profileSummary: "Based on Tundra. Terrain: black glass flats.",
  alteration: {
    id: "a1",
    aspect: "climate" as const,
    description: "It rains ash",
    cause: "",
    effects: [],
  },
};

const runnerReturning =
  (text: string): SuggestRunner =>
  async () =>
    text;

const good = JSON.stringify({
  suggestions: [
    { effect: "Rivers run grey", plausibilityNote: "Ash clouds water." },
    { effect: "Ferns spread", plausibilityNote: "Ash enriches soil." },
  ],
});

describe("suggestEffects", () => {
  it("returns validated suggestions", async () => {
    const result = await suggestEffects({ run: runnerReturning(good) }, input);
    expect(result).toEqual({
      ok: true,
      suggestions: [
        { effect: "Rivers run grey", plausibilityNote: "Ash clouds water." },
        { effect: "Ferns spread", plausibilityNote: "Ash enriches soil." },
      ],
    });
  });

  it("finds the JSON inside surrounding text or a code fence", async () => {
    const wrapped = "Sure!\n```json\n" + good + "\n```\nHope that helps.";
    expect(
      (await suggestEffects({ run: runnerReturning(wrapped) }, input)).ok,
    ).toBe(true);
  });

  it("keeps at most three suggestions", async () => {
    const many = JSON.stringify({
      suggestions: Array.from({ length: 6 }, (_, i) => ({
        effect: `Effect ${i}`,
        plausibilityNote: "n",
      })),
    });
    const result = await suggestEffects({ run: runnerReturning(many) }, input);
    expect(result.ok && result.suggestions).toHaveLength(3);
  });

  it("rejects text that is not JSON, JSON of the wrong shape, and an empty list", async () => {
    for (const text of [
      "no json here",
      '{"suggestions": "nope"}',
      '{"suggestions": []}',
      "{bad",
    ]) {
      expect(
        await suggestEffects({ run: runnerReturning(text) }, input),
      ).toEqual({
        ok: false,
        reason: "invalid-response",
      });
    }
  });

  it("drops entries with empty text rather than returning partial junk", async () => {
    const mixed = JSON.stringify({
      suggestions: [
        { effect: "", plausibilityNote: "n" },
        { effect: "Real effect", plausibilityNote: "Makes sense." },
      ],
    });
    const result = await suggestEffects({ run: runnerReturning(mixed) }, input);
    expect(result.ok && result.suggestions.map((s) => s.effect)).toEqual([
      "Real effect",
    ]);
  });

  it("reports a runner error without throwing", async () => {
    const result = await suggestEffects(
      {
        run: async () => {
          throw new Error("network");
        },
      },
      input,
    );
    expect(result).toEqual({ ok: false, reason: "runner-error" });
  });

  it("reports cancellation when the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      await suggestEffects(
        { run: runnerReturning(good) },
        input,
        controller.signal,
      ),
    ).toEqual({ ok: false, reason: "cancelled" });

    const during = new AbortController();
    const result = await suggestEffects(
      {
        run: async () => {
          during.abort();
          throw new DOMException("aborted", "AbortError");
        },
      },
      input,
      during.signal,
    );
    expect(result).toEqual({ ok: false, reason: "cancelled" });
  });

  it("does nothing when AI is not allowed", async () => {
    let called = false;
    const result = await suggestEffects(
      {
        isAllowed: () => false,
        run: async () => {
          called = true;
          return good;
        },
      },
      input,
    );
    expect(result).toEqual({ ok: false, reason: "disabled" });
    expect(called).toBe(false);
  });

  it("does not change the profile or the alteration it was given", async () => {
    const before = JSON.stringify(input);
    await suggestEffects({ run: runnerReturning(good) }, input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("sends the alteration and a summary, and asks for JSON", async () => {
    let seen = { system: "", user: "" };
    await suggestEffects(
      {
        run: async (request) => {
          seen = request;
          return good;
        },
      },
      input,
    );
    expect(seen.user).toContain("It rains ash");
    expect(seen.user).toContain("black glass flats");
    expect(seen.system.toLowerCase()).toContain("json");
  });

  it("drops an entry whose text is too long to be saved safely", async () => {
    const long = JSON.stringify({
      suggestions: [
        {
          effect: "x".repeat(MAX_SUGGESTION_LENGTH + 1),
          plausibilityNote: "n",
        },
        {
          effect: "Fine",
          plausibilityNote: "y".repeat(MAX_SUGGESTION_LENGTH + 1),
        },
        { effect: "x".repeat(MAX_SUGGESTION_LENGTH), plausibilityNote: "ok" },
      ],
    });
    const result = await suggestEffects({ run: runnerReturning(long) }, input);
    expect(result.ok && result.suggestions).toHaveLength(1);
    expect(result.ok && result.suggestions[0].effect).toHaveLength(
      MAX_SUGGESTION_LENGTH,
    );
  });

  it("rejects the whole answer when every entry is too long", async () => {
    const long = JSON.stringify({
      suggestions: [
        {
          effect: "x".repeat(MAX_SUGGESTION_LENGTH + 1),
          plausibilityNote: "n",
        },
      ],
    });
    expect(await suggestEffects({ run: runnerReturning(long) }, input)).toEqual(
      {
        ok: false,
        reason: "invalid-response",
      },
    );
  });
});
