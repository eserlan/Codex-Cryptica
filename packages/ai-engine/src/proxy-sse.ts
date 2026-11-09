/**
 * Decode UTF-8 chunks into SSE frames. Callers retain ownership of the reader
 * and decide whether to cancel it and how to handle parsing/read failures.
 * `trailing` distinguishes the final unterminated frame for protocol adapters.
 */
export async function* readSseFrames(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk?: (value: Uint8Array) => void,
): AsyncGenerator<{ raw: string; trailing: boolean }> {
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk?.(value);
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      yield { raw, trailing: false };
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) yield { raw: buffer, trailing: true };
}

/** Malformed JSON data lines are skipped; each protocol validates its events. */
export function* parseSseData(raw: string, trimLines = false): Generator<any> {
  for (const line of raw.split("\n")) {
    const candidate = trimLines ? line.trim() : line;
    if (!candidate.startsWith("data:")) continue;
    try {
      yield JSON.parse(candidate.slice(5).trim());
    } catch {
      // A malformed data line must not prevent later events being read.
    }
  }
}
