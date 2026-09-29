import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  `${process.cwd()}/src/lib/components/zen/ZenView.svelte`,
  "utf8",
);

describe("ZenView sidebar toggle wiring", () => {
  it("puts an icon-only hide button beside the sidebar, with a tooltip", () => {
    const shown =
      source.match(/\{#if !sidebarCollapsed\}[\s\S]*?\{:else\}/)?.[0] ?? "";
    expect(shown).toContain("<ZenSidebar");
    expect(shown).toContain("onclick={toggleSidebar}");
    expect(shown).toContain('title="Hide sidebar"');
    expect(shown).not.toContain("Hide panel");
  });

  it("offers an icon-only way back when the sidebar is hidden", () => {
    const hidden =
      source.match(/\{:else\}\s*<button[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(hidden).toContain("onclick={toggleSidebar}");
    expect(hidden).toContain('title="Show sidebar"');
  });
});
