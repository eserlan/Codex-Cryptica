import { describe, it, expect } from "vitest";
import { readSseData } from "./sse";

function streamFromChunks(
  chunks: string[],
): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return stream.getReader();
}

async function collect(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const out: string[] = [];
  for await (const dataStr of readSseData(reader)) out.push(dataStr);
  return out;
}

describe("readSseData", () => {
  it("yields each data payload separated by a blank line", async () => {
    const reader = streamFromChunks(["data: one\n\ndata: two\n\n"]);
    expect(await collect(reader)).toEqual(["one", "two"]);
  });

  it("reassembles an event split across multiple network chunks", async () => {
    const reader = streamFromChunks(["data: par", "tial\n\n"]);
    expect(await collect(reader)).toEqual(["partial"]);
  });

  it("flushes a trailing event that has no final blank-line separator", async () => {
    const reader = streamFromChunks(["data: one\n\ndata: two"]);
    expect(await collect(reader)).toEqual(["one", "two"]);
  });

  it("yields nothing extra when the stream ends cleanly with no trailing data", async () => {
    const reader = streamFromChunks(["data: one\n\n"]);
    expect(await collect(reader)).toEqual(["one"]);
  });

  it("ignores non-data lines within an event", async () => {
    const reader = streamFromChunks(["event: message\ndata: one\nid: 1\n\n"]);
    expect(await collect(reader)).toEqual(["one"]);
  });
});
