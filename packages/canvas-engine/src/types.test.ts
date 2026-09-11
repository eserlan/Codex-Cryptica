import { describe, expect, it } from "vitest";
import {
  appendCanvasDrawingPoint,
  CanvasDrawingSchema,
  CanvasNodeSchema,
  CanvasSchema,
  normalizeCanvasDrawingColor,
  normalizeCanvasDrawingWidth,
  normalizeCanvasTextBackground,
  normalizeCanvasTextFontSize,
} from "./types";

describe("CanvasSchema", () => {
  it("accepts persisted drawings and preserves their flow coordinates", () => {
    const drawing = {
      id: "drawing-1",
      color: "#ff00aa",
      width: 4,
      points: [
        { x: -20, y: 10 },
        { x: 50, y: 80 },
      ],
    };

    const parsed = CanvasSchema.parse({
      nodes: [],
      edges: [],
      drawings: [drawing],
    });

    expect(parsed.drawings).toEqual([drawing]);
  });

  it("rejects malformed drawings instead of allowing unsafe stroke data", () => {
    expect(() =>
      CanvasDrawingSchema.parse({
        id: "drawing-1",
        color: "red",
        width: 4,
        points: [{ x: 0, y: 0 }],
      }),
    ).toThrow();
    expect(() =>
      CanvasDrawingSchema.parse({
        id: "drawing-1",
        color: "#ff00aa",
        width: 4,
        points: [],
      }),
    ).toThrow();
  });

  it("normalizes valid colors and falls back for invalid color input", () => {
    expect(normalizeCanvasDrawingColor("#AABBCC")).toBe("#aabbcc");
    expect(normalizeCanvasDrawingColor("url(javascript:alert(1))")).toBe(
      "#f97316",
    );
  });

  it("normalizes drawing stroke width and falls back for out-of-range input", () => {
    expect(normalizeCanvasDrawingWidth(8)).toBe(8);
    expect(normalizeCanvasDrawingWidth(0)).toBe(4);
    expect(normalizeCanvasDrawingWidth(-1)).toBe(4);
    expect(normalizeCanvasDrawingWidth(65)).toBe(4);
    expect(normalizeCanvasDrawingWidth(Number.NaN)).toBe(4);
  });

  it("normalizes text note background presets and falls back for unknown keys", () => {
    expect(normalizeCanvasTextBackground("accent")).toBe("accent");
    expect(normalizeCanvasTextBackground("transparent")).toBe("transparent");
    expect(normalizeCanvasTextBackground("not-a-real-key")).toBe("default");
    expect(normalizeCanvasTextBackground("")).toBe("default");
  });

  it("normalizes text note font size and falls back for out-of-range input", () => {
    expect(normalizeCanvasTextFontSize(24)).toBe(24);
    expect(normalizeCanvasTextFontSize(4)).toBe(14);
    expect(normalizeCanvasTextFontSize(200)).toBe(14);
    expect(normalizeCanvasTextFontSize(Number.NaN)).toBe(14);
  });

  it("accepts a text node with its data payload", () => {
    const parsed = CanvasNodeSchema.parse({
      id: "note-1",
      type: "text",
      position: { x: 5, y: 10 },
      width: 200,
      height: 120,
      data: { text: "hello", background: "accent", fontSize: 18 },
    });

    expect(parsed).toMatchObject({
      id: "note-1",
      type: "text",
      data: { text: "hello", background: "accent", fontSize: 18 },
    });
  });

  it("ignores pointer samples that are too close or invalid", () => {
    const drawing = CanvasDrawingSchema.parse({
      id: "drawing-1",
      color: "#ff00aa",
      width: 4,
      points: [{ x: 0, y: 0 }],
    });

    expect(
      appendCanvasDrawingPoint(drawing, { x: 0.1, y: 0.1 }).points,
    ).toHaveLength(1);
    expect(
      appendCanvasDrawingPoint(drawing, { x: 20, y: 30 }).points,
    ).toHaveLength(2);
    expect(
      appendCanvasDrawingPoint(drawing, { x: Number.NaN, y: 1 }).points,
    ).toHaveLength(1);
  });

  it("round-trips persisted Delve nodes and edge data", () => {
    const persisted = {
      id: "delve-canvas-bruneth",
      name: "The Hollowed Citadel of Bruneth",
      nodes: [
        {
          id: "sector-1",
          type: "delveSectorGroup",
          position: { x: 0, y: 0 },
          width: 600,
          height: 400,
          data: {
            id: "sector-1",
            name: "The Sunken Forge",
            theme: "Dungeon Chamber",
            description: "",
            order: 1,
          },
        },
        {
          id: "room-1-1",
          type: "delveRoom",
          parentId: "sector-1",
          extent: "parent",
          position: { x: 40, y: 60 },
          width: 220,
          height: 120,
          data: {
            id: "room-1-1",
            sectorId: "sector-1",
            sectorName: "The Sunken Forge",
            name: "The Sunken Forge - Area 1",
            role: "entrance",
            summary: "The entrance",
            description: "A dark chamber.",
            stocking: { atmosphere: "Chilly stone air" },
          },
        },
      ],
      edges: [
        {
          id: "edge-room-1-1-room-1-2",
          source: "room-1-1",
          target: "room-1-2",
          type: "delveEdge",
          data: {
            sourceRoomId: "room-1-1",
            targetRoomId: "room-1-2",
            type: "standard",
            bidirectional: true,
          },
        },
      ],
      metadata: {
        sourceEntityId: "entity-bruneth",
        kind: "delve",
      },
    };

    const parsed = CanvasSchema.parse(JSON.parse(JSON.stringify(persisted)));

    expect(parsed).toEqual(persisted);
  });

  it("still rejects ordinary entity nodes without an entity id", () => {
    expect(() =>
      CanvasSchema.parse({
        nodes: [
          {
            id: "broken-node",
            type: "entity",
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      }),
    ).toThrow();
  });

  it("accepts persisted file nodes but rejects a file without vault metadata", () => {
    const canvas = {
      nodes: [
        {
          id: "file-1",
          type: "file",
          position: { x: 10, y: 20 },
          file: {
            path: "files/id-map.pdf",
            name: "map.pdf",
            mimeType: "application/pdf",
            size: 42,
          },
        },
      ],
      edges: [],
    };

    expect(CanvasSchema.parse(canvas).nodes[0]).toMatchObject(canvas.nodes[0]);
    expect(() =>
      CanvasSchema.parse({
        ...canvas,
        nodes: [
          {
            ...canvas.nodes[0],
            file: { ...canvas.nodes[0].file, path: "map.pdf" },
          },
        ],
      }),
    ).toThrow();
  });

  it("migrates legacy delve nodes whose payload lived at the node root", () => {
    const parsed = CanvasSchema.parse({
      id: "legacy-delve",
      nodes: [
        {
          id: "room-1",
          type: "delveRoom",
          position: { x: 10, y: 20 },
          sectorId: "sector-1",
          sectorName: "The Bell Vault",
          name: "Riven Threshold",
          role: "entrance",
          summary: "A cracked gate.",
          description: "Bronze doors hang from one hinge.",
          stocking: { atmosphere: "Cold metal and rain" },
        },
      ],
      edges: [],
    });

    expect(parsed.nodes[0]).toMatchObject({
      id: "room-1",
      type: "delveRoom",
      position: { x: 10, y: 20 },
      data: {
        id: "room-1",
        sectorId: "sector-1",
        sectorName: "The Bell Vault",
        name: "Riven Threshold",
        role: "entrance",
      },
    });
    expect(parsed.nodes[0]).not.toHaveProperty("sectorId");
  });
});
