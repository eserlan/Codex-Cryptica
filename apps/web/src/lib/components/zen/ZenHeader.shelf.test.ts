import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenHeader send to shelf action", () => {
  const source = readFileSync(
    `${process.cwd()}/src/lib/components/zen/ZenHeader.svelte`,
    "utf8",
  );

  it("imports the shelf feature", () => {
    expect(source).toContain('from "$lib/features/shelf"');
  });

  it("exposes a host-only send to shelf button when not editing", () => {
    expect(source).toContain('data-testid="zen-send-to-shelf-button"');
    expect(source).toContain("{#if entity && !vault.isGuest}");
  });

  it("guards the shelve handler against a missing entity", () => {
    expect(source).toContain("const handleSendToShelf = async () => {");
    expect(source).toContain("if (!entity) return;");
  });

  it("gives transient checkmark feedback after shelving", () => {
    expect(source).toContain("shelvedJustNow = true");
    expect(source).toContain("icon-[lucide--check]");
    expect(source).toContain("On the Shelf");
  });
});
