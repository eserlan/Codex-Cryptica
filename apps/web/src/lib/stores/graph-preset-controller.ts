import {
  resolveLayoutOverride,
  type LayoutPositions,
} from "#lib/components/graph/graph-layout-snapshot.js";
import type { vault } from "./vault.svelte";
import type { ViewPresetsStore } from "./view-presets.svelte";
import type {
  ViewLayoutSnapshot,
  ViewPreset,
  ViewPresetState,
} from "./view-presets";
import {
  captureViewState,
  resolvePresetView,
  type ViewStateSource,
} from "./graph-view-state";

type Viewport = ViewPresetState["viewport"];

/** The graph state a saved view reads from and writes back to. */
export interface PresetHost extends ViewStateSource {
  layoutOverride: LayoutPositions | null;
}

export interface AppliedPreset {
  preset: ViewPreset;
  modeChanged: boolean;
  layoutApplied: boolean;
}

/** Saves, opens and removes the active vault's saved views for the graph. */
export class GraphPresetController {
  private host: PresetHost;
  private getVault: () => typeof vault;
  private presets: ViewPresetsStore;

  constructor(
    host: PresetHost,
    getVault: () => typeof vault,
    presets: ViewPresetsStore,
  ) {
    this.host = host;
    this.getVault = getVault;
    this.presets = presets;
  }

  private get vaultId() {
    return this.getVault().activeVaultId ?? "default";
  }

  /** The id of the saved view that is open, if any. */
  get activeId(): string | null {
    return this.presets.activePresetId;
  }

  get list(): ViewPreset[] {
    return this.presets.presets;
  }

  set list(value: ViewPreset[]) {
    this.presets.presets = value;
  }

  async load() {
    const vaultId = this.vaultId;
    // Another vault's layout must never carry over.
    if (this.presets.loadedVaultId !== vaultId) this.host.layoutOverride = null;
    return await this.presets.loadPresets(vaultId);
  }

  async save(
    name: string,
    viewport?: Viewport,
    layout?: ViewLayoutSnapshot,
  ): Promise<ViewPreset | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const state = captureViewState(this.host, viewport, layout);
    const saved = await this.presets.savePreset(this.vaultId, trimmed, state);
    // The view just saved is now the open one, so its layout is what is shown.
    if (saved) this.host.layoutOverride = layout?.positions ?? null;
    return saved;
  }

  /**
   * Sets, replaces or removes a view's saved layout ("Update layout snapshot").
   * If that view is the open one, the screen follows it at once. Returns `null`
   * and changes nothing when the view is missing or the change cannot be stored.
   */
  async updateLayout(
    id: string,
    viewport: Viewport,
    layout: ViewLayoutSnapshot | null,
  ): Promise<ViewPreset | null> {
    const updated = await this.presets.setPresetLayout(
      this.vaultId,
      id,
      layout,
      viewport,
    );
    if (updated && this.presets.activePresetId === id) {
      this.host.layoutOverride = updated.state.layout?.positions ?? null;
    }
    return updated;
  }

  /**
   * Restores a preset's visual state. Filters that reference labels,
   * categories, or orbit centers that no longer exist in the vault are
   * skipped instead of failing (preset drift).
   *
   * Returns the preset and whether a mode (timeline/orbit) flipped — callers
   * use that to decide if restoring the stored viewport is safe or whether
   * the mode layout's own fit should win.
   */
  apply(id: string): AppliedPreset | null {
    const preset = this.presets.applyPreset(id);
    if (!preset) return null;
    const host = this.host;
    const view = resolvePresetView(preset.state, this.getVault().allEntities);

    const wasTimeline = host.timelineMode;
    const wasOrbit = host.orbitMode;
    Object.assign(host, view);
    const modeChanged =
      wasTimeline !== host.timelineMode || wasOrbit !== host.orbitMode;

    // Timeline and orbit arrange entities themselves, so a saved layout has
    // nothing to say there. Applying any view replaces the previous layout, so
    // a view without one shows the everyday arrangement again.
    host.layoutOverride = resolveLayoutOverride(
      preset.state.layout,
      host.timelineMode || host.orbitMode,
    );
    return { preset, modeChanged, layoutApplied: host.layoutOverride !== null };
  }

  async rename(id: string, name: string) {
    await this.presets.renamePreset(this.vaultId, id, name);
  }

  async remove(id: string) {
    const wasOpen = this.presets.activePresetId === id;
    await this.presets.deletePreset(this.vaultId, id);
    if (wasOpen) this.host.layoutOverride = null;
  }
}
