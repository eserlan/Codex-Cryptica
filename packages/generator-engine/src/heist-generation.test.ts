import { describe, expect, it, vi } from "vitest";
import { buildHeistPrompt, generateHeistLocal } from "./public-heist";
import { runHeistGeneration } from "./heist-generation";

const prompt = () => buildHeistPrompt({ heistType: "Rescue" }, "", () => 0.5);
const draft = () => generateHeistLocal({ heistType: "Rescue" }, () => 0.5);

describe("runHeistGeneration", () => {
  it("reviews structurally valid drafts and keeps semantic-only corrections", async () => {
    const initial = draft();
    const corrected = { ...initial, title: "The Corrected Rescue" };
    const send = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(initial))
      .mockResolvedValueOnce(JSON.stringify(corrected));
    const result = await runHeistGeneration(prompt(), send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toContain(
      "silently reconstruct its sequence of states",
    );
    expect(result.output.title).toBe(corrected.title);
    expect(result.reviewStatus).toBe("accepted");
  });

  it.each([
    "not JSON",
    JSON.stringify({ title: "Empty", content: "", lore: "" }),
  ])("retains the original when review is unusable: %s", async (repair) => {
    const initial = draft();
    const send = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(initial))
      .mockResolvedValueOnce(repair);
    const result = await runHeistGeneration(prompt(), send);
    expect(result.output.title).toBe(initial.title);
    expect(result.reviewStatus).toBe("failed");
  });

  it("rejects a review that drops required sections", async () => {
    const initial = draft();
    const send = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(initial))
      .mockResolvedValueOnce(
        JSON.stringify({
          ...initial,
          content: "Only a sentence.",
          lore: "### The Getaway\nGone.",
        }),
      );
    const result = await runHeistGeneration(prompt(), send);
    expect(result.output.content).toBe(initial.content);
    expect(result.reviewStatus).toBe("rejected");
  });

  it("keeps the original on a review transport failure", async () => {
    const initial = draft();
    const send = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(initial))
      .mockRejectedValueOnce(new Error("offline"));
    expect((await runHeistGeneration(prompt(), send)).output.title).toBe(
      initial.title,
    );
  });

  it("propagates initial failure so the caller can choose its local fallback", async () => {
    await expect(
      runHeistGeneration(prompt(), async () => "invalid"),
    ).rejects.toThrow();
  });

  it("does not start review after cancellation", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => {
      controller.abort();
      return JSON.stringify(draft());
    });
    await expect(
      runHeistGeneration(prompt(), send, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not return a draft when cancelled during review", async () => {
    const controller = new AbortController();
    const send = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(draft()))
      .mockImplementationOnce(async () => {
        controller.abort();
        return JSON.stringify(draft());
      });
    await expect(
      runHeistGeneration(prompt(), send, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
