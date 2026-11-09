import { afterEach, describe, expect, it, vi } from "vitest";
import { sendViaOperationPipelineStream } from "./proxy-generation-stream";

const request = {
  proxyUrl: "https://proxy.test",
  contents: [{ role: "user", parts: [{ text: "hello" }] }],
  generationConfig: {},
  finalSysInst: "system",
};

afterEach(() => vi.restoreAllMocks());

describe("operation pipeline streaming", () => {
  it("forwards the shared request body and signal while tolerating malformed SSE", async () => {
    const events = [
      { type: "started" },
      { type: "delta", text: "hi" },
      {
        type: "complete",
        text: "hi",
        usage: { promptTokens: 1, completionTokens: 2 },
      },
    ];
    const response = new Response(
      "data: malformed\n\n" +
        events.map((e) => `  data: ${JSON.stringify(e)}`).join("\n\n"),
    );
    const doFetch = vi.fn<typeof fetch>().mockResolvedValue(response);
    const signal = new AbortController().signal;
    expect(
      await Array.fromAsync(
        sendViaOperationPipelineStream({ ...request, doFetch, signal }),
      ),
    ).toEqual(events);
    expect(JSON.parse(doFetch.mock.calls[0][1]!.body as string)).toEqual({
      operation: "freeform-generation",
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "hello" },
      ],
      stream: true,
    });
    expect(doFetch.mock.calls[0][1]!.signal).toBe(signal);
  });

  it.each([
    [new Error("offline"), "transport-error"],
    [new DOMException("cancelled", "AbortError"), "aborted"],
  ])("turns transport failures into events", async (error, message) => {
    const doFetch = vi.fn().mockRejectedValue(error);
    expect(
      await Array.fromAsync(
        sendViaOperationPipelineStream({ ...request, doFetch }),
      ),
    ).toEqual([{ type: "error", error: message }]);
  });

  it.each([
    [new Error("broken stream"), "stream-read-error"],
    [new DOMException("cancelled", "AbortError"), "aborted"],
  ])(
    "turns stream read failures into events without replaying content",
    async (error, message) => {
      let reads = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (reads++ === 0)
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"delta","text":"hi"}\n\n',
              ),
            );
          else controller.error(error);
        },
      });
      const doFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(body));
      expect(
        await Array.fromAsync(
          sendViaOperationPipelineStream({ ...request, doFetch }),
        ),
      ).toEqual([
        { type: "delta", text: "hi" },
        { type: "error", error: message },
      ]);
      expect(doFetch).toHaveBeenCalledOnce();
    },
  );

  it.each([
    [
      Response.json(
        { error: { message: "rejected", code: "SESSION_TOKEN_INVALID" } },
        { status: 401 },
      ),
      "rejected (code: SESSION_TOKEN_INVALID)",
    ],
    [new Response("not JSON", { status: 502 }), "upstream-status-502"],
    [Response.json({}, { status: 503 }), "upstream-status-503"],
    [new Response(null), "upstream-status-200"],
  ])(
    "preserves upstream errors and missing-body fallbacks",
    async (response, message) => {
      const doFetch = vi.fn<typeof fetch>().mockResolvedValue(response);
      expect(
        await Array.fromAsync(
          sendViaOperationPipelineStream({ ...request, doFetch }),
        ),
      ).toEqual([{ type: "error", error: message }]);
    },
  );
});
