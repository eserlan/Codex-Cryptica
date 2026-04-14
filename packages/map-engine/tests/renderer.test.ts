import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderMap } from "../src/renderer";

function createContextMock() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 60 }),
    createPattern: vi.fn().mockReturnValue({}),
    lineWidth: 0,
  } as any;
}

describe("Map Engine Renderer", () => {
  let mockCtx: any;
  let offscreenCtx: any;
  let mockCanvas: any;
  let createdCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCtx = createContextMock();
    offscreenCtx = createContextMock();

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 1000,
      height: 800,
    };
    createdCanvas = null;

    // Use a manual mock for document.createElement
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") {
        createdCanvas = {
          getContext: vi.fn().mockReturnValue(offscreenCtx),
          width: 0,
          height: 0,
        } as any;
        return createdCanvas;
      }
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should clear canvas and return if no image", () => {
    renderMap({
      canvas: mockCanvas,
      image: null,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
    });

    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.drawImage).not.toHaveBeenCalled();
  });

  it("should draw the background image", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
    });

    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      mockImage,
      -250,
      -200,
      500,
      400,
    );
  });

  it("should draw square grid", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid: {
        type: "square",
        size: 50,
        color: "red",
        opacity: 0.5,
      },
    });

    expect(mockCtx.createPattern).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(offscreenCtx.lineWidth).toBe(1.5);
  });

  it("should return early for hex grid (not implemented)", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid: {
        type: "hex",
        size: 50,
        color: "blue",
        opacity: 0.5,
      },
    });

    expect(mockCtx.createPattern).not.toHaveBeenCalled();
  });

  it("should use cached pattern if parameters are identical", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    const grid = {
      type: "square" as const,
      size: 50,
      color: "red",
      opacity: 0.5,
    };
    const options = {
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid,
    };

    renderMap(options);
    renderMap(options);

    expect(mockCtx.createPattern).toHaveBeenCalledTimes(1);
  });

  it("should draw fog of war", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    const mockMask = { width: 500, height: 400 } as HTMLCanvasElement;
    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: mockMask,
      showFog: true,
    });

    // Check for destination-out composite op
    expect(mockCtx.drawImage).toHaveBeenCalled(); // 1 for image, 1 for fog overlay
    expect(offscreenCtx.drawImage).toHaveBeenCalledWith(
      mockMask,
      -250,
      -200,
      500,
      400,
    );
  });

  it("should draw tokens beneath fog of war", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    const tokenImage = { width: 80, height: 40 } as HTMLImageElement;

    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: { width: 500, height: 400 } as HTMLCanvasElement,
      showFog: true,
      tokens: [
        {
          id: "token-1",
          x: 100,
          y: 120,
          width: 64,
          height: 64,
          rotation: 0,
          color: "#f59e0b",
          label: "Goblin",
          image: tokenImage,
          selected: true,
          active: false,
          visible: true,
        },
      ],
    });

    expect(mockCtx.drawImage).toHaveBeenNthCalledWith(
      1,
      mockImage,
      -250,
      -200,
      500,
      400,
    );
    expect(mockCtx.drawImage).toHaveBeenNthCalledWith(
      2,
      tokenImage,
      -64,
      -32,
      128,
      64,
    );
    expect(mockCtx.drawImage).toHaveBeenNthCalledWith(3, createdCanvas, 0, 0);
  });

  it("should draw pins and cull those outside viewport", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    const pins = [
      { id: "p1", coordinates: { x: 0, y: 0 }, visuals: { color: "blue" } },
      {
        id: "p2",
        coordinates: { x: 5000, y: 5000 },
        visuals: { color: "red" },
      }, // Cull me
    ];

    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: pins as any,
      maskCanvas: null,
      showFog: false,
    });

    expect(mockCtx.arc).toHaveBeenCalledTimes(1);
    expect(mockCtx.fillStyle).toBe("blue");
  });

  it("should draw tokens and measurement overlays", () => {
    const mockImage = { width: 500, height: 400 } as HTMLImageElement;
    const tokenImage = { width: 80, height: 40 } as HTMLImageElement;

    renderMap({
      canvas: mockCanvas,
      image: mockImage,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [
        {
          id: "token-1",
          x: 100,
          y: 120,
          width: 64,
          height: 64,
          rotation: 0,
          color: "#f59e0b",
          label: "Goblin",
          image: tokenImage,
          selected: true,
          active: false,
          visible: true,
        },
      ],
      measurement: {
        active: true,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        label: "141 px",
      },
    });

    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      tokenImage,
      -64,
      -32,
      128,
      64,
    );
    expect(mockCtx.arc).toHaveBeenCalledWith(0, 0, 32, 0, Math.PI * 2);
    expect(mockCtx.setLineDash).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      "Goblin",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("returns early when the canvas context is unavailable", () => {
    const canvasWithoutContext = {
      getContext: vi.fn().mockReturnValue(null),
      width: 1000,
      height: 800,
    } as any;

    renderMap({
      canvas: canvasWithoutContext,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
    });

    expect(canvasWithoutContext.getContext).toHaveBeenCalledWith("2d");
  });

  it("falls back to filling the token when the image has no intrinsic size", () => {
    renderMap({
      canvas: mockCanvas,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [
        {
          id: "token-fallback",
          x: 40,
          y: 50,
          width: 64,
          height: 64,
          rotation: 0,
          color: "#10b981",
          label: "",
          image: { width: 0, height: 0 } as HTMLImageElement,
          visible: true,
        },
      ],
    });

    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.fillStyle).toBe("#10b981");
  });

  it("draws active and dead token treatments with status icon bar", () => {
    renderMap({
      canvas: mockCanvas,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      accentColor: "#c2410c",
      tokens: [
        {
          id: "token-status",
          x: 120,
          y: 140,
          width: 72,
          height: 72,
          rotation: 15,
          color: "#f59e0b",
          label: "Champion",
          visible: true,
          active: true,
          statusEffects: ["dead", "stunned", "prone", "poisoned", "invisible"],
        },
      ],
    });

    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      "Champion",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("skips hidden and offscreen tokens", () => {
    renderMap({
      canvas: mockCanvas,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      tokens: [
        {
          id: "hidden-token",
          x: 10,
          y: 10,
          width: 32,
          height: 32,
          rotation: 0,
          color: "#f59e0b",
          label: "Hidden",
          visible: false,
        },
        {
          id: "far-away-token",
          x: 9000,
          y: 9000,
          width: 32,
          height: 32,
          rotation: 0,
          color: "#f59e0b",
          label: "Far",
          visible: true,
        },
      ],
    });

    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it("draws a fixed grid without translating the context", () => {
    renderMap({
      canvas: mockCanvas,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 120, y: 80 }, zoom: 1.5 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid: {
        type: "square",
        size: 40,
        color: "#94a3b8",
        opacity: 0.25,
        fixed: true,
      },
    });

    expect(mockCtx.translate).toHaveBeenCalledTimes(1);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(-60, -60, 1120, 920);
  });

  it("applies grid offsets when drawing a scrolling grid", () => {
    renderMap({
      canvas: mockCanvas,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 25, y: -15 }, zoom: 2 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid: {
        type: "square",
        size: 25,
        color: "#ef4444",
        opacity: 0.4,
        offsetX: 5,
        offsetY: 10,
      },
    });

    expect(mockCtx.translate).toHaveBeenNthCalledWith(2, 35, 5);
  });

  it("skips drawing the grid when the zoomed cell size is too small", () => {
    renderMap({
      canvas: mockCanvas,
      image: { width: 500, height: 400 } as HTMLImageElement,
      transform: { pan: { x: 0, y: 0 }, zoom: 0.01 },
      canvasSize: { width: 1000, height: 800 },
      pins: [],
      maskCanvas: null,
      showFog: false,
      grid: {
        type: "square",
        size: 50,
        color: "#ef4444",
        opacity: 0.4,
      },
    });

    expect(mockCtx.createPattern).not.toHaveBeenCalled();
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });
});
