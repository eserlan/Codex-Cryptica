import { describe, expect, it, vi } from "vitest";
import { renderMap } from "./renderer";

function createCtxMock() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    createPattern: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    textAlign: "center",
    textBaseline: "alphabetic",
    font: "",
  } as unknown as CanvasRenderingContext2D;
}

function createCanvasMock(ctx: CanvasRenderingContext2D) {
  return {
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;
}

describe("renderMap", () => {
  it("still draws pins and skips the background when there is no image (blank map)", () => {
    const ctx = createCtxMock();
    const canvas = createCanvasMock(ctx);

    renderMap({
      canvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          mapId: "22222222-2222-2222-2222-222222222222",
          coordinates: { x: 0, y: 0 },
          visuals: { color: "#ff0000" },
        },
      ],
      maskCanvas: null,
      showFog: false,
      grid: { type: "none", size: 50, color: "#fff", opacity: 0.5 },
    });

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("draws the background image when present", () => {
    const ctx = createCtxMock();
    const canvas = createCanvasMock(ctx);
    const image = { width: 500, height: 400 } as HTMLImageElement;

    renderMap({
      canvas,
      image,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [],
      maskCanvas: null,
      showFog: false,
    });

    expect(ctx.drawImage).toHaveBeenCalledWith(image, -250, -200, 500, 400);
  });

  it("draws the grid above tiles/tokens, not underneath them", () => {
    // jsdom has no real canvas backend; drawGrid's offscreen pattern canvas
    // needs a working 2d context to reach ctx.createPattern.
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "canvas") return realCreateElement(tag);
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          strokeRect: vi.fn(),
          strokeStyle: "",
          globalAlpha: 1,
          lineWidth: 0,
        }),
      } as unknown as HTMLCanvasElement;
    });

    const events: string[] = [];
    const ctx = createCtxMock();
    (ctx.drawImage as any).mockImplementation(() => events.push("drawImage"));
    (ctx.createPattern as any).mockImplementation(() => {
      events.push("createPattern");
      return {};
    });
    const canvas = createCanvasMock(ctx);
    const tileImage = { width: 150, height: 150 } as HTMLImageElement;

    renderMap({
      canvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid: { type: "square", size: 50, color: "#fff", opacity: 0.5 },
      tokens: [
        {
          id: "tile-1",
          x: 0,
          y: 0,
          width: 150,
          height: 150,
          rotation: 0,
          baseShape: "square",
          label: "",
          image: tileImage,
          color: "#64748b",
          selected: false,
          primarySelected: false,
          active: false,
          visible: true,
        } as any,
      ],
    });

    expect(events).toEqual(["drawImage", "createPattern"]);
    vi.restoreAllMocks();
  });

  function baseToken(overrides: Partial<any>) {
    return {
      id: "token-1",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      baseShape: "circle",
      label: "",
      image: null,
      color: "#64748b",
      selected: false,
      primarySelected: false,
      active: false,
      visible: true,
      ...overrides,
    };
  }

  function strokeWidthsFor(token: any) {
    const ctx = createCtxMock();
    const lineWidths: number[] = [];
    (ctx.stroke as any).mockImplementation(() =>
      lineWidths.push(ctx.lineWidth),
    );
    const canvas = createCanvasMock(ctx);

    renderMap({
      canvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [token],
    });

    // [outer drop shadow, main border, highlight]
    return lineWidths;
  }

  function drawImageArgsFor(token: any) {
    const ctx = createCtxMock();
    const calls: any[] = [];
    (ctx.drawImage as any).mockImplementation((...args: any[]) =>
      calls.push(args),
    );
    const canvas = createCanvasMock(ctx);

    renderMap({
      canvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [token],
    });

    return calls[0]; // [image, dx, dy, dw, dh]
  }

  function noteTextFor(token: any, charWidth = 6) {
    const ctx = createCtxMock();
    const texts: string[] = [];
    (ctx.fillText as any).mockImplementation((text: string) =>
      texts.push(text),
    );
    (ctx.measureText as any).mockImplementation((text: string) => ({
      width: text.length * charWidth,
    }));
    const canvas = createCanvasMock(ctx);

    renderMap({
      canvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [token],
    });

    return texts;
  }

  it("previews a note's body on its face, wrapped across lines", () => {
    const texts = noteTextFor(
      baseToken({
        kind: "note",
        baseShape: "square",
        width: 150,
        height: 150,
        noteBody: "Two goblins arguing over a map",
      }),
    );

    expect(texts.length).toBeGreaterThan(1);
    expect(texts.join(" ")).toContain("Two goblins");
  });

  it("draws a note's markdown without its markers", () => {
    const texts = noteTextFor(
      baseToken({
        kind: "note",
        baseShape: "square",
        width: 200,
        height: 200,
        noteBody: "## Guard post\n- **2 goblins** arguing\n- *one* is asleep",
      }),
      3,
    );

    const drawn = texts.join(" ");
    expect(drawn).toContain("Guard post");
    expect(drawn).toContain("2 goblins");
    expect(drawn).toContain("asleep");
    // The markers are formatting instructions, not text to read off the map.
    expect(drawn).not.toContain("#");
    expect(drawn).not.toContain("*");
    expect(drawn).not.toContain("-");
  });

  it("marks a note body that does not fit rather than dropping it silently", () => {
    const texts = noteTextFor(
      baseToken({
        kind: "note",
        baseShape: "square",
        width: 60,
        height: 60,
        noteBody:
          "A very long note that cannot possibly fit inside this small square",
      }),
    );

    expect(texts.at(-1)).toContain("…");
  });

  it("draws no body text on a note too small to read", () => {
    const texts = noteTextFor(
      baseToken({
        kind: "note",
        baseShape: "square",
        width: 20,
        height: 20,
        noteBody: "Hidden",
      }),
    );

    expect(texts).toEqual([]);
  });

  it("draws a collapsed note as a marker with no body text", () => {
    const texts = noteTextFor(
      baseToken({
        kind: "note",
        baseShape: "square",
        width: 150,
        height: 150,
        noteCollapsed: true,
        noteBody: "Two goblins arguing over a map",
      }),
    );

    // Big enough that an expanded note would have shown its body.
    expect(texts).toEqual([]);
  });

  it("does not try to draw an image for a note", () => {
    const image = { width: 100, height: 100 } as HTMLImageElement;
    const ctx = createCtxMock();
    const canvas = createCanvasMock(ctx);

    renderMap({
      canvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 800, height: 600 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [baseToken({ kind: "note", image, noteBody: "" })],
    });

    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("center-crops a portrait image by default (equal overflow trimmed on both sides)", () => {
    const image = { width: 100, height: 200 } as HTMLImageElement; // aspect 0.5, taller than wide
    const [, dx, dy, dw, dh] = drawImageArgsFor(
      baseToken({ width: 100, height: 100, image }),
    );

    expect([dx, dy, dw, dh]).toEqual([-50, -100, 100, 200]);
  });

  it("pins the top of a portrait image to the token's top edge with imageFocus: top", () => {
    const image = { width: 100, height: 200 } as HTMLImageElement;
    const [, dx, dy] = drawImageArgsFor(
      baseToken({ width: 100, height: 100, image, imageFocus: "top" }),
    );

    expect([dx, dy]).toEqual([-50, -50]);
  });

  it("pins the bottom of a portrait image to the token's bottom edge with imageFocus: bottom", () => {
    const image = { width: 100, height: 200 } as HTMLImageElement;
    const [, dx, dy] = drawImageArgsFor(
      baseToken({ width: 100, height: 100, image, imageFocus: "bottom" }),
    );

    expect([dx, dy]).toEqual([-50, -150]);
  });

  it("pins left/right on a landscape image with imageFocus, ignoring the (irrelevant) vertical axis", () => {
    const image = { width: 200, height: 100 } as HTMLImageElement; // aspect 2, wider than tall
    const left = drawImageArgsFor(
      baseToken({ width: 100, height: 100, image, imageFocus: "left" }),
    );
    const right = drawImageArgsFor(
      baseToken({ width: 100, height: 100, image, imageFocus: "right" }),
    );

    expect([left[1], left[2]]).toEqual([-50, -50]);
    expect([right[1], right[2]]).toEqual([-150, -50]);
  });

  it("scales an active token's selection ring down for a small token instead of a fixed pixel width", () => {
    const [, largeMainBorder] = strokeWidthsFor(
      baseToken({ active: true, width: 100, height: 100 }),
    );
    const [, smallMainBorder] = strokeWidthsFor(
      baseToken({ active: true, width: 30, height: 30 }),
    );

    // Unchanged from the fixed 8px width previously used for every size.
    expect(largeMainBorder).toBe(8);
    // radius(15) * 0.25 = 3.75, well under the old fixed 8px.
    expect(smallMainBorder).toBeCloseTo(3.75);
    expect(smallMainBorder).toBeLessThan(largeMainBorder);
  });
});
