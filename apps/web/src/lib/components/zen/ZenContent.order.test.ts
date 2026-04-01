import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenContent ordering", () => {
  it("keeps chronicle before lore in the source template", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/zen/ZenContent.svelte`,
      "utf8",
    );

    const chronicleIndex = source.indexOf("<!-- Chronicle -->");
    const loreIndex = source.indexOf(
      "{#if !vault.isGuest && (editState.isEditing || entity?.lore)}",
    );

    expect(chronicleIndex).toBeGreaterThan(-1);
    expect(loreIndex).toBeGreaterThan(-1);
    expect(chronicleIndex).toBeLessThan(loreIndex);
  });
});
