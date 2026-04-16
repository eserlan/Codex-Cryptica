import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenContent connections wiring", () => {
  it("exposes a connections section only when explicitly enabled", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/zen/ZenContent.svelte`,
      "utf8",
    );

    expect(source).toContain("showConnections = false");
    expect(source).toContain("themeStore.jargon.connections_header");
    expect(source).toContain("onNavigate(conn.targetId)");
  });

  it("enables connections in the embedded entity view", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/entity/EmbeddedEntityView.svelte`,
      "utf8",
    );

    expect(source).toContain("<ZenView");
  });
});
