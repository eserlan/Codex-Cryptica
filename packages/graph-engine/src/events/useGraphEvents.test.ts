import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupGraphEvents } from "./useGraphEvents";
import type { Core } from "cytoscape";

describe("setupGraphEvents", () => {
  let mockCy: any;

  beforeEach(() => {
    mockCy = {
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it("should register event listeners on the cy instance", () => {
    const cleanup = setupGraphEvents(mockCy as unknown as Core, {});
    expect(mockCy.on).toHaveBeenCalled();
    expect(cleanup).toBeDefined();
  });

  it("should call off when cleanup is executed", () => {
    const cleanup = setupGraphEvents(mockCy as unknown as Core, {});
    cleanup();
    expect(mockCy.off).toHaveBeenCalled();
  });

  it("should apply lod-low classes when zoomed out far", () => {
    setupGraphEvents(mockCy as unknown as Core, {});

    // Find the zoom handler
    const zoomHandler = mockCy.on.mock.calls.find(
      (call: any) => call[0] === "pan zoom",
    )[1];

    const mockElements = {
      addClass: vi.fn().mockReturnThis(),
      removeClass: vi.fn().mockReturnThis(),
    };
    mockCy.elements = vi.fn().mockReturnValue(mockElements);
    mockCy.zoom = vi.fn().mockReturnValue(0.1);
    mockCy.batch = vi.fn((cb) => cb());

    zoomHandler();

    expect(mockElements.addClass).toHaveBeenCalledWith("lod-low");
    expect(mockElements.removeClass).toHaveBeenCalledWith("lod-medium");
  });

  it("should register a double-click node handler", () => {
    const onNodeDoubleTap = vi.fn();
    setupGraphEvents(mockCy as unknown as Core, { onNodeDoubleTap });

    const doubleClickHandler = mockCy.on.mock.calls.find(
      (call: any) => call[0] === "dblclick dbltap",
    )[2];

    doubleClickHandler({ target: { id: () => "node-1" } });

    expect(onNodeDoubleTap).toHaveBeenCalledWith(
      "node-1",
      expect.objectContaining({
        id: expect.any(Function),
      }),
    );
  });

  it("should apply lod-medium classes at medium zoom", () => {
    setupGraphEvents(mockCy as unknown as Core, {});

    const zoomHandler = mockCy.on.mock.calls.find(
      (call: any) => call[0] === "pan zoom",
    )[1];

    const mockElements = {
      addClass: vi.fn().mockReturnThis(),
      removeClass: vi.fn().mockReturnThis(),
    };
    mockCy.elements = vi.fn().mockReturnValue(mockElements);
    mockCy.zoom = vi.fn().mockReturnValue(0.3);
    mockCy.batch = vi.fn((cb) => cb());

    zoomHandler();

    expect(mockElements.addClass).toHaveBeenCalledWith("lod-medium");
    expect(mockElements.removeClass).toHaveBeenCalledWith("lod-low");
  });

  it("should remove all lod classes when zoomed in", () => {
    setupGraphEvents(mockCy as unknown as Core, {});

    const zoomHandler = mockCy.on.mock.calls.find(
      (call: any) => call[0] === "pan zoom",
    )[1];

    const mockElements = {
      addClass: vi.fn().mockReturnThis(),
      removeClass: vi.fn().mockReturnThis(),
    };
    mockCy.elements = vi.fn().mockReturnValue(mockElements);
    mockCy.zoom = vi.fn().mockReturnValue(0.8);
    mockCy.batch = vi.fn((cb) => cb());

    // First zoom out to set a state
    mockCy.zoom.mockReturnValue(0.1);
    zoomHandler();

    // Zoom in
    mockCy.zoom.mockReturnValue(0.8);
    zoomHandler();

    expect(mockElements.removeClass).toHaveBeenCalledWith("lod-low lod-medium");
  });
});
