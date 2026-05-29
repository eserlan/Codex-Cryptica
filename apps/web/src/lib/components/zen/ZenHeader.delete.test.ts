import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenHeader delete action", () => {
  it("exposes a host-only delete entity button when not editing", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/zen/ZenHeader.svelte`,
      "utf8",
    );

    expect(source).toContain("onDelete?: () => Promise<void>");
    expect(source).toContain('data-testid="delete-entity-button"');
    expect(source).toContain(
      "{#if !editState.isEditing && !vault.isGuest && entity}",
    );
  });
});
