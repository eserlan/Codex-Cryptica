import { describe, expect, it, vi } from "vitest";
import {
  describeCompletion,
  reportCompletion,
  stagedComplete,
  useStagedRoute,
  type AIRouteContext,
} from "./campaign-ai-route-context";

const request = (extra: Record<string, unknown> = {}) =>
  ({ generatorId: "npc", ...extra }) as any;

const interaction = { input: "thread follow-up", replayPrompt: "full replay" };

function makeCtx() {
  const onInteractionResult = vi.fn();
  const onPromptMetrics = vi.fn();
  const ctx = {
    gateway: { complete: vi.fn() },
    deps: {},
    onInteractionResult,
    onPromptMetrics,
  } as unknown as AIRouteContext;
  return { ctx, onInteractionResult, onPromptMetrics };
}

describe("describeCompletion", () => {
  it("treats a plain string as no interaction", () => {
    expect(describeCompletion("text")).toEqual({
      usedInteraction: false,
      replayed: false,
    });
  });

  it("keeps the result only when the gateway used the thread", () => {
    const used = { text: "t", usedInteraction: true, replayed: true } as any;
    expect(describeCompletion(used)).toEqual({
      interaction: used,
      usedInteraction: true,
      replayed: true,
    });

    const unused = { text: "t", usedInteraction: false } as any;
    expect(describeCompletion(unused).interaction).toBeUndefined();
  });
});

describe("reportCompletion", () => {
  it("reports the accepted interaction and a smaller sent prompt", () => {
    const { ctx, onInteractionResult, onPromptMetrics } = makeCtx();
    const accepted = { text: "t", usedInteraction: true } as any;

    reportCompletion(ctx, {
      request: request(),
      fullPrompt: "x".repeat(400),
      interaction,
      result: accepted,
      accepted,
    });

    expect(onInteractionResult).toHaveBeenCalledWith(accepted);
    expect(onPromptMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        generatorId: "npc",
        usedInteraction: true,
        fullPromptChars: 400,
        sentPromptChars: interaction.input.length,
      }),
    );
  });

  it("measures the replayed prompt when the thread was replayed", () => {
    const { ctx, onPromptMetrics } = makeCtx();
    reportCompletion(ctx, {
      request: request(),
      fullPrompt: "full",
      interaction,
      result: { text: "t", usedInteraction: true, replayed: true } as any,
    });
    expect(onPromptMetrics.mock.calls[0][0]).toMatchObject({
      replayed: true,
      sentPromptChars: interaction.replayPrompt.length,
    });
  });

  it("skips the interaction callback when none was accepted", () => {
    const { ctx, onInteractionResult, onPromptMetrics } = makeCtx();
    reportCompletion(ctx, {
      request: request(),
      fullPrompt: "full",
      interaction: undefined,
      result: "plain text",
    });
    expect(onInteractionResult).not.toHaveBeenCalled();
    expect(onPromptMetrics.mock.calls[0][0]).toMatchObject({
      usedInteraction: false,
      sentPromptChars: 4,
    });
  });

  it("does not need any callbacks", () => {
    const { ctx } = makeCtx();
    ctx.onPromptMetrics = undefined;
    ctx.onInteractionResult = undefined;
    expect(() =>
      reportCompletion(ctx, {
        request: request(),
        fullPrompt: "p",
        interaction: undefined,
        result: "t",
      }),
    ).not.toThrow();
  });
});

describe("useStagedRoute", () => {
  it("is on by default", () => {
    expect(useStagedRoute(request())).toBe(true);
    expect(useStagedRoute(request({ options: { staged: true } }))).toBe(true);
  });

  it("is off when switched off or when a continuity thread is in use", () => {
    expect(useStagedRoute(request({ options: { staged: false } }))).toBe(false);
    expect(useStagedRoute(request({ interaction }))).toBe(false);
  });
});

describe("stagedComplete", () => {
  it("passes the message first, the instruction second and the signal on", async () => {
    const complete = vi.fn().mockResolvedValue("answer");
    const signal = new AbortController().signal;

    const text = await stagedComplete({ complete } as any, signal)(
      "instruction",
      "message",
    );

    expect(text).toBe("answer");
    expect(complete).toHaveBeenCalledWith("message", "instruction", { signal });
  });
});
