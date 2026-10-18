/**
 * Shared SSE ("data: ...\n\n") frame parser for the provider streaming
 * adaptors (#2423). The framing/buffering mechanics — accumulate bytes,
 * split on a blank-line separator, extract `data:` payloads — are identical
 * between providers even though each one's JSON payload shape differs, so
 * only that framing logic is centralized here; each adaptor still parses
 * and interprets its own `data:` payloads.
 */

function* extractDataLines(rawEvent: string): Generator<string> {
  for (const line of rawEvent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const dataStr = trimmed.slice(5).trim();
    if (dataStr) yield dataStr;
  }
}

/**
 * Reads `data:` payload strings off an SSE response body as they complete.
 * Flushes any trailing partial event still buffered when the stream ends
 * without a final blank-line separator — a provider closing the connection
 * right after its last chunk must not silently drop that chunk's content.
 */
export async function* readSseData(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      yield* extractDataLines(rawEvent);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    yield* extractDataLines(buffer);
  }
}
