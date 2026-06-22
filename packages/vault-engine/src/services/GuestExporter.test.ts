import { describe, it, expect } from "vitest";
import { GuestExporter, type ExporterOptions } from "./GuestExporter";
import type { Entity } from "schema";

describe("GuestExporter", () => {
  const publicEntity: Entity = {
    id: "entity-1",
    type: "note",
    title: "Public Note",
    status: "active",
    content: "This is a public node with a link to [Secret Node](entity-2) and [Public Node 2](entity-3) and [Google](https://google.com).",
    lore: "Top secret GM only note",
    artDirection: "GM visual description",
    connections: [
      { target: "entity-2", type: "neutral" },
      { target: "entity-3", type: "friendly", label: "Ally" },
    ],
  };

  const secretEntity: Entity = {
    id: "entity-2",
    type: "note",
    title: "Secret Note",
    status: "active",
    labels: ["hidden"], // makes it hidden
    content: "Secrets secrets",
    connections: [],
  };

  const publicEntity2: Entity = {
    id: "entity-3",
    type: "note",
    title: "Public Note 2",
    status: "active",
    content: "Another public node.",
    connections: [],
  };

  const draftEntity: Entity = {
    id: "entity-4",
    type: "note",
    title: "Draft Note",
    status: "draft", // draft should be excluded
    content: "Draft in progress",
    connections: [],
  };

  const defaultOptions: ExporterOptions = {
    entities: [publicEntity, secretEntity, publicEntity2, draftEntity],
    defaultVisibility: "visible",
    activeTheme: { primaryColor: "#ff0000" },
    publishId: "snapshot-123",
    vaultTitle: "My Vault",
    publisherVersion: "1.0.0",
  };

  it("should compile a bundle excluding drafts and hidden entities", () => {
    const bundle = GuestExporter.export(defaultOptions);

    expect(bundle.publishId).toBe("snapshot-123");
    expect(bundle.vaultTitle).toBe("My Vault");
    expect(bundle.publisherVersion).toBe("1.0.0");
    expect(bundle.activeTheme).toEqual({ primaryColor: "#ff0000" });
    expect(bundle.publishedAt).toBeDefined();

    const ids = bundle.entities.map(e => e.id);
    expect(ids).toContain("entity-1");
    expect(ids).toContain("entity-3");
    expect(ids).not.toContain("entity-2"); // Hidden
    expect(ids).not.toContain("entity-4"); // Draft
  });

  it("should physically delete GM secrets on included entities", () => {
    const bundle = GuestExporter.export(defaultOptions);

    const exportedE1 = bundle.entities.find(e => e.id === "entity-1")!;
    expect(exportedE1.lore).toBeUndefined();
    expect(exportedE1.artDirection).toBeUndefined();
    expect((exportedE1 as any)._path).toBeUndefined();
  });

  it("should redact links to private/excluded entities but preserve public and external links", () => {
    const bundle = GuestExporter.export(defaultOptions);

    const exportedE1 = bundle.entities.find(e => e.id === "entity-1")!;
    expect(exportedE1.content).toContain("[Redacted]"); // entity-2 link is redacted
    expect(exportedE1.content).toContain("entity-3"); // entity-3 link is preserved
    expect(exportedE1.content).toContain("https://google.com"); // google link is preserved
    expect(exportedE1.content).not.toContain("entity-2");
  });

  it("should filter out relationships where either endpoint is excluded", () => {
    const bundle = GuestExporter.export(defaultOptions);

    expect(bundle.relationships).toHaveLength(1);
    expect(bundle.relationships[0].sourceId).toBe("entity-1");
    expect(bundle.relationships[0].targetId).toBe("entity-3");
    expect(bundle.relationships[0].label).toBe("Ally");
  });

  it("should sanitize maps and canvases based on player visibility and entity inclusion", () => {
    const options: ExporterOptions = {
      ...defaultOptions,
      maps: [
        {
          id: "map-public",
          name: "Public Map",
          playerVisible: true,
          pins: [
            { id: "pin-1", entityId: "entity-1", label: "Public Pin" }, // keep
            { id: "pin-2", entityId: "entity-2", label: "Secret Pin" }, // remove (entity-2 is hidden)
            { id: "pin-3", label: "Label Only Pin" }, // keep (no entityId)
          ],
        } as any,
        {
          id: "map-private",
          name: "Private Map",
          playerVisible: false,
          pins: [],
        } as any,
      ],
      canvases: [
        {
          id: "canvas-public",
          name: "Public Canvas",
          playerVisible: true,
          nodes: [
            { id: "node-1", type: "entity", entityId: "entity-1" }, // keep
            { id: "node-2", type: "entity", entityId: "entity-2" }, // remove
            { id: "node-3", type: "text", content: "General text" }, // keep
          ],
          edges: [
            { id: "edge-1-3", source: "node-1", target: "node-3" }, // keep
            { id: "edge-1-2", source: "node-1", target: "node-2" }, // remove (node-2 removed)
          ],
        },
        {
          id: "canvas-private",
          name: "Private Canvas",
          playerVisible: false,
          nodes: [],
          edges: [],
        },
      ],
    };

    const bundle = GuestExporter.export(options);

    // Verify maps
    expect(bundle.maps).toHaveLength(1);
    expect(bundle.maps[0].id).toBe("map-public");
    expect(bundle.maps[0].pins).toHaveLength(2);
    expect(bundle.maps[0].pins.map(p => p.id)).toContain("pin-1");
    expect(bundle.maps[0].pins.map(p => p.id)).toContain("pin-3");
    expect(bundle.maps[0].pins.map(p => p.id)).not.toContain("pin-2");

    // Verify canvases
    expect(bundle.canvases).toHaveLength(1);
    expect(bundle.canvases[0].id).toBe("canvas-public");
    expect(bundle.canvases[0].nodes).toHaveLength(2);
    expect(bundle.canvases[0].nodes.map(n => n.id)).toContain("node-1");
    expect(bundle.canvases[0].nodes.map(n => n.id)).toContain("node-3");
    expect(bundle.canvases[0].nodes.map(n => n.id)).not.toContain("node-2");

    expect(bundle.canvases[0].edges).toHaveLength(1);
    expect(bundle.canvases[0].edges[0].id).toBe("edge-1-3");
  });
});

