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
    surfaces: { entityDetail: { openTab } as never },
    highlight: { show },
    context: () => context,
    helpIds: () => new Set(["graph-basics"]),
    goto: vi.fn(),
    destinationPath: (d) => `/${d}`,
    openHelp: vi.fn(),
    openGenerator: vi.fn(),
    waitFor: async (check) => check(),
    ...over,
  };
  return { runner: new HelpActionRunner(deps), deps, openTab, show };
}

describe("HelpActionRunner", () => {
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
    const { runner } = setup({ surfaces: { entityDetail: null } });
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
      generatorId: "campaign",
      label: "Open",
    });
    expect(deps.openGenerator).toHaveBeenCalled();
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

    const { runner } = setup();
    const actions: GuidanceAction[] = [
      guide,
      { type: "navigate", to: "tables", label: "Go" },
      { type: "openHelp", helpId: "graph-basics", label: "Read" },
      { type: "openGenerator", generatorId: "campaign", label: "Open" },
      { type: "highlight", target: "status-tab", label: "Tab" },
    ];
    for (const action of actions) await runner.run(action);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
