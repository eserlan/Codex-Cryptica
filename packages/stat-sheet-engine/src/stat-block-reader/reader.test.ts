import { describe, expect, it, vi, afterEach } from "vitest";
import {
  readStatBlockWithAi,
  STAT_BLOCK_GENERATION_CONFIG,
  STAT_BLOCK_READ_TIMEOUT_MS,
  type StatBlockReaderGateway,
} from "./reader";
import { StatBlockReadError, StatBlockSourceTooLongError } from "./errors";
import { AI_RESPONSES } from "./__fixtures__/ai-responses";
import { fixtureById } from "./__fixtures__/stat-blocks";

function gatewayReturning(text: string) {
  const complete = vi.fn<StatBlockReaderGateway["complete"]>(async () => text);
  return { complete } as StatBlockReaderGateway & { complete: typeof complete };
}

const request = (id: string) => ({
  source: fixtureById(id).source,
  mode: "copy" as const,
  reader: "ai" as const,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("readStatBlockWithAi", () => {
  it("calls the gateway once with transcription settings and returns the read result", async () => {
    const gateway = gatewayReturning(
      JSON.stringify(AI_RESPONSES["clean-hill-brute"]),
    );
    const result = await readStatBlockWithAi(
      request("clean-hill-brute"),
      gateway,
    );

    expect(gateway.complete).toHaveBeenCalledTimes(1);
    const [, , options] = gateway.complete.mock.calls[0]!;
    expect(options.generationConfig).toMatchObject({
      temperature: 0.1,
      responseMimeType: "application/json",
    });
    expect(options.generationConfig).toEqual(STAT_BLOCK_GENERATION_CONFIG);
    expect(result.values).toMatchObject({ ac: 13 });
  });

  it("sends the pasted source in the prompt only", async () => {
    const gateway = gatewayReturning(
      JSON.stringify(AI_RESPONSES["clean-hill-brute"]),
    );
    await readStatBlockWithAi(request("clean-hill-brute"), gateway);
    const [prompt, systemInstruction] = gateway.complete.mock.calls[0]!;
    expect(prompt).toContain("Greatclub");
    expect(systemInstruction).not.toContain("Greatclub");
  });

  it("strips Foundry noise before the source is sent", async () => {
    const gateway = gatewayReturning(
      JSON.stringify(AI_RESPONSES["foundry-hill-brute"]),
    );
    await readStatBlockWithAi(request("foundry-hill-brute"), gateway);
    const [prompt] = gateway.complete.mock.calls[0]!;
    expect(prompt).not.toContain("_stats");
    expect(prompt).not.toContain("prototypeToken");
  });

  it("refuses an over-limit source before calling the gateway", async () => {
    const gateway = gatewayReturning("{}");
    await expect(
      readStatBlockWithAi(
        { source: "a".repeat(12_001), mode: "copy", reader: "ai" },
        gateway,
      ),
    ).rejects.toBeInstanceOf(StatBlockSourceTooLongError);
    expect(gateway.complete).not.toHaveBeenCalled();
  });

  it("turns a gateway failure into a gateway read error", async () => {
    const gateway: StatBlockReaderGateway = {
      complete: async () => {
        throw new Error("proxy unavailable");
      },
    };
    const error = await readStatBlockWithAi(
      request("clean-hill-brute"),
      gateway,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StatBlockReadError);
    expect((error as StatBlockReadError).reason).toBe("gateway");
  });

  it("aborts after 30 seconds and reports a timeout", async () => {
    vi.useFakeTimers();
    const gateway: StatBlockReaderGateway = {
      complete: (_p, _s, options) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    };
    const pending = readStatBlockWithAi(
      request("clean-hill-brute"),
      gateway,
    ).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(STAT_BLOCK_READ_TIMEOUT_MS + 1);
    const error = await pending;
    expect(error).toBeInstanceOf(StatBlockReadError);
    expect((error as StatBlockReadError).reason).toBe("timeout");
  });

  it("passes the caller's abort signal through to the gateway", async () => {
    const outer = new AbortController();
    const gateway: StatBlockReaderGateway = {
      complete: (_p, _s, options) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    };
    const pending = readStatBlockWithAi(request("clean-hill-brute"), gateway, {
      signal: outer.signal,
    }).catch((e: unknown) => e);
    outer.abort();
    const error = await pending;
    expect(error).toBeInstanceOf(StatBlockReadError);
  });

  it("keeps a malformed reply as a malformed read error", async () => {
    const gateway = gatewayReturning("I could not find a stat block.");
    await expect(
      readStatBlockWithAi(request("clean-hill-brute"), gateway),
    ).rejects.toMatchObject({ reason: "malformed" });
  });
});
