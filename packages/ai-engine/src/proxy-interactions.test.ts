import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GENERATOR_INTERACTION_MODEL_KEY,
  INTERACTION_MODEL_KEY,
  InteractionExpiredError,
  ProxyInteractions,
} from "./proxy-interactions";
import { InteractionExpiredError as PublicExpiredError } from "./client-manager";

const params = { model: "luna-fast", input: "hello" };

function interactions(response: Response) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
  return {
    fetcher,
    client: new ProxyInteractions("https://proxy.test", fetcher),
  };
}

function sse(text: string, cancel = vi.fn()) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
      cancel,
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

afterEach(() => vi.restoreAllMocks());

describe("buffered proxy interactions", () => {
  it("keeps model keys and the public error constructor compatible", () => {
    expect(INTERACTION_MODEL_KEY).toBe("luna-fast");
    expect(GENERATOR_INTERACTION_MODEL_KEY).toBe(INTERACTION_MODEL_KEY);
    expect(PublicExpiredError).toBe(InteractionExpiredError);
    expect(new InteractionExpiredError("expired").name).toBe(
      "InteractionExpiredError",
    );
  });

  it("forwards all settings, explicit store:false and the abort signal", async () => {
    const { client, fetcher } = interactions(Response.json({ id: "new" }));
    const signal = new AbortController().signal;
    expect(
      await client.send({
        ...params,
        storeConversation: false,
        previousInteractionId: "old",
        systemInstruction: "system",
        generationConfig: {},
        signal,
      }),
    ).toEqual({ id: "new", text: "" });
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      model: "luna-fast",
      input: "hello",
      store: false,
      previous_interaction_id: "old",
      system_instruction: "system",
      generationConfig: {},
    });
    expect(fetcher.mock.calls[0][1]!.signal).toBe(signal);
  });

  it("does not call the network while offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { client, fetcher } = interactions(Response.json({}));
    await expect(client.send(params)).rejects.toThrow(
      "You appear to be offline",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([409, 400])(
    "preserves expired continuation errors (HTTP %i)",
    async (status) => {
      const { client } = interactions(
        Response.json(
          { error: { code: "INTERACTION_NOT_FOUND", message: "expired id" } },
          { status },
        ),
      );
      await expect(client.send(params)).rejects.toThrow(
        InteractionExpiredError,
      );
    },
  );

  it("uses the fallback message for malformed error bodies", async () => {
    const { client } = interactions(new Response("not JSON", { status: 502 }));
    await expect(client.send(params)).rejects.toThrow(
      "[OracleProxy] Interaction failed: Unknown error",
    );
  });
});

describe("streamed proxy interactions", () => {
  it("filters malformed and unknown events and flushes a trailing complete event", async () => {
    const { client } = interactions(
      sse(
        'data: invalid\n\ndata: {"type":"unknown"}\n\ndata: {"type":"delta","text":42}\n\ndata: {"type":"complete","id":42,"text":"bad"}\n\ndata: {"type":"started"}\n\ndata: {"type":"delta","text":"hi"}\n\ndata: {"type":"complete","id":"new","text":"hi"}',
      ),
    );
    expect(await Array.fromAsync(client.stream(params))).toEqual([
      { type: "started" },
      { type: "delta", text: "hi" },
      { type: "complete", id: "new", text: "hi" },
    ]);
  });

  it("cancels the reader on early return", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: {"type":"started"}\n\n'),
          );
        },
        cancel,
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
    const { client } = interactions(response);
    const stream = client.stream(params);
    expect((await stream.next()).value).toEqual({ type: "started" });
    await stream.return(undefined);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("stops on a framed error without requiring a complete event", async () => {
    const { client } = interactions(
      sse('data: {"type":"error"}\n\ndata: {"type":"started"}\n\n'),
    );
    expect(await Array.fromAsync(client.stream(params))).toEqual([
      { type: "error", error: "interaction-stream-error" },
    ]);
  });

  it("preserves the incomplete error after an unterminated error frame", async () => {
    const { client } = interactions(
      sse('data: {"type":"error","error":"failed"}'),
    );
    const stream = client.stream(params);
    expect((await stream.next()).value).toEqual({
      type: "error",
      error: "failed",
    });
    await expect(stream.next()).rejects.toThrow(
      "interaction-stream-incomplete",
    );
  });

  it("rejects a stream ending without a complete event", async () => {
    const { client } = interactions(sse('data: {"type":"started"}\n\n'));
    await expect(Array.fromAsync(client.stream(params))).rejects.toThrow(
      "interaction-stream-incomplete",
    );
  });

  it("cancels a rejected response body and preserves typed expiry", async () => {
    const response = new Response("expired", { status: 409 });
    const cancel = vi.spyOn(response.body!, "cancel");
    const { client } = interactions(response);
    await expect(client.stream(params).next()).rejects.toThrow(
      InteractionExpiredError,
    );
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([new Response("not SSE"), new Response(null)])(
    "rejects unsupported stream responses",
    async (response) => {
      const { client } = interactions(response);
      await expect(client.stream(params).next()).rejects.toThrow(
        "interaction-stream-unavailable",
      );
    },
  );
});
