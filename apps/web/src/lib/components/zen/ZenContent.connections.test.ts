import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenContent proposals wiring", () => {
  it("renders DetailProposals in the content area instead of a separate bonds section", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/zen/ZenContent.svelte`,
      "utf8",
    );

    expect(source).toContain("DetailProposals");
    expect(source).not.toContain("showConnections");
    expect(source).not.toContain("themeStore.jargon.connections_header");
  });

  it("enables connections in the embedded entity view", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/entity/EmbeddedEntityView.svelte`,
      "utf8",
    );

    expect(source).toContain("<ZenView");
  });
});
