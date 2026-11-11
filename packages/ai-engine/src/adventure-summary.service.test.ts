import { describe, expect, it } from "vitest";
import { AdventureSummaryService } from "./adventure-summary.service";

if (typeof navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    writable: true,
  });
}

const request = {
  previous: "Old notes.",
  turns: [{ sequence: 3, player: "Ask Orra", gm: "Orra answers." }],
  throughSequence: 3,
};

function service(text: string | (() => string), seen: { input?: any } = {}) {
  return new AdventureSummaryService({
    async getModel(_key, _model, instruction) {
      seen.input = { instruction };
      return {
        async generateContent(input: any, options?: any) {
          seen.input = { ...seen.input, input, options };
          return {
            response: { text: typeof text === "function" ? text : () => text },
          };
        },
      };
    },
  });
}

describe("adventure summary service", () => {
  it("sends only the old notes and the new turns, and returns the notes", async () => {
    const seen: { input?: any } = {};
    const result = await service("  The party met Orra.  ", seen).summarize(
      request,
    );
    expect(result).toEqual({ text: "The party met Orra.", throughSequence: 3 });
    const sent = JSON.parse(seen.input.input.contents[0].parts[0].text);
    expect(sent).toEqual({
      previousNotes: "Old notes.",
      newTurns: request.turns,
    });
    expect(seen.input.instruction).toContain("Never add facts");
  });

  it("unwraps a code fence and cuts an over-long answer at a sentence end", async () => {
    expect(
      (await service("```text\nNotes here.\n```").summarize(request)).text,
    ).toBe("Notes here.");
    const long = `${"A sentence that is fairly long. ".repeat(60)}`;
    const cut = (await service(long).summarize(request)).text;
    expect(cut.length).toBeLessThanOrEqual(1_500);
    expect(cut.endsWith(".")).toBe(true);
  });

  it("fails on an empty answer, so nothing is saved", async () => {
    await expect(service("  \n ").summarize(request)).rejects.toThrow(
      "empty-story-summary",
    );
  });

  it("does not call the model when already cancelled, and passes the signal on", async () => {
    const controller = new AbortController();
    controller.abort();
    const seen: { input?: any } = {};
    await expect(
      service("Notes.", seen).summarize(request, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(seen.input).toBeUndefined();
    const live = new AbortController();
    await service("Notes.", seen).summarize(request, { signal: live.signal });
    expect(seen.input.options.signal).toBe(live.signal);
  });

  it("discards the answer if the player cancels while it is in flight", async () => {
    const controller = new AbortController();
    await expect(
      service(() => {
        controller.abort();
        return "Notes.";
      }).summarize(request, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports offline without calling the model", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
    try {
      await expect(service("Notes.").summarize(request)).rejects.toThrow(
        "offline",
      );
    } finally {
      if (original) Object.defineProperty(globalThis, "navigator", original);
    }
  });
});
