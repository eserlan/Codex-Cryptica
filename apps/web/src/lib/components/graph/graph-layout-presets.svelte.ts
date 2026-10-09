import type { Core } from "cytoscape";
import type { GraphStore } from "$lib/stores/graph.svelte";
import type { ViewPreset } from "$lib/stores/view-presets";
import {
  captureLayoutSnapshot,
  countLayoutNodes,
  layoutUnavailableReason,
} from "./graph-layout-snapshot";

type LayoutGraph = Pick<
  GraphStore,
  | "timelineMode"
  | "orbitMode"
  | "saveViewPreset"
  | "updateViewPresetLayout"
  | "activeViewPresetId"
>;

/**
 * The layout side of the graph's Saved Views panel (#3456): the "Save current
 * layout" option, the checks that decide whether a layout can be saved right
 * now, and the save, update and remove actions with their messages. Kept out of
 * the panel so the panel only shows it.
 */
export class GraphLayoutPresets {
  /** The "Save current layout" option. Off unless the user turns it on. */
  saveLayout = $state(false);
  /** The result of the last layout action, for the user to read. */
  status = $state<{ text: string; failed: boolean } | null>(null);
  private shownCount = $state(0);

  constructor(
    private readonly graph: LayoutGraph,
    private readonly getCy: () => Core | undefined,
  ) {}

  /** Why a layout cannot be saved right now, or `undefined` when it can. */
  get unavailable(): string | undefined {
    return layoutUnavailableReason(
      {
        timelineMode: this.graph.timelineMode,
        orbitMode: this.graph.orbitMode,
      },
      this.shownCount,
    );
  }

  /** Whether `id` is the saved view that is open on screen. */
  isOpen(id: string): boolean {
    return this.graph.activeViewPresetId === id;
  }

  /** Called when the panel opens: re-reads what is shown, clears old messages. */
  refresh(): void {
    this.status = null;
    this.shownCount = countLayoutNodes(this.getCy());
  }

  private camera() {
    const cy = this.getCy();
    return cy ? { pan: { ...cy.pan() }, zoom: cy.zoom() } : undefined;
  }

  /** Saves a new view, with the layout only if the option is on and possible. */
  async save(name: string): Promise<ViewPreset | null> {
    const layout =
      this.saveLayout && !this.unavailable
        ? captureLayoutSnapshot(this.getCy())
        : undefined;
    const saved = await this.graph.saveViewPreset(name, this.camera(), layout);
    if (saved && layout) {
      this.status = {
        text: `Saved "${saved.name}" with its layout.`,
        failed: false,
      };
    }
    this.saveLayout = false;
    return saved;
  }

  /** Keeps what is on screen as `preset`'s layout ("Update layout snapshot"). */
  async update(preset: ViewPreset): Promise<void> {
    const layout = captureLayoutSnapshot(this.getCy());
    if (!layout || this.unavailable) {
      this.status = {
        text: this.unavailable ?? "There is no layout to save.",
        failed: true,
      };
      return;
    }
    const updated = await this.graph.updateViewPresetLayout(
      preset.id,
      this.camera(),
      layout,
    );
    this.status = updated
      ? { text: `Layout saved to "${preset.name}".`, failed: false }
      : { text: "The layout could not be saved.", failed: true };
  }

  /** Removes `preset`'s layout, leaving its name and filters. */
  async remove(preset: ViewPreset): Promise<void> {
    const updated = await this.graph.updateViewPresetLayout(
      preset.id,
      undefined,
      null,
    );
    this.status = updated
      ? {
          text: `Removed the layout from "${preset.name}". Its filters are kept.`,
          failed: false,
        }
      : { text: "The layout could not be removed.", failed: true };
  }
}
