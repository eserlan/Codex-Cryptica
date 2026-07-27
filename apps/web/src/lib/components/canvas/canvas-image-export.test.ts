import { beforeEach, describe, expect, it, vi } from "vitest";
import { toBlob } from "html-to-image";
import { exportCanvasImage } from "./canvas-image-export";

vi.mock("html-to-image", () => ({
  toBlob: vi.fn(),
}));

describe("exportCanvasImage", () => {
  beforeEach(() => {
    vi.mocked(toBlob).mockReset();
  });

  it("fits the graph before rendering a high-resolution image", async () => {
    const image = new Blob(["map"], { type: "image/png" });
    vi.mocked(toBlob).mockResolvedValue(image);
    const restoreViewport = vi.fn(async () => undefined);
    const fitGraph = vi.fn(async () => restoreViewport);
    const element = document.createElement("div");

    await expect(exportCanvasImage(element, fitGraph)).resolves.toBe(image);

    expect(fitGraph).toHaveBeenCalledOnce();
    expect(restoreViewport).toHaveBeenCalledOnce();
    expect(toBlob).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        cacheBust: true,
        pixelRatio: expect.any(Number),
      }),
    );
  });

  it("rejects when the canvas renderer produces no image", async () => {
    vi.mocked(toBlob).mockResolvedValue(null);
    const restoreViewport = vi.fn(async () => undefined);

    await expect(
      exportCanvasImage(
        document.createElement("div"),
        async () => restoreViewport,
      ),
    ).rejects.toThrow("could not be rendered");
    expect(restoreViewport).toHaveBeenCalledOnce();
  });
});
