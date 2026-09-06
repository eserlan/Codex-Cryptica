import { describe, expect, it, vi } from "vitest";
import { buildHeistPrompt, generateHeistLocal } from "./public-heist";
import { runHeistGeneration } from "./heist-generation";

const prompt = () => buildHeistPrompt({ heistType: "Rescue" }, "", () => 0.5);
const draft = () => generateHeistLocal({ heistType: "Rescue" }, () => 0.5);
const audit = (verdict: "clean" | "repair" = "repair") => ({
  verdict,
  fullScore: "Leave the site with the captive.",
  transitions: [
    {
      event: "The captive leaves the cell",
      stateBefore: "The captive is confined.",
      stateAfter: "The captive is travelling with the crew.",
      factsChanged: ["captive.location: cell -> with crew"],
    },
  ],
  issues:
    verdict === "repair"
      ? [
          {
            id: "state-1",
            sections: ["The Getaway", "GM Quick Reference"],
            problem: "The later sections still treat the captive as confined.",
            requiredFact: "The captive is travelling with the crew.",
          },
        ]
      : [],
});

describe("runHeistGeneration", () => {
  it("uses a fresh structured audit before applying a semantic repair", async () => {
    const initial = draft();
    const corrected = { ...initial, title: "The Corrected Rescue" };
    const generate = vi.fn().mockResolvedValue(JSON.stringify(initial));
    const review = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(audit()))
      .mockResolvedValueOnce(JSON.stringify(corrected));
    const result = await runHeistGeneration(prompt(), { generate, review });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(review).toHaveBeenCalledTimes(2);
    expect(review.mock.calls[0][0]).toContain("Do not rewrite it yet");
    expect(review.mock.calls[0][0]).toContain(JSON.stringify(initial.title));
    expect(review.mock.calls[0][0]).toContain(
      "At every transition, update the current facts",
    );
    expect(review.mock.calls[1][0]).toContain("state-1");
    expect(result.output.title).toBe(corrected.title);
    expect(result.audit?.issues).toHaveLength(1);
    expect(result.reviewStatus).toBe("accepted");
  });

  it("stops after the independent audit when the heist is clean", async () => {
    const initial = draft();
    const generate = vi.fn().mockResolvedValue(JSON.stringify(initial));
    const review = vi.fn().mockResolvedValue(JSON.stringify(audit("clean")));
    const result = await runHeistGeneration(prompt(), { generate, review });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(review).toHaveBeenCalledTimes(1);
    expect(result.output.title).toBe(initial.title);
    expect(result.reviewed).toBeUndefined();
    expect(result.reviewStatus).toBe("clean");
  });

  it.each([
    "not JSON",
    JSON.stringify({ verdict: "clean", fullScore: "Missing arrays" }),
  ])(
    "retains the original when the audit is unusable: %s",
    async (badAudit) => {
      const initial = draft();
      const result = await runHeistGeneration(prompt(), {
        generate: async () => JSON.stringify(initial),
        review: async () => badAudit,
      });
      expect(result.output.title).toBe(initial.title);
      expect(result.reviewStatus).toBe("failed");
      expect(result.reviewError).toBeTruthy();
    },
  );

  it("retains the original when repair output is unusable", async () => {
    const initial = draft();
    const review = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(audit()))
      .mockResolvedValueOnce("not JSON");
    const result = await runHeistGeneration(prompt(), {
      generate: async () => JSON.stringify(initial),
      review,
    });
    expect(result.output.title).toBe(initial.title);
    expect(result.reviewStatus).toBe("failed");
    expect(result.reviewError).toContain("JSON Parse error");
  });

  it("rejects a repair that drops required sections", async () => {
    const initial = draft();
    const review = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(audit()))
      .mockResolvedValueOnce(
        JSON.stringify({
          ...initial,
          content: "Only a sentence.",
          lore: "### The Getaway\nGone.",
        }),
      );
    const result = await runHeistGeneration(prompt(), {
      generate: async () => JSON.stringify(initial),
      review,
    });
    expect(result.output.content).toBe(initial.content);
    expect(result.reviewStatus).toBe("rejected");
  });

  it("keeps the original on an audit transport failure", async () => {
    const initial = draft();
    const result = await runHeistGeneration(prompt(), {
      generate: async () => JSON.stringify(initial),
      review: async () => {
        throw new Error("offline");
      },
    });
    expect(result.output.title).toBe(initial.title);
    expect(result.reviewStatus).toBe("failed");
    expect(result.reviewError).toBe("offline");
  });

  it("propagates initial failure so the caller can choose its local fallback", async () => {
    await expect(
      runHeistGeneration(prompt(), {
        generate: async () => "invalid",
        review: async () => JSON.stringify(audit("clean")),
      }),
    ).rejects.toThrow();
  });

  it("does not start audit after cancellation", async () => {
    const controller = new AbortController();
    const generate = vi.fn(async () => {
      controller.abort();
      return JSON.stringify(draft());
    });
    const review = vi.fn();
    await expect(
      runHeistGeneration(
        prompt(),
        { generate, review },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(review).not.toHaveBeenCalled();
  });

  it("does not return a draft when cancelled during audit", async () => {
    const controller = new AbortController();
    await expect(
      runHeistGeneration(
        prompt(),
        {
          generate: async () => JSON.stringify(draft()),
          review: async () => {
            controller.abort();
            return JSON.stringify(audit("clean"));
          },
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not return a draft when cancelled during repair", async () => {
    const controller = new AbortController();
    const review = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(audit()))
      .mockImplementationOnce(async () => {
        controller.abort();
        return JSON.stringify(draft());
      });
    await expect(
      runHeistGeneration(
        prompt(),
        {
          generate: async () => JSON.stringify(draft()),
          review,
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(review).toHaveBeenCalledTimes(2);
  });
});
