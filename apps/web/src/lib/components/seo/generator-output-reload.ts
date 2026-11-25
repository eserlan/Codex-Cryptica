import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

const OUTPUT_KEY_PREFIX = "codex-generator-output-reload:";

export function shouldReloadAfterLazyChunkRetry(retryAttempt: number): boolean {
  return retryAttempt > 0;
}

export function saveGeneratorOutputForReload(
  slug: string,
  output: GeneratorOutput,
  storage?: Pick<Storage, "setItem">,
): boolean {
  try {
    (storage ?? sessionStorage).setItem(
      `${OUTPUT_KEY_PREFIX}${slug}`,
      JSON.stringify(output),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeGeneratorOutputAfterReload(
  slug: string,
  storage?: Pick<Storage, "getItem" | "removeItem">,
): GeneratorOutput | null {
  const key = `${OUTPUT_KEY_PREFIX}${slug}`;
  let targetStorage = storage;
  try {
    targetStorage ??= sessionStorage;
    const raw = targetStorage.getItem(key);
    targetStorage.removeItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("title" in parsed) ||
      typeof parsed.title !== "string" ||
      ("type" in parsed && typeof parsed.type !== "string")
    ) {
      return null;
    }
    return {
      ...parsed,
      type: "type" in parsed ? parsed.type : "note",
    } as GeneratorOutput;
  } catch {
    try {
      targetStorage?.removeItem(key);
    } catch {
      // Best-effort cleanup of stale recovery data.
    }
    return null;
  }
}
