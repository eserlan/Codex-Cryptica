import { describe, expect, it, vi } from "vitest";
import {
  generateAdventureWithAI,
  generateHeistWithAI,
  generateVillainWithAI,
} from "./campaign-staged-generation";

const generator = {
  buildPrompt: () => "prompt",
  mapOutputToDraft: (output: any) => ({ title: output.title }),
} as any;

const request = (generatorId: string, extra: Record<string, unknown> = {}) =>
  ({ generatorId, options: {}, ...extra }) as any;

function makeCtx(reply: string | Error) {
  const complete = vi.fn(async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  });
  return { complete, ctx: { gateway: { complete }, deps: {} } as any };
}

describe("generateAdventureWithAI", () => {
  it("falls back to the generic route when the staged route is unusable", async () => {
    const { ctx, complete } = makeCtx("not json");

    expect(
      await generateAdventureWithAI(
        ctx,
        generator,
        request("adventure"),
        new Set(),
      ),
    ).toBeNull();
    // The staged stage asked first, then the generic route asked again.
    expect(complete.mock.calls.length).toBeGreaterThan(1);
  });

  it("goes straight to the generic route when staging is switched off", async () => {
    const { ctx, complete } = makeCtx("not json");

    await generateAdventureWithAI(
      ctx,
      generator,
      request("adventure", { options: { staged: false } }),
      new Set(),
    );

    expect(complete).toHaveBeenCalledOnce();
  });

  it("goes straight to the generic route when a continuity thread is in use", async () => {
    const { ctx, complete } = makeCtx("not json");

    await generateAdventureWithAI(
      ctx,
      generator,
      request("adventure", { interaction: { input: "follow up" } }),
      new Set(),
    );

    expect(complete).toHaveBeenCalledOnce();
  });

  it("returns a draft from the generic route when it can read the answer", async () => {
    const { ctx } = makeCtx(
      JSON.stringify({ title: "Mara", summary: "s", lore: "l", content: "c" }),
    );

    const draft = await generateAdventureWithAI(
      ctx,
      generator,
      request("adventure", { options: { staged: false } }),
      new Set(),
    );

    expect(draft).toEqual({ title: "Mara" });
  });
});

describe("generateVillainWithAI", () => {
  it("stops with the abort instead of falling back once the run is aborted", async () => {
    const { ctx } = makeCtx(new Error("aborted"));
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateVillainWithAI(
        ctx,
        generator,
        request("villain"),
        new Set(),
        controller.signal,
      ),
    ).rejects.toThrow();
  });

  it("returns null when every route fails and nothing was aborted", async () => {
    const { ctx } = makeCtx(new Error("offline"));
    expect(
      await generateVillainWithAI(
        ctx,
        generator,
        request("villain"),
        new Set(),
      ),
    ).toBeNull();
  });
});

describe("generateHeistWithAI", () => {
  it("returns null when the staged and the one-pass heist routes both fail", async () => {
    const { ctx } = makeCtx(new Error("offline"));
    expect(
      await generateHeistWithAI(ctx, generator, request("heist")),
    ).toBeNull();
  });

  it("skips the staged route when staging is switched off", async () => {
    const { ctx, complete } = makeCtx(new Error("offline"));
    await generateHeistWithAI(
      ctx,
      generator,
      request("heist", { options: { staged: false } }),
    );
    // Only the one-pass route asks, so there is exactly one attempt or fewer.
    const staged = makeCtx(new Error("offline"));
    await generateHeistWithAI(staged.ctx, generator, request("heist"));
    expect(complete.mock.calls.length).toBeLessThan(
      staged.complete.mock.calls.length,
    );
  });
});
