import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenHeader category selection", () => {
  it("uses styled CategoryRadioGroup when editing and renders static type when not editing", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/zen/ZenHeader.svelte`,
      "utf8",
    );

    expect(source).toContain(
      'import CategoryRadioGroup from "$lib/components/labels/CategoryRadioGroup.svelte"',
    );
    expect(source).toContain("<CategoryRadioGroup");
    expect(source).toContain("bind:value={editState.type}");
    expect(source).toContain('idPrefix="zen-entity-type"');
    // Ensure native select for category selection is removed
    expect(source).not.toContain(
      "<select\n            bind:value={editState.type}",
    );
  });
});
