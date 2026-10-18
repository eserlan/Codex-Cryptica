/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const graph = vi.hoisted(() => ({
  viewPresets: [] as any[],
  timelineMode: false,
  orbitMode: false,
  activeViewPresetId: null as string | null,
  saveViewPreset: vi.fn(),
  updateViewPresetLayout: vi.fn(),
  applyViewPreset: vi.fn(),
  renameViewPreset: vi.fn(),
  deleteViewPreset: vi.fn(),
  resetView: vi.fn(),
}));
vi.mock("$lib/stores/graph.svelte", () => ({ graph }));

// jsdom has no Web Animations API, which the panel's fade drives.
vi.mock("svelte/transition", async (importOriginal) => ({
  ...(await importOriginal<typeof import("svelte/transition")>()),
  fade: () => ({ duration: 0 }),
}));

import GraphViewPresets from "./GraphViewPresets.svelte";

const camera = { pan: { x: 4, y: 5 }, zoom: 1.5 };

function fakeCy(
  nodes: Array<{ id: string; x: number; y: number; visible?: boolean }>,
) {
  const wrapped = nodes.map((n) => ({
    id: () => n.id,
    visible: () => n.visible !== false,
    data: () => undefined,
    position: () => ({ x: n.x, y: n.y }),
  }));
  return {
    pan: () => ({ ...camera.pan }),
    zoom: () => camera.zoom,
    nodes: () => ({ forEach: (cb: (n: any) => void) => wrapped.forEach(cb) }),
    batch: (fn: () => void) => fn(),
    animate: vi.fn(),
  } as any;
}

const preset = (id: string, name: string, layout = false) => ({
  id,
  name,
  createdAt: 1,
  updatedAt: 1,
  state: {
    activeLabels: [],
    labelFilterMode: "OR",
    activeCategories: [],
    viewport: camera,
    ...(layout ? { layout: { positions: { a: { x: 1, y: 1 } } } } : {}),
  },
});

const shown = [
  { id: "a", x: 10.2, y: 20.7 },
  { id: "b", x: -3, y: 4 },
];

async function open(cy: any) {
  const view = render(GraphViewPresets, { props: { cy } });
  await fireEvent.click(screen.getByTestId("view-presets-toggle"));
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  graph.viewPresets = [];
  graph.timelineMode = false;
  graph.orbitMode = false;
  graph.activeViewPresetId = null;
  graph.saveViewPreset.mockImplementation(async (name: string) => ({
    id: "new",
    name,
  }));
  graph.updateViewPresetLayout.mockResolvedValue({ id: "p1" });
  graph.applyViewPreset.mockReturnValue(null);
});

const typeName = (name: string) =>
  fireEvent.input(screen.getByTestId("view-preset-name-input"), {
    target: { value: name },
  });

describe("GraphViewPresets: saving a layout with a view (#3456)", () => {
  it("offers 'Save current layout', off by default", async () => {
    await open(fakeCy(shown));

    const box = screen.getByTestId(
      "view-preset-save-layout",
    ) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(false);
  });

  it("saves a filter-only view, as before, when the option is left off", async () => {
    await open(fakeCy(shown));
    await typeName("Just filters");

    await fireEvent.click(screen.getByTestId("view-preset-save"));

    await waitFor(() => expect(graph.saveViewPreset).toHaveBeenCalledTimes(1));
    expect(graph.saveViewPreset).toHaveBeenCalledWith(
      "Just filters",
      camera,
      undefined,
    );
    expect(screen.queryByTestId("view-preset-layout-status")).toBeNull();
  });

  it("saves the position of every entity shown, and the camera, when the option is on", async () => {
    await open(fakeCy(shown));
    await typeName("Faction map");
    await fireEvent.click(screen.getByTestId("view-preset-save-layout"));

    await fireEvent.click(screen.getByTestId("view-preset-save"));

    await waitFor(() => expect(graph.saveViewPreset).toHaveBeenCalledTimes(1));
    expect(graph.saveViewPreset).toHaveBeenCalledWith("Faction map", camera, {
      positions: { a: { x: 10, y: 21 }, b: { x: -3, y: 4 } },
    });
    expect(
      (await screen.findByTestId("view-preset-layout-status")).textContent,
    ).toContain('Saved "Faction map" with its layout');
  });

  it("goes back to off after saving, so the next view is filter-only unless asked (negative)", async () => {
    await open(fakeCy(shown));
    await typeName("One");
    await fireEvent.click(screen.getByTestId("view-preset-save-layout"));
    await fireEvent.click(screen.getByTestId("view-preset-save"));
    await waitFor(() => expect(graph.saveViewPreset).toHaveBeenCalled());

    await waitFor(() =>
      expect(
        (screen.getByTestId("view-preset-save-layout") as HTMLInputElement)
          .checked,
      ).toBe(false),
    );
  });

  it("cannot be turned on in timeline or orbit mode, and says why (negative)", async () => {
    graph.timelineMode = true;
    await open(fakeCy(shown));

    expect(
      (screen.getByTestId("view-preset-save-layout") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByTestId("view-preset-layout-reason").textContent).toMatch(
      /timeline and orbit/i,
    );
  });

  it("cannot be turned on when nothing is shown, and says why (negative)", async () => {
    await open(fakeCy([{ id: "a", x: 1, y: 1, visible: false }]));

    expect(
      (screen.getByTestId("view-preset-save-layout") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByTestId("view-preset-layout-reason").textContent).toMatch(
      /nothing is shown/i,
    );
  });
});

describe("GraphViewPresets: updating and removing a layout (#3456)", () => {
  beforeEach(() => {
    graph.viewPresets = [
      preset("p1", "Faction map", true),
      preset("p2", "Plain"),
    ];
    graph.activeViewPresetId = "p1";
  });

  it("marks the view that has a layout, and only that one", async () => {
    await open(fakeCy(shown));

    expect(screen.getAllByTestId("view-preset-has-layout")).toHaveLength(1);
  });

  it("keeps what is on screen as the view's layout, with the camera", async () => {
    await open(fakeCy(shown));

    await fireEvent.click(
      screen.getByRole("button", {
        name: 'Update layout snapshot for "Faction map"',
      }),
    );

    await waitFor(() =>
      expect(graph.updateViewPresetLayout).toHaveBeenCalledWith("p1", camera, {
        positions: { a: { x: 10, y: 21 }, b: { x: -3, y: 4 } },
      }),
    );
    expect(
      (await screen.findByTestId("view-preset-layout-status")).textContent,
    ).toContain('Layout saved to "Faction map"');
  });

  it("can add a layout to a view that has none, when that view is open", async () => {
    graph.activeViewPresetId = "p2";
    await open(fakeCy(shown));

    await fireEvent.click(
      screen.getByRole("button", { name: 'Save current layout to "Plain"' }),
    );

    await waitFor(() =>
      expect(graph.updateViewPresetLayout).toHaveBeenCalledWith(
        "p2",
        camera,
        expect.objectContaining({ positions: expect.any(Object) }),
      ),
    );
  });

  it("removes a layout and says the filters are kept", async () => {
    await open(fakeCy(shown));

    await fireEvent.click(
      screen.getByRole("button", {
        name: 'Remove saved layout from "Faction map"',
      }),
    );

    await waitFor(() =>
      expect(graph.updateViewPresetLayout).toHaveBeenCalledWith(
        "p1",
        undefined,
        null,
      ),
    );
    expect(
      (await screen.findByTestId("view-preset-layout-status")).textContent,
    ).toMatch(/filters are kept/i);
  });

  it("tells the user when a layout could not be saved, without claiming success (negative)", async () => {
    graph.updateViewPresetLayout.mockResolvedValueOnce(null);
    await open(fakeCy(shown));

    await fireEvent.click(
      screen.getByRole("button", {
        name: 'Update layout snapshot for "Faction map"',
      }),
    );

    const status = await screen.findByTestId("view-preset-layout-status");
    expect(status.textContent).toMatch(/could not be saved/i);
    expect(status.textContent).not.toMatch(/Layout saved to/);
  });

  it("does not update a view that is not the open one (negative)", async () => {
    graph.activeViewPresetId = "p2";
    await open(fakeCy(shown));

    const button = screen.getByRole("button", {
      name: 'Update layout snapshot for "Faction map"',
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    await fireEvent.click(button);
    expect(graph.updateViewPresetLayout).not.toHaveBeenCalled();
  });

  it("does not update while nothing is shown (negative)", async () => {
    await open(fakeCy([]));

    expect(
      (
        screen.getByRole("button", {
          name: 'Update layout snapshot for "Faction map"',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

describe("GraphViewPresets: opening a view", () => {
  it("still restores the saved camera, as before", async () => {
    const cy = fakeCy(shown);
    graph.viewPresets = [preset("p1", "Faction map", true)];
    graph.applyViewPreset.mockReturnValue({
      preset: graph.viewPresets[0],
      modeChanged: false,
      layoutApplied: true,
    });
    await open(cy);

    await fireEvent.click(screen.getByTitle('Apply "Faction map"'));

    expect(cy.animate).toHaveBeenCalledWith(
      expect.objectContaining({ pan: camera.pan, zoom: camera.zoom }),
    );
  });
});
