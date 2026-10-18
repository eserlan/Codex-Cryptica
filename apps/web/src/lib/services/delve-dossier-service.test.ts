import { describe, expect, it, vi } from "vitest";
import type { Canvas } from "@codex/canvas-engine";
import type { Entity } from "schema";
import {
  DelveDossierService,
  type DelveDossierServiceDeps,
} from "./delve-dossier-service";

const sourceEntity = {
  id: "location-1",
  type: "location",
  title: "The Glass Sanctuary",
  content: "A contested sanctuary.",
  lore: "## Secret\nA star sleeps below.",
  labels: ["dungeon"],
  aliases: [],
  connections: [],
  status: "active",
} satisfies Entity;

function canvas(dossierEntityId?: string): Canvas {
  return {
    id: "canvas-1",
    name: "The Glass Sanctuary",
    slug: "the-glass-sanctuary",
    nodes: [],
    edges: [],
    metadata: dossierEntityId ? { dossierEntityId } : {},
  };
}

function deps(
  overrides: Partial<DelveDossierServiceDeps> = {},
): DelveDossierServiceDeps {
  return {
    getEntity: vi.fn(),
    createNote: vi.fn(async () => "dossier-1"),
    updateEntity: vi.fn(async () => true),
    setCanvas: vi.fn(),
    saveCanvas: vi.fn(async () => undefined),
    saveImage: vi.fn(async () => ({
      image: "images/delve-layout.webp",
      thumbnail: "images/delve-layout_thumb.webp",
    })),
    now: vi.fn(() => 1234),
    ...overrides,
  };
}

describe("DelveDossierService", () => {
  it("creates a linked Note and records it on the canvas", async () => {
    const serviceDeps = deps();
    const service = new DelveDossierService(serviceDeps);

    const result = await service.finalize({
      canvas: canvas(),
      nodes: [],
      edges: [],
      sourceEntity,
      dossierTerm: "Lair",
    });

    expect(result).toEqual({ entityId: "dossier-1", created: true });
    expect(serviceDeps.createNote).toHaveBeenCalledWith(
      "The Glass Sanctuary — Lair Dossier",
      expect.objectContaining({
        content: "A contested sanctuary.",
        kind: "delve-dossier",
        connections: [
          expect.objectContaining({
            target: "location-1",
            label: "Dossier for",
          }),
        ],
      }),
    );
    const createdNote = vi.mocked(serviceDeps.createNote).mock.calls[0][1];
    expect(createdNote.lore).not.toContain("> A contested sanctuary.");
    expect(createdNote.lore).not.toContain("Passage Index");
    expect(createdNote.lore).toContain(
      "[Open Lair Canvas](/canvas/the-glass-sanctuary)",
    );
    expect(serviceDeps.setCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          dossierEntityId: "dossier-1",
        }),
      }),
    );
    expect(serviceDeps.saveCanvas).toHaveBeenCalledWith("canvas-1");
  });

  it("updates the linked dossier instead of creating a duplicate", async () => {
    const existing = {
      ...sourceEntity,
      id: "dossier-existing",
      type: "note",
      kind: "delve-dossier",
      labels: ["delve-dossier"],
    } satisfies Entity;
    const serviceDeps = deps({
      getEntity: vi.fn(() => existing),
    });
    const service = new DelveDossierService(serviceDeps);

    const result = await service.finalize({
      canvas: canvas(existing.id),
      nodes: [],
      edges: [],
      sourceEntity,
      dossierTerm: "Delve",
    });

    expect(result).toEqual({ entityId: existing.id, created: false });
    expect(serviceDeps.createNote).not.toHaveBeenCalled();
    expect(serviceDeps.updateEntity).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({
        title: "The Glass Sanctuary — Delve Dossier",
        kind: "delve-dossier",
      }),
    );
  });

  it("saves and embeds a canvas image without using it as the Note cover", async () => {
    const serviceDeps = deps();
    const service = new DelveDossierService(serviceDeps);
    const canvasImage = new Blob(["map"], { type: "image/png" });

    await service.finalize({
      canvas: canvas(),
      nodes: [],
      edges: [],
      sourceEntity,
      dossierTerm: "Delve",
      canvasImage,
    });

    expect(serviceDeps.saveImage).toHaveBeenCalledWith(
      canvasImage,
      sourceEntity.id,
      "the-glass-sanctuary-delve-layout.png",
    );
    const createdNote = vi.mocked(serviceDeps.createNote).mock.calls[0][1];
    expect(createdNote.lore).toContain(
      "![Map of The Glass Sanctuary](images/delve-layout.webp)",
    );
    expect(createdNote.image).toBeUndefined();
    expect(serviceDeps.setCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          dossierCanvasImagePath: "images/delve-layout.webp",
        }),
      }),
    );
  });

  it("does not create a dossier when its requested canvas image cannot be saved", async () => {
    const serviceDeps = deps({
      saveImage: vi.fn(async () => {
        throw new Error("quota");
      }),
    });
    const service = new DelveDossierService(serviceDeps);

    await expect(
      service.finalize({
        canvas: canvas(),
        nodes: [],
        edges: [],
        sourceEntity,
        dossierTerm: "Delve",
        canvasImage: new Blob(["map"], { type: "image/png" }),
      }),
    ).rejects.toThrow("quota");
    expect(serviceDeps.createNote).not.toHaveBeenCalled();
  });

  it("rejects an unsaved canvas without creating a Note", async () => {
    const serviceDeps = deps();
    const service = new DelveDossierService(serviceDeps);

    await expect(
      service.finalize({
        canvas: { nodes: [], edges: [] },
        nodes: [],
        edges: [],
        sourceEntity,
        dossierTerm: "Delve",
      }),
    ).rejects.toThrow("must be saved");
    expect(serviceDeps.createNote).not.toHaveBeenCalled();
  });
});
