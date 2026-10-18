import { describe, expect, it } from "vitest";
import { VTTLayerManager } from "./vtt-layer-manager.svelte";

describe("VTTLayerManager", () => {
  it("defaults to the terrain layer", () => {
    expect(new VTTLayerManager().activeLayer).toBe("terrain");
  });

  it("switches the active layer", () => {
    const manager = new VTTLayerManager();
    manager.setActiveLayer("object");
    expect(manager.activeLayer).toBe("object");
  });
});
