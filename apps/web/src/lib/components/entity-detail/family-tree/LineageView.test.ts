/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import LineageView from "./LineageView.svelte";

type Conn = { target: string; type: string; label?: string };

function char(
  id: string,
  connections: Conn[] = [],
  extra: Partial<Entity> = {},
): Entity {
  return {
    id,
    type: "character",
    title: id.toUpperCase(),
    connections: connections.map((c) => ({ ...c, strength: 1 })),
    ...extra,
  } as unknown as Entity;
}

function map(...entities: Entity[]): Record<string, Entity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]));
}

function fiveGenerationLine(): Record<string, Entity> {
  const chain = ["ggparent", "gparent", "parent", "focus", "child"];
  const conns: Record<string, Conn[]> = Object.fromEntries(
    chain.map((id) => [id, []]),
  );
  for (let i = 0; i < chain.length - 1; i++) {
    conns[chain[i]].push({ target: chain[i + 1], type: "parent_of" });
    conns[chain[i + 1]].push({ target: chain[i], type: "child_of" });
  }
  return map(...chain.map((id) => char(id, conns[id])));
}

function cadetBranchDynasty(): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  const add = (id: string, conns: Conn[] = []) => {
    entities[id] = char(id, conns);
  };
  add("greatx1", [
    { target: "parent", type: "parent_of" },
    { target: "auntUncle", type: "parent_of" },
  ]);
  add("parent", [
    { target: "greatx1", type: "child_of" },
    { target: "focus", type: "parent_of" },
  ]);
  add("auntUncle", [
    { target: "greatx1", type: "child_of" },
    { target: "cousin", type: "parent_of" },
  ]);
  add("cousin", [{ target: "auntUncle", type: "child_of" }]);
  add("focus", [{ target: "parent", type: "child_of" }]);
  return entities;
}

/** Straight descendant line `depth` generations deep below focus, for depth-cap tests. */
function deepDescendantLine(depth: number): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  let prev = "focus";
  entities[prev] = char(prev);
  for (let i = 1; i <= depth; i++) {
    const id = `d${i}`;
    entities[prev] = char(prev, [
      ...(entities[prev].connections ?? []).map((c) => ({
        target: c.target,
        type: c.type,
      })),
      { target: id, type: "parent_of" },
    ]);
    entities[id] = char(id, [{ target: prev, type: "child_of" }]);
    prev = id;
  }
  return entities;
}

describe("LineageView — static rendering (T010)", () => {
  it("renders a card per visible member at layout positions", () => {
    const entities = fiveGenerationLine();
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });
    for (const id of ["ggparent", "gparent", "parent", "focus", "child"]) {
      expect(screen.getByTestId(`lineage-card-${id}`)).toBeTruthy();
    }
  });

  it("marks the focus card visually", () => {
    const entities = fiveGenerationLine();
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });
    const focusCard = screen.getByTestId("lineage-card-focus");
    expect(
      focusCard.querySelector('[data-testid="family-member-card"]')?.className,
    ).toContain("border-theme-primary");
  });

  it("shows a collapsed indicator with a hidden count for a sibling branch", () => {
    const entities = cadetBranchDynasty();
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });
    const toggle = screen.getByTestId("lineage-branch-toggle-auntUncle");
    expect(toggle.textContent).toContain("1 hidden");
  });

  it("shows an empty state pointing to the Family tab when no family is recorded", () => {
    render(LineageView, {
      focusId: "focus",
      entities: map(char("focus")),
      onOpen: () => {},
      onRecenter: () => {},
    });
    expect(screen.getByTestId("lineage-empty").textContent).toContain(
      "Family tab",
    );
  });

  it("does not expose development-only canvas instrumentation", () => {
    render(LineageView, {
      focusId: "focus",
      entities: fiveGenerationLine(),
      onOpen: () => {},
      onRecenter: () => {},
    });
    const canvas = screen.getByTestId("lineage-canvas");
    expect(canvas.hasAttribute("data-debug-expanded-size")).toBe(false);
    expect(canvas.hasAttribute("data-debug-cards")).toBe(false);
  });

  it("offers no relationship-editing affordances (view-only)", () => {
    const entities = fiveGenerationLine();
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });
    expect(screen.queryByText(/add parent/i)).toBeNull();
    expect(screen.queryByTestId("empty-family-slot")).toBeNull();
  });

  it("recomputes the chart when the entities prop changes", async () => {
    const entities = map(char("focus"));
    const { rerender } = render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });
    expect(screen.getByTestId("lineage-empty")).toBeTruthy();

    const updated = map(
      char("focus", [{ target: "child", type: "parent_of" }]),
      char("child", [{ target: "focus", type: "child_of" }]),
    );
    await rerender({
      focusId: "focus",
      entities: updated,
      onOpen: () => {},
      onRecenter: () => {},
    });
    expect(screen.queryByTestId("lineage-empty")).toBeNull();
    expect(screen.getByTestId("lineage-card-child")).toBeTruthy();
  });
});

describe("LineageView — branches, expanders, expand-all, recentre (T018)", () => {
  it("expands and re-collapses a branch, revealing its descendants", async () => {
    const entities = cadetBranchDynasty();
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });

    expect(screen.queryByTestId("lineage-card-cousin")).toBeNull();
    await fireEvent.click(
      screen.getByTestId("lineage-branch-toggle-auntUncle"),
    );
    expect(screen.getByTestId("lineage-card-cousin")).toBeTruthy();

    await fireEvent.click(
      screen.getByTestId("lineage-branch-toggle-auntUncle"),
    );
    expect(screen.queryByTestId("lineage-card-cousin")).toBeNull();
  });

  it("shows a generation expander beyond the depth cap and reveals more on click", async () => {
    const entities = deepDescendantLine(5); // cap defaults to 3
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });

    expect(screen.getByTestId("lineage-card-d3")).toBeTruthy();
    expect(screen.queryByTestId("lineage-card-d4")).toBeNull();
    expect(screen.getByTestId("lineage-expander-down")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("lineage-expander-down"));
    expect(screen.getByTestId("lineage-card-d4")).toBeTruthy();
    expect(screen.getByTestId("lineage-card-d5")).toBeTruthy();
    expect(screen.queryByTestId("lineage-expander-down")).toBeNull();
  });

  it("reveals every generation and branch via Show all generations, staying busy while it renders", async () => {
    const entities = { ...deepDescendantLine(5), ...cadetBranchDynasty() };
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: () => {},
    });

    const canvas = screen.getByTestId("lineage-canvas");
    expect(canvas.getAttribute("aria-busy")).toBe("false");

    await fireEvent.click(screen.getByTestId("lineage-expand-all"));
    expect(canvas.getAttribute("aria-busy")).toBe("true");

    await waitFor(() => expect(canvas.getAttribute("aria-busy")).toBe("false"));
    expect(screen.getByTestId("lineage-card-d5")).toBeTruthy();
    expect(screen.getByTestId("lineage-card-cousin")).toBeTruthy();
  });

  it("calls onRecenter when a non-focus card is selected", async () => {
    const entities = fiveGenerationLine();
    let recentered: string | undefined;
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: (id: string) => (recentered = id),
    });
    const parentCard = screen.getByTestId("lineage-card-parent");
    await fireEvent.click(
      parentCard.querySelector(
        '[data-testid="family-card-select"]',
      ) as HTMLElement,
    );
    expect(recentered).toBe("parent");
  });

  it("calls onOpen when a card's open control is used", async () => {
    const entities = fiveGenerationLine();
    let opened: string | undefined;
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: (id: string) => (opened = id),
      onRecenter: () => {},
    });
    const parentCard = screen.getByTestId("lineage-card-parent");
    await fireEvent.click(
      parentCard.querySelector(
        '[data-testid="family-card-open"]',
      ) as HTMLElement,
    );
    expect(opened).toBe("parent");
  });
});

describe("LineageView — performance guard (T025)", () => {
  it("expands and recentres a 200-member lineage within one second", async () => {
    const entities = deepDescendantLine(200);
    const start = performance.now();
    let recentred = "";
    render(LineageView, {
      focusId: "focus",
      entities,
      onOpen: () => {},
      onRecenter: (id: string) => (recentred = id),
    });

    await fireEvent.click(screen.getByTestId("lineage-expand-all"));
    await waitFor(() =>
      expect(screen.getByTestId("lineage-card-d200")).toBeTruthy(),
    );
    await fireEvent.click(
      screen
        .getByTestId("lineage-card-d100")
        .querySelector('[data-testid="family-card-select"]') as HTMLElement,
    );
    expect(recentred).toBe("d100");
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
