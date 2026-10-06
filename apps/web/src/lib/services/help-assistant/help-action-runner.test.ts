import { describe, expect, it, vi } from "vitest";
import {
  sanitizeHelpContext,
  type GuidanceAction,
  type HelpContext,
} from "help-engine";
import { vault } from "$lib/stores/vault.svelte";
import {
  HelpActionRunner,
  type HelpActionRunnerDeps,
} from "./help-action-runner";

const screen = (over: Record<string, unknown> = {}): HelpContext =>
  sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "entity-detail",
    entityKind: "location",
    tab: "connections",
    flags: ["connections-editable", "generators"],
    availableActions: ["status-tab", "connections-tab"],
    ...over,
  });

const guide: GuidanceAction = {
  type: "openPanel",
  panel: "status-tab",
  label: "Open the Status tab",
  then: {
    type: "highlight",
    target: "add-connection-button",
    label: "Add a connection",
  },
};

function setup(over: Partial<HelpActionRunnerDeps> = {}, context = screen()) {
  const openTab = vi.fn();
  const show = vi.fn(() => true);
  const deps: HelpActionRunnerDeps = {
    surfaces: { entityDetail: { openTab } as never, vttMap: null },
    highlight: { show },
    context: () => context,
    helpIds: () => new Set(["graph-basics"]),
    goto: vi.fn(),
    destinationPath: (d) => `/${d}`,
    openHelp: vi.fn(),
    openGenerator: vi.fn(),
    openSettings: vi.fn(),
    openJournal: vi.fn(),
    waitFor: async (check) => check(),
    ...over,
  };
  return { runner: new HelpActionRunner(deps), deps, openTab, show };
}

describe("HelpActionRunner", () => {
  it.each(["stats", "family", "timeline"] as const)(
    "opens the actual %s tab",
    async (tab) => {
      const { runner, openTab } = setup(
        {},
        screen({ entityKind: "character", availableActions: [`${tab}-tab`] }),
      );
      expect(
        await runner.run({
          type: "openPanel",
          panel: `${tab}-tab`,
          label: "Open",
        }),
      ).toBe(true);
      expect(openTab).toHaveBeenCalledWith(tab);
    },
  );

  it("opens the journal view without starting or writing a journal", async () => {
    const { runner, deps, openTab } = setup(
      {},
      screen({ availableActions: ["session-journal"] }),
    );
    expect(
      await runner.run({
        type: "openPanel",
        panel: "session-journal",
        label: "Open journal",
      }),
    ).toBe(true);
    expect(deps.openJournal).toHaveBeenCalledOnce();
    expect(openTab).not.toHaveBeenCalled();
  });

  it("refuses a journal guide after switching to a guest or unready vault", async () => {
    const { runner, deps } = setup({}, screen({ availableActions: [] }));
    expect(
      await runner.run({
        type: "openPanel",
        panel: "session-journal",
        label: "Open journal",
      }),
    ).toBe(false);
    expect(deps.openJournal).not.toHaveBeenCalled();
  });
  it("opens the Status tab and then highlights Add, as one accepted guide", async () => {
    const { runner, openTab, show } = setup();
    expect(await runner.run(guide)).toBe(true);
    expect(openTab).toHaveBeenCalledWith("status");
    expect(show).toHaveBeenCalledWith(
      "add-connection-button",
      "Add a connection",
    );
    expect(openTab.mock.invocationCallOrder[0]).toBeLessThan(
      show.mock.invocationCallOrder[0],
    );
  });

  it("waits for a control that mounts after the tab opens", async () => {
    let attempts = 0;
    const show = vi.fn(() => ++attempts >= 3);
    const { runner } = setup({
      highlight: { show },
      waitFor: async (check) => {
        for (let i = 0; i < 5; i++) if (check()) return true;
        return false;
      },
    });
    await runner.run(guide);
    expect(show).toHaveBeenCalledTimes(3);
  });

  it("gives up quietly when the control never appears", async () => {
    const { runner } = setup({
      highlight: { show: vi.fn(() => false) },
      waitFor: async (check) => check(),
    });
    await expect(runner.run(guide)).resolves.toBe(true); // the tab still opened
  });

  it("discards a guide that is no longer valid for the current screen", async () => {
    const { runner, openTab, show } = setup(
      {},
      screen({ area: "graph", availableActions: [] }),
    );
    expect(await runner.run(guide)).toBe(false);
    expect(openTab).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("discards an off-list action outright", async () => {
    const { runner, deps } = setup();
    expect(
      await runner.run({ type: "deleteEntity", label: "x" } as never),
    ).toBe(false);
    expect(deps.goto).not.toHaveBeenCalled();
  });

  it("does not open a tab when no entry is on screen", async () => {
    const { runner } = setup({
      surfaces: { entityDetail: null, vttMap: null },
    });
    expect(await runner.run(guide)).toBe(false);
  });

  it("runs each of the other safe action types", async () => {
    const { runner, deps } = setup();
    await runner.run({
      type: "navigate",
      to: "graph",
      label: "Open the graph",
    });
    expect(deps.goto).toHaveBeenCalledWith("/graph");
    await runner.run({
      type: "openHelp",
      helpId: "graph-basics",
      label: "Read",
    });
    expect(deps.openHelp).toHaveBeenCalledWith("graph-basics");
    await runner.run({
      type: "openGenerator",
      generatorId: "npc",
      label: "Open",
    });
    expect(deps.openGenerator).toHaveBeenCalledWith("npc");
    await runner.run({ type: "openGenerator", label: "Open the generators" });
    expect(deps.openGenerator).toHaveBeenLastCalledWith(undefined);
  });

  it("opens the Vault tab of Settings when a guide asks for it", async () => {
    const { runner, deps, openTab } = setup(
      {},
      screen({ availableActions: ["settings-vault"] }),
    );
    expect(
      await runner.run({
        type: "openPanel",
        panel: "settings-vault",
        label: "Open Vault settings",
      }),
    ).toBe(true);
    expect(deps.openSettings).toHaveBeenCalledTimes(1);
    expect(deps.openSettings).toHaveBeenCalledWith("vault");
    expect(openTab).not.toHaveBeenCalled();
  });

  it("does not open Settings when the screen no longer lists it, such as in a guest vault", async () => {
    const { runner, deps } = setup({}, screen({ availableActions: [] }));
    expect(
      await runner.run({
        type: "openPanel",
        panel: "settings-vault",
        label: "Open Vault settings",
      }),
    ).toBe(false);
    expect(deps.openSettings).not.toHaveBeenCalled();
  });

  it("goes to the canvas, map and import screens through the destination list only", async () => {
    const { runner, deps } = setup();
    for (const to of ["canvas", "map", "import"] as const) {
      expect(await runner.run({ type: "navigate", to, label: "Go" })).toBe(
        true,
      );
      expect(deps.goto).toHaveBeenLastCalledWith(`/${to}`);
    }
  });

  it("never creates, edits, deletes, imports or exports vault content, whatever the action", async () => {
    const mutators = [
      "addConnection",
      "createEntity",
      "updateEntity",
      "deleteEntity",
      "removeConnection",
      "importFromFile",
      "exportToFile",
    ] as const;
    const spies = mutators
      .filter(
        (name) =>
          typeof (vault as unknown as Record<string, unknown>)[name] ===
          "function",
      )
      .map((name) => vi.spyOn(vault as never, name));
    expect(spies.length).toBeGreaterThan(0);

    const { runner } = setup(
      {},
      screen({
        availableActions: ["status-tab", "connections-tab", "settings-vault"],
      }),
    );
    const actions: GuidanceAction[] = [
      guide,
      { type: "openPanel", panel: "settings-vault", label: "Settings" },
      { type: "navigate", to: "import", label: "Import" },
      { type: "navigate", to: "tables", label: "Go" },
      { type: "openHelp", helpId: "graph-basics", label: "Read" },
      { type: "openGenerator", generatorId: "quest", label: "Open" },
      { type: "openGenerator", label: "Open the generators" },
      { type: "highlight", target: "status-tab", label: "Tab" },
    ];
    for (const action of actions) await runner.run(action);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  describe("VTT guides", () => {
    const mapContext = () =>
      sanitizeHelpContext({
        routeTemplate: "/(app)/map",
        area: "map",
        flags: ["vtt-on"],
        availableActions: ["vtt-sidebar", "vtt-add-token", "vtt-grid-settings"],
      });
    const showAddToken = {
      type: "openPanel",
      panel: "vtt-sidebar",
      label: "Show me where to add a token",
      then: { type: "highlight", target: "vtt-add-token", label: "Add Token" },
    } as const;

    it("opens the sidebar through the map, then points at the control", async () => {
      const openPanel = vi.fn(() => true);
      const { runner, deps } = setup(
        {
          surfaces: {
            entityDetail: null,
            vttMap: { facts: vi.fn(), actions: vi.fn(), openPanel } as never,
          },
        },
        mapContext(),
      );

      expect(await runner.run(showAddToken)).toBe(true);

      expect(openPanel).toHaveBeenCalledWith("vtt-sidebar");
      expect(deps.highlight.show).toHaveBeenCalledWith(
        "vtt-add-token",
        "Add Token",
      );
    });

    it("does nothing when the map cannot open the panel, and says so", async () => {
      const { runner, deps } = setup(
        {
          surfaces: {
            entityDetail: null,
            vttMap: {
              facts: vi.fn(),
              actions: vi.fn(),
              openPanel: () => false,
            } as never,
          },
        },
        mapContext(),
      );

      expect(await runner.run(showAddToken)).toBe(false);
      expect(deps.highlight.show).not.toHaveBeenCalled();
    });

    it("does nothing when no map is on screen to open it", async () => {
      const { runner } = setup(
        { surfaces: { entityDetail: null, vttMap: null } },
        mapContext(),
      );

      expect(await runner.run(showAddToken)).toBe(false);
    });

    it("refuses a guide for a control this user cannot reach", async () => {
      const player = sanitizeHelpContext({
        routeTemplate: "/(app)/map",
        area: "map",
        flags: ["vtt-on", "vtt-guest"],
        availableActions: ["vtt-sidebar"],
      });
      const openPanel = vi.fn(() => true);
      const { runner } = setup(
        {
          surfaces: {
            entityDetail: null,
            vttMap: { facts: vi.fn(), actions: vi.fn(), openPanel } as never,
          },
        },
        player,
      );

      expect(await runner.run(showAddToken)).toBe(false);
      expect(openPanel).not.toHaveBeenCalled();
    });
  });
});
