import { describe, expect, it } from "vitest";
import {
  collectAdventureStream,
  extractAdventureNarrationPrefix,
  publishAdventureNarration,
  streamAborted,
} from "./adventure-narration-stream";
import { session } from "./adventure-generation.test-fixtures";

describe("adventure narration streaming", () => {
  it("decodes escapes, bounds previews, and refuses private or nested JSON", () => {
    expect(
      extractAdventureNarrationPrefix(
        '{"kind":"complete","narration":"A\\nroad\\u0021',
      ),
    ).toBe("A\nroad!");
    expect(
      extractAdventureNarrationPrefix(
        '{"kind":"roll-required","setupNarration":"' + "x".repeat(2100),
      ),
    ).toHaveLength(2000);
    for (const prefix of [
      '{"hiddenPatch":{"narration":"secret',
      '{"kind":"complete","hiddenPatch":{},"narration":"secret',
    ]) {
      expect(extractAdventureNarrationPrefix(prefix)).toBe("");
    }
  });

  it("publishes safe text and suppresses unrevealed secrets and cancelled previews", () => {
    const previews: string[] = [];
    const request = {
      session: {
        ...session,
        hiddenState: {
          secrets: [
            {
              id: "secret",
              text: "The miller hid the grain beneath the waterwheel.",
              status: "hidden" as const,
            },
          ],
          gmThreads: [],
        },
      },
      phase: "action" as const,
      anchors: [],
      relevant: [],
      onNarration: (text: string) => previews.push(text),
    };
    publishAdventureNarration(
      request,
      '{"kind":"complete","narration":"A road',
    );
    publishAdventureNarration(
      request,
      '{"kind":"complete","narration":"The miller hid the grain beneath the waterwheel.',
    );
    publishAdventureNarration(
      request,
      '{"kind":"complete","narration":"Cancelled',
      AbortSignal.abort(),
    );
    expect(previews).toEqual(["A road"]);
  });

  it("collects event deltas and uses the completed response when supplied", async () => {
    const previews: string[] = [];
    async function* events() {
      yield { type: "started" as const };
      yield { type: "delta" as const, text: "partial" };
      yield { type: "complete" as const, text: "final" };
    }
    expect(
      await collectAdventureStream(events(), (text) => previews.push(text)),
    ).toBe("final");
    expect(previews).toEqual(["", "partial", "final"]);
  });

  it("collects SDK chunks and falls back to chunks when the response is empty", async () => {
    async function* chunks() {
      yield { text: () => "one" };
      yield { text: () => "two" };
    }
    for (const final of ["", "final"]) {
      const previews: string[] = [];
      expect(
        await collectAdventureStream(
          {
            stream: chunks(),
            response: Promise.resolve({ text: () => final }),
          },
          (text) => previews.push(text),
        ),
      ).toBe(final || "onetwo");
      expect(previews).toEqual(["one", "onetwo"]);
    }
  });

  it("propagates provider errors and cancellation", async () => {
    async function* errors() {
      yield { type: "error" as const, error: "provider-failed" };
    }
    await expect(collectAdventureStream(errors(), () => {})).rejects.toThrow(
      "provider-failed",
    );
    expect(() => streamAborted(AbortSignal.abort())).toThrow("Cancelled");
    async function* chunks() {
      yield { text: () => "ignored" };
    }
    await expect(
      collectAdventureStream(
        {
          stream: chunks(),
          response: Promise.resolve({ text: () => "ignored" }),
        },
        () => {},
        AbortSignal.abort(),
      ),
    ).rejects.toThrow("Cancelled");
  });
});
