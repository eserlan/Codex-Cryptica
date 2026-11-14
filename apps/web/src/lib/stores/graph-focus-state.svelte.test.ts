/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { LARGE_GRAPH_NODE_THRESHOLD } from "graph-engine";
import { MIN_FOCUS_DEPTH } from "./graph-focus";
import { GraphFocusState } from "./graph-focus-state.svelte";

const entity = (id: string) => ({
  id,
  title: id,
  type: "npc",
  connections: [],
});

function setup(count: number) {
  const entities = Array.from({ length: count }, (_, i) => entity(`n${i}`));
  const vault: any = {
    entities: Object.fromEntries(entities.map((e) => [e.id, e])),
    graphEntities: entities,
    allEntities: entities,
    graphStructureVersion: 0,
    inboundConnections: {},
    selectedEntityId: null,
    defaultVisibility: "visible",
  };
  const session: any = { sharedMode: false, isGuestMode: true };
  return { vault, focus: new GraphFocusState(() => vault, session) };
}

const LARGE = LARGE_GRAPH_NODE_THRESHOLD + 1;

describe("GraphFocusState", () => {
  it("is only active for a large vault, and not once the full graph is shown", () => {
    expect(setup(5).focus.active).toBe(false);

    const { focus } = setup(LARGE);
    expect(focus.active).toBe(true);
    focus.toggleFullGraph();
    expect(focus.active).toBe(false);
  });

  it("renders every element for a small vault", () => {
    const { focus } = setup(5);
    expect(focus.computeElements()).toHaveLength(5);
  });

  it("culls a large vault to the bounded overview", () => {
    const { focus } = setup(LARGE);
    expect(focus.computeElements().length).toBeLessThan(LARGE);
  });

  it("sets a root once and keeps it until it disappears", () => {
    const { focus, vault } = setup(LARGE);
    focus.ensureRoot();
    const root = focus.rootId;
    expect(root).not.toBeNull();

    vault.selectedEntityId = "n7";
    focus.ensureRoot();
    expect(focus.rootId).toBe(root);

    vault.graphEntities = vault.graphEntities.filter((e: any) => e.id !== root);
    focus.ensureRoot();
    expect(focus.rootId).not.toBe(root);
  });

  it("ignores ensureRoot while the focus view is off", () => {
    const { focus } = setup(5);
    focus.ensureRoot();
    expect(focus.rootId).toBeNull();
  });

  it("navigates only to a known entity while active", () => {
    const { focus, vault } = setup(LARGE);
    focus.navigateTo("missing");
    expect(focus.rootId).toBeNull();

    focus.navigateTo("n9");
    expect(focus.rootId).toBe("n9");

    focus.toggleFullGraph();
    focus.navigateTo("n10");
    expect(focus.rootId).toBe("n9");
    expect(vault.entities.n10).toBeDefined();
  });

  it("reset returns to the bounded overview", () => {
    const { focus } = setup(LARGE);
    focus.toggleFullGraph();
    focus.depth = 3;
    focus.rootId = "n1";

    focus.reset();

    expect(focus.showFullGraph).toBe(false);
    expect(focus.depth).toBe(MIN_FOCUS_DEPTH);
    expect(focus.rootId).toBeNull();
  });
});
