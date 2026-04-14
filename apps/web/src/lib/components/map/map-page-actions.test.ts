import { describe, expect, it, vi } from "vitest";
import { handleActiveMapSelection } from "./map-page-actions";

describe("handleActiveMapSelection", () => {
  it("selects the map and broadcasts to guests while hosting", async () => {
    const selectMap = vi.fn();
    const broadcastActiveMapSync = vi.fn().mockResolvedValue(undefined);

    await handleActiveMapSelection({
      mapId: "map-2",
      selectMap,
      isHosting: true,
      broadcastActiveMapSync,
    });

    expect(selectMap).toHaveBeenCalledWith("map-2");
    expect(broadcastActiveMapSync).toHaveBeenCalled();
  });

  it("selects the map without broadcasting when not hosting", async () => {
    const selectMap = vi.fn();
    const broadcastActiveMapSync = vi.fn().mockResolvedValue(undefined);

    await handleActiveMapSelection({
      mapId: "map-2",
      selectMap,
      isHosting: false,
      broadcastActiveMapSync,
    });

    expect(selectMap).toHaveBeenCalledWith("map-2");
    expect(broadcastActiveMapSync).not.toHaveBeenCalled();
  });
});
