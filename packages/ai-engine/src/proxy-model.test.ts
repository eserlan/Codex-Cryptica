import { describe, expect, it, vi } from "vitest";
import { createProxyModel } from "./proxy-model";
import type { GenerationEvent } from "./proxy-generation-stream";

describe("proxy SDK model adapter", () => {
  it("rejects malformed buffered input asynchronously before fetching", async () => {
    const doFetch = vi.fn<typeof fetch>();
    const model = createProxyModel("legacy", undefined, {
      getProxyUrl: () => "https://proxy.test",
      doFetch,
    });
    const result = model.generateContent({
      contents: [{ parts: [null] }],
    } as any);
    await expect(result).rejects.toThrow(TypeError);
    expect(doFetch).not.toHaveBeenCalled();
  });

  it("adapts chat responses and accumulates only successful turns without mutating initial history", async () => {
    const doFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ content: "first answer" }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ content: "second answer" }));
    const history = [{ role: "user", parts: [{ text: "earlier" }] }];
    const model = createProxyModel("legacy", "system", {
      getProxyUrl: () => "https://proxy.test",
      doFetch,
    });
    const chat = model.startChat({ history });
    const first = await chat.sendMessageStream("first");
    const chunks = await Array.fromAsync(first.stream);
    expect(chunks.map((chunk) => chunk.text())).toEqual(["first answer"]);
    await expect(chat.sendMessageStream("failed")).rejects.toThrow("offline");
    const signal = new AbortController().signal;
    await chat.sendMessageStream("second", { signal });
    expect(history).toEqual([{ role: "user", parts: [{ text: "earlier" }] }]);
    expect(
      JSON.parse(doFetch.mock.calls[2][1]!.body as string).messages,
    ).toEqual([
      { role: "system", content: "system" },
      { role: "user", content: "earlier" },
      { role: "user", content: "first" },
      { role: "assistant", content: "first answer" },
      { role: "user", content: "second" },
    ]);
    expect(doFetch.mock.calls[2][1]!.signal).toBe(signal);
  });

  it("resolves the proxy URL again when starting a chat", async () => {
    let url = "https://first.test";
    const doFetch = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ content: "answer" }));
    const model = createProxyModel("legacy", undefined, {
      getProxyUrl: () => url,
      doFetch,
    });
    url = "https://second.test";
    await model.generateContent("direct generation");
    await model.startChat().sendMessageStream("chat generation");
    expect(doFetch.mock.calls.map(([input]) => input)).toEqual([
      "https://first.test",
      "https://second.test",
    ]);
  });

  it("returns an error event without fetching unsupported multimodal streams", async () => {
    const doFetch = vi.fn<typeof fetch>();
    const model = createProxyModel("legacy", undefined, {
      getProxyUrl: () => "https://proxy.test",
      doFetch,
    }) as unknown as {
      generateContentStream: (
        request: unknown,
      ) => AsyncGenerator<GenerationEvent>;
    };
    expect(
      await Array.fromAsync(
        model.generateContentStream({
          contents: [{ parts: [{ inlineData: {} }] }],
        }),
      ),
    ).toEqual([
      { type: "error", error: "streaming-not-supported-for-non-text-request" },
    ]);
    expect(doFetch).not.toHaveBeenCalled();
  });

  it("routes a text stream through operation generation", async () => {
    const doFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('data: {"type":"complete","text":"hi"}\n\n'),
      );
    const model = createProxyModel("legacy", undefined, {
      getProxyUrl: () => "https://proxy.test",
      doFetch,
    }) as unknown as {
      generateContentStream: (
        request: unknown,
        signal?: AbortSignal,
      ) => AsyncGenerator<GenerationEvent>;
    };
    const signal = new AbortController().signal;
    expect(
      await Array.fromAsync(model.generateContentStream("hello", signal)),
    ).toEqual([{ type: "complete", text: "hi" }]);
    expect(doFetch.mock.calls[0][1]!.signal).toBe(signal);
  });
});
