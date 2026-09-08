import { describe, expect, it, vi } from "vitest";
import { GeneratorRefinementService } from "./GeneratorRefinementService.svelte";

const source = {
  id: "source-1",
  type: "character",
  title: "Mara Venn",
  summary: "A courier",
  content: "Mara crosses the flood districts.",
  lore: "She owes the guild a favour.",
  labels: ["courier"],
  status: "draft" as const,
};

describe("GeneratorRefinementService", () => {
  it("runs a refinement and accepts it without mutating the source object", async () => {
    const runner = vi.fn().mockResolvedValue({
      content: "Mara crosses the flood districts at dawn.",
    });
    const service = new GeneratorRefinementService(runner);
    service.start(source);

    const proposal = await service.refine("Make the timing more vivid");

    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({ content: source.content }),
      "Make the timing more vivid",
    );
    expect(proposal?.content).toContain("at dawn");
    expect(service.accept()).toMatchObject({
      content: expect.stringContaining("at dawn"),
    });
    expect(service.source).toBeNull();
    expect(source.content).toBe("Mara crosses the flood districts.");
  });

  it("uses the latest proposal on a repeated pass", async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce({ content: "Mara crosses the districts at dawn." })
      .mockResolvedValueOnce({
        content: "Mara crosses them before the bells.",
      });
    const service = new GeneratorRefinementService(runner);
    service.start(source);

    await service.refine("Set it at dawn");
    await service.refineAgain("Add an urgent deadline");

    expect(runner.mock.calls[1]?.[0].content).toContain("at dawn");
    expect(service.iteration).toBe(2);
  });

  it("keeps the previous proposal and exposes failures", async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce({ content: "First revision" })
      .mockRejectedValueOnce(new Error("provider unavailable"));
    const service = new GeneratorRefinementService(runner);
    service.start(source);
    await service.refine("First");
    const failed = await service.refine("Second");

    expect(failed).toBeNull();
    expect(service.proposal?.content).toBe("First revision");
    expect(service.error).toBe("provider unavailable");
    service.cancel();
    expect(service.source).toBeNull();
  });

  it("rejects empty instructions without calling the runner", async () => {
    const runner = vi.fn();
    const service = new GeneratorRefinementService(runner);
    service.start(source);
    expect(await service.refine("  ")).toBeNull();
    expect(runner).not.toHaveBeenCalled();
    expect(service.error).toContain("Tell the editor");
  });

  it("discards a response that finishes after cancellation", async () => {
    let resolveRunner!: (value: { content: string }) => void;
    const runner = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => (resolveRunner = resolve)),
      );
    const service = new GeneratorRefinementService(runner);
    service.start(source);
    const pending = service.refine("Make it urgent");
    service.cancel();
    resolveRunner({ content: "Stale response" });

    expect(await pending).toBeNull();
    expect(service.source).toBeNull();
    expect(service.proposal).toBeNull();
  });
});
