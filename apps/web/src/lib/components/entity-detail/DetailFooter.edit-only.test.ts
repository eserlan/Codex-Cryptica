import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  `${process.cwd()}/src/lib/components/EntityDetailPanel.svelte`,
  "utf8",
);

describe("EntityDetailPanel footer", () => {
  it("renders the footer only while editing", () => {
    expect(source).toMatch(/\{#if isEditing\}\s*<DetailFooter/);
    expect(source.match(/<DetailFooter/g)).toHaveLength(1);
  });

  it("hands Edit and Delete to the header", () => {
    const header = source.match(/<DetailHeader[\s\S]*?\/>/)?.[0] ?? "";
    expect(header).toContain("onStartEdit={startEditing}");
    expect(header).toContain("onDelete={handleDelete}");
    expect(header).toContain("{canGuestEdit}");
  });
});
