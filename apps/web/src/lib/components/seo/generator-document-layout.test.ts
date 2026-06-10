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

  it("moves faction narrative prose into the main document, keeps compact bullets in the rail", () => {
    const layout = getGeneratorDocumentLayout({
      type: "faction",
      title: "The Argent Loom",
      content: "### What they control\nThe canal gates.",
      lore: `### At the Table
- **Base**: The old mint
- **Resource**: Canal tolls

### Notable NPCs
- **Guildmistress Hale**: Counts every favour twice.

### Internal Conflict
The dockside cells want to stop paying tribute to the founding families, and the founders know it.

### Rival Faction
- **The Black Ledger**: Undercuts their toll contracts.`,
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("### What they control");
    expect(layout.content).toContain("### Internal Conflict");
    expect(layout.lore).toContain("### At the Table");
    expect(layout.lore).toContain("### Notable NPCs");
    expect(layout.lore).toContain("### Rival Faction");
    expect(layout.lore).not.toContain("### Internal Conflict");
  });

  it("moves quest twist, reward, and complication into the main document", () => {
    const layout = getGeneratorDocumentLayout({
      type: "event",
      title: "The Bell Below",
      content: "### The Hook\nA drowned bell rings at low tide.",
      lore: `### Core Fields
- **Setting**: The flooded chapel of Saint Aldric
- **Threat**: The tide cult

### Complication
The bell only rings when someone in the party is lying.

### Key NPC
- **Verger Ottoline**: Knows which lie started it.

### The Twist
The bell is a binding, and the party's patron forged it.

### Reward
The chapel reliquary, and leverage over the patron.`,
      labels: ["rpg-quest", "quest-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("### Complication");
    expect(layout.content).toContain("### The Twist");
    expect(layout.content).toContain("### Reward");
    expect(layout.lore).toContain("### Core Fields");
    expect(layout.lore).toContain("### Key NPC");
    expect(layout.lore).not.toContain("### The Twist");
    expect(layout.lore).not.toContain("### Reward");
  });

  it("moves magic item lore & history into the main document", () => {
    const layout = getGeneratorDocumentLayout({
      type: "item",
      title: "The Hollow Crown",
      content: "### Description\nA circlet of cold iron.",
      lore: `### GM Reference Information
- **Type**: Wondrous item
- **Rarity**: Rare

### Magical Properties
- **Passive Effect**: The wearer hears nearby whispers.

### Lore & History
Forged for a king who trusted no counsel, it outlived four dynasties.`,
      labels: ["rpg-item", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("### Lore & History");
    expect(layout.lore).toContain("### GM Reference Information");
    expect(layout.lore).toContain("### Magical Properties");
    expect(layout.lore).not.toContain("### Lore & History");
  });

  it("moves unrecognised AI-invented lore sections into the main document", () => {
    const layout = getGeneratorDocumentLayout({
      type: "faction",
      title: "The Argent Loom",
      content: "### What they control\nThe canal gates.",
      lore: `### At the Table
- **Base**: The old mint

### Whispered Origins
They say the first loom was strung with hair from a drowned saint.`,
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("### Whispered Origins");
    expect(layout.lore).toContain("### At the Table");
    expect(layout.lore).not.toContain("### Whispered Origins");
  });

  it("keeps lore preamble before the first heading, routed to the document", () => {
    const layout = getGeneratorDocumentLayout({
      type: "faction",
      title: "The Argent Loom",
      content: "### What they control\nThe canal gates.",
      lore: `A guild older than the city charter.

### At the Table
- **Base**: The old mint`,
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("A guild older than the city charter.");
    expect(layout.lore).toContain("### At the Table");
    expect(layout.lore).not.toContain("A guild older than the city charter.");
  });

  it("leaves generators without a layout rule unchanged", () => {
    const layout = getGeneratorDocumentLayout({
      type: "character",
      title: "Brother Calix",
      content: "### Who they are\nA lapsed monk turned locksmith.",
      lore: "### At a Glance\n- **Role**: Locksmith\n\n### Faction Connection\nOwes the thieves' guild a debt.",
      labels: ["rpg-character", "npc-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toBe(
      "### Who they are\nA lapsed monk turned locksmith.",
    );
    expect(layout.lore).toBe(
      "### At a Glance\n- **Role**: Locksmith\n\n### Faction Connection\nOwes the thieves' guild a debt.",
    );
  });

  it("leaves lore unchanged when a ruled generator has no markdown sections", () => {
    const layout = getGeneratorDocumentLayout({
      type: "faction",
      title: "The Argent Loom",
      content: "Plain prose without headings.",
      lore: "Plain lore without headings.",
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toBe("Plain prose without headings.");
    expect(layout.lore).toBe("Plain lore without headings.");
  });
});
