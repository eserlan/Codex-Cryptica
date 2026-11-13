import { describe, expect, it, vi } from "vitest";

import {
  generateGenericWithAI,
  withNameSuggestion,
} from "./campaign-generic-generation";
import { MAX_AI_ATTEMPTS } from "./campaign-generator-service-core";

const reply = (title: string) =>
  JSON.stringify({ title, summary: "s", lore: "l", content: "c" });

const generator = {
  buildPrompt: () => "the prompt",
  mapOutputToDraft: (output: any) => ({ title: output.title }),
} as any;

const request = { generatorId: "npc" } as any;

function makeCtx(responses: string[]) {
  const complete = vi.fn();
  for (const r of responses) complete.mockResolvedValueOnce(r);
  complete.mockResolvedValue(responses.at(-1) ?? "");
  const onPromptMetrics = vi.fn();
  return {
    complete,
    onPromptMetrics,
    ctx: { gateway: { complete }, deps: {}, onPromptMetrics } as any,
  };
}

describe("withNameSuggestion", () => {
  it("returns the request unchanged when no name is wanted, without calling the gateway", async () => {
    const complete = vi.fn();
    expect(await withNameSuggestion({ complete } as any, request)).toBe(
      request,
    );
    expect(complete).not.toHaveBeenCalled();
  });
});

describe("generateGenericWithAI", () => {
  it("returns the draft and reports prompt metrics", async () => {
    const { ctx, onPromptMetrics } = makeCtx([reply("Mara")]);
    const draft = await generateGenericWithAI(
      ctx,
      generator,
      request,
      new Set(),
    );

    expect(draft).toEqual({ title: "Mara" });
    expect(onPromptMetrics).toHaveBeenCalledOnce();
  });

  it("asks again when the title is already taken", async () => {
    const { ctx, complete } = makeCtx([reply("Mara"), reply("Orin")]);
    const draft = await generateGenericWithAI(
      ctx,
      generator,
      request,
      new Set(["mara"]),
    );

    expect(draft).toEqual({ title: "Orin" });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("gives up after the attempt limit when every title is taken", async () => {
    const { ctx, complete, onPromptMetrics } = makeCtx([reply("Mara")]);
    const draft = await generateGenericWithAI(
      ctx,
      generator,
      request,
      new Set(["mara"]),
    );

    expect(draft).toBeNull();
    expect(complete).toHaveBeenCalledTimes(MAX_AI_ATTEMPTS);
    expect(onPromptMetrics).not.toHaveBeenCalled();
  });

  it("stops at once on a response it cannot read", async () => {
    const { ctx, complete } = makeCtx(["not json"]);
    expect(
      await generateGenericWithAI(ctx, generator, request, new Set()),
    ).toBeNull();
    expect(complete).toHaveBeenCalledOnce();
  });

  it("stops when the gateway fails", async () => {
    const { ctx, complete } = makeCtx([]);
    complete.mockReset();
    complete.mockRejectedValue(new Error("offline"));
    expect(
      await generateGenericWithAI(ctx, generator, request, new Set()),
    ).toBeNull();
  });

  it("throws when already aborted, before calling the gateway", async () => {
    const { ctx, complete } = makeCtx([reply("Mara")]);
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateGenericWithAI(
        ctx,
        generator,
        request,
        new Set(),
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(complete).not.toHaveBeenCalled();
  });
});
