import type { Core } from "cytoscape";
import type { ViewLayoutSnapshot } from "$lib/stores/view-presets";

/**
 * Helpers for a view's optional saved layout (#3456). Pure and forgiving: they
 * take what the graph has, do what they can, and never throw over a stale or
 * damaged position. None of them touch the vault, so applying a layout never
 * changes the everyday arrangement.
 */

type Point = { x: number; y: number };
export type LayoutPositions = Record<string, Point>;

const isPoint = (p: unknown): p is Point => {
  const point = p as Point | undefined;
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
};

/**
 * Where every entity currently shown sits, for saving with a view. Entities
 * hidden by the filters, or still waiting for a first placement, are left out:
 * the layout covers what the user can see and has arranged.
 */
export function captureLayoutSnapshot(
  cy: Core | undefined,
): ViewLayoutSnapshot | undefined {
  if (!cy) return undefined;
  const positions: LayoutPositions = {};
  cy.nodes().forEach((node) => {
    if (!node.visible() || node.data("isPendingLayout")) return;
    const { x, y } = node.position();
    if (!isPoint({ x, y })) return;
    positions[node.id()] = { x: Math.round(x), y: Math.round(y) };
  });
  return Object.keys(positions).length > 0 ? { positions } : undefined;
}

/**
 * Moves entities that are on the graph to their saved positions. Saved entries
 * for entities that no longer exist are ignored, and entities with no saved
 * position stay where they are. Returns how many were moved.
 */
export function applyLayoutSnapshot(
  cy: Core | undefined,
  positions: LayoutPositions,
): number {
  if (!cy) return 0;
  let moved = 0;
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const saved = positions[node.id()];
      if (!isPoint(saved)) return;
      node.position({ x: saved.x, y: saved.y });
      moved += 1;
    });
  });
  return moved;
}

/**
 * Puts entities back where the vault keeps them, for when a view's own layout
 * is left. Entities the vault has no usable position for stay where they are.
 */
export function restoreEverydayPositions(
  cy: Core | undefined,
  everydayPosition: (id: string) => Point | undefined,
): number {
  if (!cy) return 0;
  let moved = 0;
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const everyday = everydayPosition(node.id());
      if (!isPoint(everyday)) return;
      node.position({ x: everyday.x, y: everyday.y });
      moved += 1;
    });
  });
  return moved;
}

type ElementLike = {
  group?: string;
  data: Record<string, unknown> & { id?: unknown };
  position?: Point;
};

/**
 * The graph's elements with a view's saved positions laid over the everyday
 * ones. Entities without a saved position, and edges, come back untouched, so
 * the graph places new entities beside their neighbours as it always has. The
 * input is never changed.
 */
export function withLayoutOverride<T extends ElementLike>(
  elements: T[],
  override: LayoutPositions | null | undefined,
): T[] {
  if (!override || Object.keys(override).length === 0) return elements;
  let changed = false;
  const result = elements.map((element) => {
    if (element.group !== "nodes") return element;
    const saved = override[String(element.data.id)];
    if (!isPoint(saved)) return element;
    changed = true;
    const { isPendingLayout: _pending, ...data } = element.data;
    return { ...element, data, position: { x: saved.x, y: saved.y } };
  });
  return changed ? (result as T[]) : elements;
}

/**
 * Why a layout cannot be saved right now, in plain language, or `undefined`
 * when it can. Timeline and orbit arrange entities themselves, and with nothing
 * shown there is nothing to keep.
 */
export function layoutUnavailableReason(
  modes: { timelineMode: boolean; orbitMode: boolean },
  shownCount: number,
): string | undefined {
  if (modes.timelineMode || modes.orbitMode) {
    return "Timeline and orbit arrange entities themselves, so a layout can't be saved here.";
  }
  if (shownCount === 0) return "Nothing is shown on the graph yet.";
  return undefined;
}

/** How many entities a layout saved now would cover. */
export function countLayoutNodes(cy: Core | undefined): number {
  return Object.keys(captureLayoutSnapshot(cy)?.positions ?? {}).length;
}

/**
 * The positions to lay over the graph when a view is opened: its saved layout,
 * unless the view uses timeline or orbit, which arrange entities themselves.
 * `null` means show the everyday arrangement.
 */
export function resolveLayoutOverride(
  layout: ViewLayoutSnapshot | undefined,
  arrangesItself: boolean,
): LayoutPositions | null {
  return layout && !arrangesItself ? layout.positions : null;
}
