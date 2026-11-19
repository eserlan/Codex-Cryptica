import type { ParseAdventureResult } from "@codex/adventure-engine";

/**
 * Dynamically loads `pdfjs-dist`'s local worker asset and `@codex/adventure-engine`'s
 * PDF parser so `pdfjs-dist` is never included in the base application bundle.
 */
export async function importAdventurePdfFile(
  bytes: Uint8Array,
  fileName: string,
  signal?: AbortSignal,
): Promise<ParseAdventureResult> {
  const [{ parseAdventurePdf }, workerModule] = await Promise.all([
    import("@codex/adventure-engine"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);

  return parseAdventurePdf(
    bytes,
    { fileName },
    { workerSrc: workerModule.default, signal },
  );
}
