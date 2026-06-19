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
- **Secret**: The founding charter is forged.
- **Immediate Hook**: A loom has started weaving on its own.

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
    expect(layout.content).toContain("### Secrets & Hooks");
    expect(layout.content).toContain("**Secret**: The founding charter");
    expect(layout.content).toContain("**Immediate Hook**: A loom has started");
    expect(layout.lore).toContain("### At the Table");
    expect(layout.lore).toContain("**Base**");
    expect(layout.lore).toContain("### Notable NPCs");
    expect(layout.lore).toContain("### Rival Faction");
    expect(layout.lore).not.toContain("### Internal Conflict");
    expect(layout.lore).not.toContain("**Secret**");
    expect(layout.lore).not.toContain("**Immediate Hook**");
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

  it("moves NPC personality, faction connection, secret, and hook into the main document", () => {
    const layout = getGeneratorDocumentLayout({
      type: "character",
      title: "Brother Calix",
      content: "### Who they are\nA lapsed monk turned locksmith.",
      lore: `### At a Glance
- **Ancestry**: Human, hill country
- **Role**: Locksmith
- **Moral Stance**: Lawful to a fault
- **Secret**: He never actually left the order.
- **Immediate Hook**: He needs a lock opened that he made himself.

### Personality
- Counts his steps out loud when nervous.
- Refuses to lie inside a church.

### Faction Connection
Owes the thieves' guild a debt.`,
      labels: ["rpg-character", "npc-generator", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("### Who they are");
    expect(layout.content).toContain("### Personality");
    expect(layout.content).toContain("### Faction Connection");
    expect(layout.content).toContain("### Secrets & Hooks");
    expect(layout.content).toContain("**Secret**: He never actually left");
    expect(layout.content).toContain("**Immediate Hook**: He needs a lock");
    // Rail keeps only the compact at-a-glance facts
    expect(layout.lore).toContain("### At a Glance");
    expect(layout.lore).toContain("**Ancestry**");
    expect(layout.lore).toContain("**Role**");
    expect(layout.lore).toContain("**Moral Stance**");
    expect(layout.lore).not.toContain("**Secret**");
    expect(layout.lore).not.toContain("**Immediate Hook**");
    expect(layout.lore).not.toContain("### Personality");
    expect(layout.lore).not.toContain("### Faction Connection");
  });

  it("lifts hidden problem and hook bullets for kingdom and tavern generators", () => {
    const kingdom = getGeneratorDocumentLayout({
      type: "location",
      title: "The Sundered March",
      content: "### The Realm\nA border kingdom held together by toll roads.",
      lore: `### At a Glance
- **Polity Type**: Feudal kingdom
- **Ruler**: Queen Maren II
- **Hidden Problem**: The toll lords fund both sides of the border war.
- **Immediate Hook**: A toll castle has stopped answering ravens.

### Major Factions
- **The Toll Lords**: Control every crossing.

### Entity Seeds
- **Location**: The silent toll castle`,
      labels: ["rpg-kingdom", "kingdom-generator", "imported-draft"],
      status: "active",
    });

    expect(kingdom.content).toContain("### Secrets & Hooks");
    expect(kingdom.content).toContain("**Hidden Problem**: The toll lords");
    expect(kingdom.content).toContain("**Immediate Hook**: A toll castle");
    expect(kingdom.lore).toContain("**Polity Type**");
    expect(kingdom.lore).toContain("### Major Factions");
    expect(kingdom.lore).toContain("### Entity Seeds");
    expect(kingdom.lore).not.toContain("**Hidden Problem**");
    expect(kingdom.lore).not.toContain("**Immediate Hook**");

    const tavern = getGeneratorDocumentLayout({
      type: "location",
      title: "The Crooked Flagon",
      content: "### The Place\nA dockside tavern that never fully closes.",
      lore: `### At a Glance
- **Type**: Dockside tavern
- **Owner**: Wide Marta
- **Hidden Problem**: The cellar floods with the tide, and something swims in.
- **Immediate Hook**: Marta is paying for silence about last night.

### Notable Patrons
- **One-Ear Fenn**: Hears everything anyway.

### Rumours
- The harbourmaster drinks here for free.`,
      labels: ["rpg-location", "tavern-generator", "imported-draft"],
      status: "active",
    });

    expect(tavern.content).toContain("### Secrets & Hooks");
    expect(tavern.content).toContain("**Hidden Problem**: The cellar floods");
    expect(tavern.content).toContain("**Immediate Hook**: Marta is paying");
    expect(tavern.lore).toContain("**Owner**");
    expect(tavern.lore).toContain("### Notable Patrons");
    expect(tavern.lore).toContain("### Rumours");
    expect(tavern.lore).not.toContain("**Hidden Problem**");
    expect(tavern.lore).not.toContain("**Immediate Hook**");
  });

  it("moves Current Tension and Adventure Hooks to center for rpg-location", () => {
    const layout = getGeneratorDocumentLayout({
      type: "location",
      title: "Ashveil Crossing",
      content:
        "## Core Concept\nA river town built on stilts.\n\n## First Impression\nMud and the smell of fish.",
      lore: `### GM Reference Information
- **Scale**: Town (500–5,000 inhabitants)
- **Genre / Setting**: Fantasy

### Points of Interest
- **📍 The Rusty Anchor**: Heart of local gossip.

### Controlling Factions
- **👥 The Iron Shield Guard**: Enforces order.

### Current Tension
The mayor is skimming grain taxes and the harvest is already short.

### Adventure Hooks
- A merchant's cart was robbed on the south road.
- The guard captain wants help covering up a death.`,
      labels: ["rpg-location", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toContain("## Core Concept");
    expect(layout.content).toContain("### Current Tension");
    expect(layout.content).toContain("### Adventure Hooks");
    expect(layout.lore).toContain("### GM Reference Information");
    expect(layout.lore).toContain("### Points of Interest");
    expect(layout.lore).toContain("### Controlling Factions");
    expect(layout.lore).not.toContain("### Current Tension");
    expect(layout.lore).not.toContain("### Adventure Hooks");
  });

  it("leaves generators without a layout rule unchanged", () => {
    const layout = getGeneratorDocumentLayout({
      type: "location",
      title: "Bellfork",
      content: "### Description\nA river town built on stilts.",
      lore: "### Some Unknown Section\n- **Size**: Town\n\n### Another Unknown\n- **The Drowned Bell**: A flooded chapel.",
      labels: ["some-unknown-label", "imported-draft"],
      status: "active",
    });

    expect(layout.content).toBe(
      "### Description\nA river town built on stilts.",
    );
    expect(layout.lore).toBe(
      "### Some Unknown Section\n- **Size**: Town\n\n### Another Unknown\n- **The Drowned Bell**: A flooded chapel.",
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
