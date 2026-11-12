import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateViaProxy } from "./proxy-generation";

const request = {
  proxyUrl: "https://proxy.test",
  modelName: "legacy-model",
  contents: [{ role: "user", parts: [{ text: "hello" }] }],
  generationConfig: {},
  finalSysInst: undefined,
  isPlainTextRequest: true,
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("buffered proxy generation", () => {
  it.each(["hello", { result: "hello" }, undefined, null])(
    "adapts operation content %j to SDK text and candidates",
    async (content) => {
      const doFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ content, modelKey: "resolved-model" }),
        );
      const result = await generateViaProxy({ ...request, doFetch });
      const expected =
        typeof content === "string"
          ? content
          : content === undefined
            ? ""
            : JSON.stringify(content);
      expect(result.response.text()).toBe(expected);
      expect(result.response.candidates).toEqual([
        { content: { parts: [{ text: expected }] } },
      ]);
      expect(result.rawResponse.modelKey).toBe("resolved-model");
      expect(console.log).toHaveBeenCalledWith(
        "[OracleProxy] Resolved model: resolved-model",
      );
      expect(
        JSON.parse(doFetch.mock.calls[0][1]!.body as string),
      ).not.toHaveProperty("model");
    },
  );

  it("retains image data, all candidates and multiple text parts in legacy responses", async () => {
    const data = {
      candidates: [
        {
          content: {
            parts: [
              { text: "one" },
              { inlineData: { data: "image" } },
              { text: "two" },
            ],
          },
        },
        { content: { parts: [{ text: "other" }] } },
      ],
    };
    const signal = new AbortController().signal;
    const doFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(data));
    const result = await generateViaProxy({
      ...request,
      doFetch,
      signal,
      isPlainTextRequest: false,
      finalSysInst: "system",
    });
    expect(result.response.text()).toBe("onetwo");
    expect(result.response.candidates).toEqual(data.candidates);
    expect(result.rawResponse).toEqual(data);
    expect(JSON.parse(doFetch.mock.calls[0][1]!.body as string)).toMatchObject({
      model: "legacy-model",
      system_instruction: { parts: [{ text: "system" }] },
    });
    expect(doFetch.mock.calls[0][1]!.signal).toBe(signal);
  });

  it("handles empty legacy responses without inventing candidates", async () => {
    const doFetch = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}));
    const result = await generateViaProxy({
      ...request,
      doFetch,
      isPlainTextRequest: false,
    });
    expect(result.response.text()).toBe("");
    expect(result.response.candidates).toEqual([]);
    expect(
      JSON.parse(doFetch.mock.calls[0][1]!.body as string),
    ).not.toHaveProperty("system_instruction");
  });

  it.each([true, false])(
    "preserves proxy error codes on either route (plain text %s)",
    async (isPlainTextRequest) => {
      const doFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { error: { message: "expired", code: "SESSION_TOKEN_EXPIRED" } },
            { status: 401 },
          ),
        );
      await expect(
        generateViaProxy({ ...request, doFetch, isPlainTextRequest }),
      ).rejects.toThrow("expired (code: SESSION_TOKEN_EXPIRED)");
    },
  );

  it("logs and rethrows the original transport error", async () => {
    const error = new Error("offline");
    await expect(
      generateViaProxy({
        ...request,
        doFetch: vi.fn().mockRejectedValue(error),
      }),
    ).rejects.toBe(error);
    expect(console.error).toHaveBeenCalledWith(
      "[OracleProxy] Fetch error:",
      error,
    );
  });
});
