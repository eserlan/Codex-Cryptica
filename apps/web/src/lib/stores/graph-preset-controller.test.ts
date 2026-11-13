import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GraphPresetController,
  type PresetHost,
} from "./graph-preset-controller";

const positions = { a: { x: 1, y: 2 } } as any;

const makeHost = (): PresetHost => ({
  activeLabels: new Set(),
  labelFilterMode: "OR",
  activeCategories: new Set(),
  showLabels: true,
  showImages: true,
  stableLayout: true,
  timelineMode: false,
  timelineAxis: "x",
  timelineRange: { start: null, end: null },
  timelineScale: 100,
  orbitMode: false,
  centralNodeId: null,
  layoutOverride: null,
});

const makePresets = () => ({
  presets: [] as any[],
  activePresetId: null as string | null,
  loadedVaultId: "vault-1" as string | null,
  loadPresets: vi.fn(async () => []),
  savePreset: vi.fn(async (_v: string, name: string) => ({ id: "p1", name })),
  setPresetLayout: vi.fn(),
  applyPreset: vi.fn(),
  renamePreset: vi.fn(),
  deletePreset: vi.fn(),
});

const vaultStub = (id: string | null = "vault-1") =>
  ({ activeVaultId: id, allEntities: [] }) as any;

let host: PresetHost;
let presets: ReturnType<typeof makePresets>;
let controller: GraphPresetController;

beforeEach(() => {
  host = makeHost();
  presets = makePresets();
  controller = new GraphPresetController(
    host,
    () => vaultStub(),
    presets as any,
  );
});

describe("GraphPresetController", () => {
  it("saves under the trimmed name and shows the saved layout", async () => {
    const layout = { positions } as any;
    const saved = await controller.save("  Cast  ", undefined, layout);

    expect(presets.savePreset).toHaveBeenCalledWith(
      "vault-1",
      "Cast",
      expect.objectContaining({ labelFilterMode: "OR" }),
    );
    expect(saved).toMatchObject({ name: "Cast" });
    expect(host.layoutOverride).toBe(positions);
  });

  it("rejects an empty name without touching storage", async () => {
    expect(await controller.save("   ")).toBeNull();
    expect(presets.savePreset).not.toHaveBeenCalled();
  });

  it("keeps the current layout when saving fails", async () => {
    host.layoutOverride = positions;
    presets.savePreset.mockResolvedValue(null as any);

    expect(
      await controller.save("Cast", undefined, { positions: {} } as any),
    ).toBeNull();
    expect(host.layoutOverride).toBe(positions);
  });

  it("falls back to the default vault id", async () => {
    controller = new GraphPresetController(
      host,
      () => vaultStub(null),
      presets as any,
    );
    await controller.save("Cast");
    expect(presets.savePreset.mock.calls[0][0]).toBe("default");
  });

  it("drops another vault's layout when loading a different vault", async () => {
    host.layoutOverride = positions;
    presets.loadedVaultId = "vault-2";
    await controller.load();
    expect(host.layoutOverride).toBeNull();

    host.layoutOverride = positions;
    presets.loadedVaultId = "vault-1";
    await controller.load();
    expect(host.layoutOverride).toBe(positions);
  });

  it("applies a view, reports a mode flip and the layout it shows", () => {
    presets.applyPreset.mockReturnValue({
      id: "p1",
      state: {
        activeLabels: [],
        labelFilterMode: "AND",
        activeCategories: [],
        timelineMode: true,
        layout: { positions },
      },
    });

    const result = controller.apply("p1");

    expect(host.labelFilterMode).toBe("AND");
    expect(host.timelineMode).toBe(true);
    expect(result?.modeChanged).toBe(true);
    // Timeline arranges entities itself, so the saved layout is not used.
    expect(result?.layoutApplied).toBe(false);
    expect(host.layoutOverride).toBeNull();
  });

  it("returns null and changes nothing for an unknown view", () => {
    presets.applyPreset.mockReturnValue(null);
    expect(controller.apply("nope")).toBeNull();
    expect(host.labelFilterMode).toBe("OR");
  });

  it("clears the layout only when the removed view was the open one", async () => {
    host.layoutOverride = positions;
    presets.activePresetId = "other";
    await controller.remove("p1");
    expect(host.layoutOverride).toBe(positions);

    presets.activePresetId = "p1";
    await controller.remove("p1");
    expect(host.layoutOverride).toBeNull();
  });

  it("updates the screen only when the changed view is the open one", async () => {
    presets.setPresetLayout.mockResolvedValue({
      id: "p1",
      state: { layout: { positions } },
    });
    presets.activePresetId = "other";
    await controller.updateLayout("p1", undefined, { positions } as any);
    expect(host.layoutOverride).toBeNull();

    presets.activePresetId = "p1";
    await controller.updateLayout("p1", undefined, { positions } as any);
    expect(host.layoutOverride).toBe(positions);
  });

  it("changes nothing when the layout update cannot be stored", async () => {
    presets.setPresetLayout.mockResolvedValue(null);
    presets.activePresetId = "p1";
    host.layoutOverride = positions;

    expect(await controller.updateLayout("p1", undefined, null)).toBeNull();
    expect(host.layoutOverride).toBe(positions);
  });
});
