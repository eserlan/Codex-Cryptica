import { describe, expect, it, vi } from "vitest";
import { parseSseData, readSseFrames } from "./proxy-sse";

describe("SSE framing", () => {
  it("decodes byte-sized chunks, multiple frames and an unterminated final event", async () => {
    const bytes = new TextEncoder().encode(
      'data: {"text":"🌍"}\n\ndata: {"type":"started"}\n\ndata: {"type":"complete"}',
    );
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const onChunk = vi.fn();
    expect(
      await Array.fromAsync(readSseFrames(stream.getReader(), onChunk)),
    ).toEqual([
      { raw: 'data: {"text":"🌍"}', trailing: false },
      { raw: 'data: {"type":"started"}', trailing: false },
      { raw: 'data: {"type":"complete"}', trailing: true },
    ]);
    expect(onChunk).toHaveBeenCalledTimes(bytes.length);
  });

  it("ignores a whitespace-only tail", async () => {
    expect(
      await Array.fromAsync(
        readSseFrames(new Response(" \n").body!.getReader()),
      ),
    ).toEqual([]);
  });

  it("leaves read errors and cancellation policy to its caller", async () => {
    const error = new Error("read failed");
    const cancel = vi.fn();
    const reader = {
      read: vi.fn().mockRejectedValue(error),
      cancel,
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    await expect(readSseFrames(reader).next()).rejects.toBe(error);
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("SSE data parsing", () => {
  it("skips comments, blank data and malformed JSON while retaining valid lines", () => {
    expect([
      ...parseSseData(
        ': keepalive\ndata:\ndata: invalid\ndata: {"type":"started"}\ndata: {"type":"complete"}',
      ),
    ]).toEqual([{ type: "started" }, { type: "complete" }]);
  });

  it("only trims leading whitespace when requested by the protocol adapter", () => {
    const raw = '  data: {"type":"started"}  ';
    expect([...parseSseData(raw)]).toEqual([]);
    expect([...parseSseData(raw, true)]).toEqual([{ type: "started" }]);
  });
});
