import { describe, expect, it } from "vitest";
import { getGeneratorDocumentLayout } from "./generator-document-layout";

describe("getGeneratorDocumentLayout", () => {
  it("moves vampire clan prose sections into the main document", () => {
    const layout = getGeneratorDocumentLayout({
      type: "faction",
      title: "House Vey",
      content: "### Overview\nThe clan rules from the shadows.",
      lore: `### GM Reference Information
- **Faction Type**: Vampire Clan

### Dark Agenda
Turn the bishop into a thrall.

### Internal Conflict
The younger brood want open war.

### Notable NPCs
- **Sire Morcant**: Old monster with brittle patience.

### Rival Faction
The Black Thurible hunts them.

### Adventure Hook
The clan needs a relic recovered before dawn.`,
      labels: ["rpg-faction", "vampire-clan", "imported-draft"],
      status: "active",
    });

    // All prose sections move into the main document
    expect(layout.content).toContain("### Overview");
    expect(layout.content).toContain("### Dark Agenda");
    expect(layout.content).toContain("### Internal Conflict");
    expect(layout.content).toContain("### Notable NPCs");
    expect(layout.content).toContain("### Rival Faction");
    expect(layout.content).toContain("### Adventure Hook");
    // Rail contains only the compact stat block
    expect(layout.lore).toContain("### GM Reference Information");
    expect(layout.lore).not.toContain("### Dark Agenda");
    expect(layout.lore).not.toContain("### Internal Conflict");
    expect(layout.lore).not.toContain("### Notable NPCs");
    expect(layout.lore).not.toContain("### Rival Faction");
    expect(layout.lore).not.toContain("### Adventure Hook");
  });

  it("leaves non-vampire generator content unchanged", () => {
    const layout = getGeneratorDocumentLayout({
      type: "faction",
      title: "The Argent Loom",
      content: "### What they control\nThe canal gates.",
      lore: "### At the Table\n- **Base**: The old mint",
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toBe("### What they control\nThe canal gates.");
    expect(layout.lore).toBe("### At the Table\n- **Base**: The old mint");
  });
});
