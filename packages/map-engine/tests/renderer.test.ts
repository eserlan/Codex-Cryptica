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
});
