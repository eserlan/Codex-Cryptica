import { describe, expect, it } from "vitest";
import {
  collectAdventureStream,
  createNarrationPreviewPublisher,
  extractAdventureNarrationPrefix,
  extractSafeNarrationState,
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

  it("extracts progressive narration only after hiddenPatch is complete and buffers if narration comes first", () => {
    // Non-compliant order: narration before hiddenPatch must buffer.
    expect(
      extractSafeNarrationState(
        '{"kind":"complete","narration":"Unsafe prefix',
      ),
    ).toMatchObject({ ready: false, narration: "" });

    // Metadata-first order: narration streams progressively once hiddenPatch closes.
    const hiddenPatch =
      '{"secrets":{"add":[],"update":[],"removeIds":[]},"gmThreads":{"add":[],"update":[],"removeIds":[]}}';
    expect(
      extractSafeNarrationState(
        `{"kind":"complete","hiddenPatch":${hiddenPatch},"narration":"A\\nroad\\u0021`,
      ),
    ).toMatchObject({ ready: true, narration: "A\nroad!" });

    // Incomplete escape sequence at end of chunk is withheld until completed.
    expect(
      extractSafeNarrationState(
        `{"kind":"complete","hiddenPatch":${hiddenPatch},"narration":"A\\u00`,
      ),
    ).toMatchObject({ ready: true, narration: "A" });

    // Roll-required streams setupNarration once kind is parsed.
    expect(
      extractSafeNarrationState(
        '{"kind":"roll-required","setupNarration":"The ledge',
      ),
    ).toMatchObject({ ready: true, narration: "The ledge" });
  });

  it("screens progressive previews against same-turn hiddenPatch secrets and allows authorised reveals", () => {
    const secret = "Lady Mirella holds the ledger.";
    const previews: string[] = [];
    const publish = createNarrationPreviewPublisher({
      session,
      phase: "action",
      anchors: [],
      relevant: [],
      onNarration: (text) => previews.push(text),
    });

    const prefix = `{"kind":"complete","hiddenPatch":{"secrets":{"add":[{"text":"${secret}"}],"update":[],"removeIds":[]},"gmThreads":{"add":[],"update":[],"removeIds":[]}},"narration":"`;
    publish(`${prefix}A lantern flickers.`);
    publish(`${prefix}A lantern flickers. ${secret}`);
    publish(`${prefix}A lantern flickers. ${secret} More text.`);
    // Clean start published, then immediately withdrawn when secret appears.
    expect(previews).toEqual(["A lantern flickers.", ""]);

    // Authorised reveal of an existing session secret streams without suppression.
    const revealedPreviews: string[] = [];
    const publishRevealed = createNarrationPreviewPublisher({
      session: {
        ...session,
        hiddenState: {
          secrets: [{ id: "sec-1", text: secret, status: "hidden" }],
          gmThreads: [],
        },
      },
      phase: "action",
      anchors: [],
      relevant: [],
      onNarration: (text) => revealedPreviews.push(text),
    });
    const revealedPrefix = `{"kind":"complete","hiddenPatch":{"secrets":{"add":[],"update":[],"removeIds":[]},"gmThreads":{"add":[],"update":[],"removeIds":[]}},"revealSecretIds":["sec-1"],"narration":"`;
    publishRevealed(`${revealedPrefix}${secret}`);
    expect(revealedPreviews).toEqual([secret]);
  });
});
