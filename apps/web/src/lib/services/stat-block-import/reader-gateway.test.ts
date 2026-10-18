import { describe, expect, it, vi } from "vitest";
import type { AIGeneratorGateway } from "generator-engine";
import { createStatBlockReaderGateway } from "./reader-gateway";

function baseReturning(result: unknown) {
  const complete = vi.fn(async () => result as never);
  return { gateway: { complete } as unknown as AIGeneratorGateway, complete };
}

describe("createStatBlockReaderGateway", () => {
  it("makes a one-shot request: no interaction, so nothing is stored server-side", async () => {
    const { gateway, complete } = baseReturning("{}");
    const reader = createStatBlockReaderGateway(gateway);
    await reader.complete("prompt", "system", {
      generationConfig: { temperature: 0.1 },
    });
    const [, , options] = complete.mock.calls[0] as unknown as [
      string,
      string,
      { interaction?: unknown; generationConfig: unknown },
    ];
    expect(options).not.toHaveProperty("interaction");
    expect(options.generationConfig).toEqual({ temperature: 0.1 });
  });

  it("passes the abort signal through", async () => {
    const { gateway, complete } = baseReturning("{}");
    const controller = new AbortController();
    await createStatBlockReaderGateway(gateway).complete("p", "s", {
      generationConfig: {},
      signal: controller.signal,
    });
    const [, , options] = complete.mock.calls[0] as unknown as [
      string,
      string,
      { signal?: AbortSignal },
    ];
    expect(options.signal).toBe(controller.signal);
  });

  it("returns the text when the base gateway gives a result object", async () => {
    const { gateway } = baseReturning({
      text: '{"outcome":"ok"}',
      interactionId: "x",
    });
    const text = await createStatBlockReaderGateway(gateway).complete(
      "p",
      "s",
      {
        generationConfig: {},
      },
    );
    expect(text).toBe('{"outcome":"ok"}');
  });

  it("returns a plain string unchanged", async () => {
    const { gateway } = baseReturning('{"outcome":"ok"}');
    const text = await createStatBlockReaderGateway(gateway).complete(
      "p",
      "s",
      {
        generationConfig: {},
      },
    );
    expect(text).toBe('{"outcome":"ok"}');
  });
});
