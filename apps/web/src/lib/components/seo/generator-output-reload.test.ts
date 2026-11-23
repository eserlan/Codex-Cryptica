import { describe, expect, it } from "vitest";
import {
  consumeGeneratorOutputAfterReload,
  saveGeneratorOutputForReload,
  shouldReloadAfterLazyChunkRetry,
} from "./generator-output-reload.js";

describe("generator output reload recovery", () => {
  it("stops offering the same retry URL after its retry failed", () => {
    expect(shouldReloadAfterLazyChunkRetry(0)).toBe(false);
    expect(shouldReloadAfterLazyChunkRetry(1)).toBe(true);
  });

  it("reports when the generated output could not be saved for recovery", () => {
    expect(
      saveGeneratorOutputForReload(
        "npc",
        { type: "note", title: "Keep me" } as never,
        {
          setItem: () => {
            throw new Error("quota exceeded");
          },
        },
      ),
    ).toBe(false);
  });

  it("normalizes older saved business outputs that did not include a type", () => {
    const values = new Map<string, string>([
      [
        "codex-generator-output-reload:/generators/business",
        JSON.stringify({
          title: "Business draft",
          business: { name: "Harbour" },
        }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };

    expect(
      consumeGeneratorOutputAfterReload("/generators/business", storage),
    ).toMatchObject({ title: "Business draft", type: "note" });
  });

  it("restores a generated draft once after reloading", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const output = {
      type: "note",
      title: "Generated draft",
      content: "Keep this result while recovering the refinement tools.",
    } as never;

    saveGeneratorOutputForReload(
      "one-shot-adventure-generator",
      output,
      storage,
    );

    expect(
      consumeGeneratorOutputAfterReload(
        "one-shot-adventure-generator",
        storage,
      ),
    ).toEqual(output);
    expect(
      consumeGeneratorOutputAfterReload(
        "one-shot-adventure-generator",
        storage,
      ),
    ).toBeNull();
  });
});
