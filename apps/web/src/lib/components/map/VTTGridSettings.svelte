<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore, type GridType } from "$lib/stores/map.svelte";
  import {
    type HexLabelConfig,
    type HexLabelStyle,
    formatHexLabel,
  } from "map-engine";
  import { fade } from "svelte/transition";
  import VTTGridFitSection from "./VTTGridFitSection.svelte";

  let { close }: { close: () => void } = $props();

  let gridSize = $state(mapStore.gridSize);
  let gridType = $state<GridType>(mapStore.gridType);
  const initialHexConfig = mapStore.hexLabelConfig;
  let hexLabelStyle = $state<HexLabelStyle>(initialHexConfig.style);
  let hexStartColumn = $state(initialHexConfig.startColumn ?? "A");
  let hexStartRow = $state(initialHexConfig.startRow ?? 1);
  let hexRowPadding = $state(initialHexConfig.rowPadding ?? 2);
  let hexSeparator = $state(initialHexConfig.separator ?? "");
  let hexInvertRow = $state(initialHexConfig.invertRow ?? false);
  let gridUnit = $state(mapSession.gridUnit);
  let gridDistance = $state(mapSession.gridDistance);

  const isHex = $derived(gridType !== "square");
  const hexAxis = $derived(
    gridType === "hex-flat" ? "down a column" : "across a row",
  );

  const currentHexLabelConfig = $derived<HexLabelConfig>({
    style: hexLabelStyle,
    startCol: (hexStartColumn || "A").toUpperCase(),
    startColumn: (hexStartColumn || "A").toUpperCase(),
    startRow: Number(hexStartRow) || 1,
    rowPadding: Number(hexRowPadding) || 2,
    separator: hexSeparator,
    invertRow: hexInvertRow,
  });

  const previewHexLabel = $derived.by(() => {
    if (hexLabelStyle === "off") return "None";
    return formatHexLabel(
      { q: 0, r: 0 },
      currentHexLabelConfig,
      gridType === "hex-flat" ? "flat" : "pointy",
    );
  });

  /** Start the fit with the grid type chosen here, not the one last saved. */
  function startFit() {
    mapSession.setGridSettings({
      gridType,
      showHexCoordinates: hexLabelStyle !== "off",
      hexLabelConfig: currentHexLabelConfig,
      gridUnit,
      gridDistance,
    });
    mapSession.gridFitMode = true;
    close();
  }

  function save() {
    mapSession.setGridSettings({
      gridSize,
      gridType,
      showHexCoordinates: hexLabelStyle !== "off",
      hexLabelConfig: currentHexLabelConfig,
      gridUnit,
      gridDistance,
    });
    close();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    }
    if (e.key === "Enter") {
      save();
    }
  }
</script>

<!-- fallow-ignore-next-line complexity -->
<svelte:window onkeydown={onKeyDown} />

<div class="fixed inset-0 flex items-center justify-center z-[200] p-4">
  <button
    type="button"
    class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
    onclick={close}
    aria-label="Dismiss Grid Settings Backdrop"
  ></button>
  <div
    class="bg-theme-surface border border-theme-border p-6 rounded-xl max-w-md w-full shadow-2xl relative z-10 max-h-[90vh]"
    style="overflow-y: auto"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="vtt-grid-settings-title"
    tabindex="-1"
  >
    <h3
      id="vtt-grid-settings-title"
      class="text-lg font-bold text-theme-text mb-6 uppercase font-header tracking-wider flex items-center gap-2"
    >
      <span
        class="icon-[lucide--grid-3x3] w-5 h-5 text-theme-primary"
        aria-hidden="true"
      ></span>
      Grid Settings
    </h3>

    <div class="space-y-6">
      <div class="space-y-2">
        <span
          id="grid-type-label"
          class="text-micro font-mono text-theme-muted uppercase tracking-widest"
        >
          Grid Type
        </span>
        <div
          class="grid grid-cols-3 gap-2"
          role="group"
          aria-labelledby="grid-type-label"
        >
          <button
            type="button"
            aria-pressed={gridType === "square"}
            class="px-2 py-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors {gridType ===
            'square'
              ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
              : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
            onclick={() => {
              gridType = "square";
            }}
          >
            <span class="icon-[lucide--grid-3x3] w-4 h-4" aria-hidden="true"
            ></span>
            <span>Square</span>
          </button>
          <button
            type="button"
            aria-pressed={gridType === "hex-pointy"}
            class="px-2 py-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors {gridType ===
            'hex-pointy'
              ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
              : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
            onclick={() => {
              gridType = "hex-pointy";
            }}
          >
            <span class="icon-[lucide--hexagon] w-4 h-4" aria-hidden="true"
            ></span>
            <span>Hex (Pointy)</span>
          </button>
          <button
            type="button"
            aria-pressed={gridType === "hex-flat"}
            class="px-2 py-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors {gridType ===
            'hex-flat'
              ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
              : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
            onclick={() => {
              gridType = "hex-flat";
            }}
          >
            <span
              class="icon-[lucide--hexagon] w-4 h-4 rotate-90"
              aria-hidden="true"
            ></span>
            <span>Hex (Flat)</span>
          </button>
        </div>
      </div>

      {#if gridType === "hex-pointy" || gridType === "hex-flat"}
        <div
          class="space-y-3 p-3 rounded-lg bg-theme-bg border border-theme-border"
        >
          <div class="flex items-center justify-between">
            <span
              id="hex-label-style-label"
              class="text-micro font-mono text-theme-muted uppercase tracking-widest"
            >
              Hex Labels
            </span>
            {#if hexLabelStyle !== "off"}
              <span
                class="text-nano font-mono text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded border border-theme-primary/20"
              >
                Sample: {previewHexLabel}
              </span>
            {/if}
          </div>

          <!-- Label Style Selector -->
          <div
            class="grid grid-cols-2 gap-2"
            role="group"
            aria-labelledby="hex-label-style-label"
          >
            <button
              type="button"
              aria-pressed={hexLabelStyle === "off"}
              class="px-2 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors {hexLabelStyle ===
              'off'
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
                : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
              onclick={() => {
                hexLabelStyle = "off";
              }}
            >
              <span
                class="icon-[lucide--eye-off] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
              <span>Off</span>
            </button>
            <button
              type="button"
              aria-pressed={hexLabelStyle === "alphanumeric"}
              class="px-2 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors {hexLabelStyle ===
              'alphanumeric'
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
                : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
              onclick={() => {
                hexLabelStyle = "alphanumeric";
              }}
            >
              <span class="icon-[lucide--type] w-3.5 h-3.5" aria-hidden="true"
              ></span>
              <span>Alphanumeric (A01)</span>
            </button>
            <button
              type="button"
              aria-pressed={hexLabelStyle === "numeric"}
              class="px-2 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors {hexLabelStyle ===
              'numeric'
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
                : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
              onclick={() => {
                hexLabelStyle = "numeric";
              }}
            >
              <span class="icon-[lucide--hash] w-3.5 h-3.5" aria-hidden="true"
              ></span>
              <span>Numeric (01.04)</span>
            </button>
            <button
              type="button"
              aria-pressed={hexLabelStyle === "axial"}
              class="px-2 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors {hexLabelStyle ===
              'axial'
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
                : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
              onclick={() => {
                hexLabelStyle = "axial";
              }}
            >
              <span
                class="icon-[lucide--compass] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
              <span>Axial (q, r)</span>
            </button>
          </div>

          {#if hexLabelStyle === "alphanumeric"}
            <div class="pt-2 border-t border-theme-border/50 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label
                    class="text-nano font-mono text-theme-muted uppercase tracking-wider block"
                    for="hex-start-col"
                  >
                    Start Column
                  </label>
                  <input
                    id="hex-start-col"
                    type="text"
                    maxlength="3"
                    bind:value={hexStartColumn}
                    placeholder="A"
                    class="w-full bg-theme-surface border border-theme-border text-theme-text px-2.5 py-1.5 rounded text-xs focus:border-theme-primary outline-none font-mono uppercase"
                  />
                </div>
                <div class="space-y-1">
                  <label
                    class="text-nano font-mono text-theme-muted uppercase tracking-wider block"
                    for="hex-start-row"
                  >
                    Start Row
                  </label>
                  <input
                    id="hex-start-row"
                    type="number"
                    min="0"
                    max="999"
                    bind:value={hexStartRow}
                    class="w-full bg-theme-surface border border-theme-border text-theme-text px-2.5 py-1.5 rounded text-xs focus:border-theme-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label
                    class="text-nano font-mono text-theme-muted uppercase tracking-wider block"
                    for="hex-row-padding"
                  >
                    Row Digits
                  </label>
                  <select
                    id="hex-row-padding"
                    bind:value={hexRowPadding}
                    class="w-full bg-theme-surface border border-theme-border text-theme-text px-2 py-1.5 rounded text-xs focus:border-theme-primary outline-none"
                  >
                    <option value={2}>2 digits (01, 02)</option>
                    <option value={1}>1 digit (1, 2)</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label
                    class="text-nano font-mono text-theme-muted uppercase tracking-wider block"
                    for="hex-separator"
                  >
                    Separator
                  </label>
                  <select
                    id="hex-separator"
                    bind:value={hexSeparator}
                    class="w-full bg-theme-surface border border-theme-border text-theme-text px-2 py-1.5 rounded text-xs focus:border-theme-primary outline-none"
                  >
                    <option value="">None (A01)</option>
                    <option value="-">Hyphen (A-01)</option>
                    <option value=".">Dot (A.01)</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <label
                  class="text-xs text-theme-text cursor-pointer flex items-center gap-2"
                  for="hex-invert-row"
                >
                  <input
                    id="hex-invert-row"
                    type="checkbox"
                    bind:checked={hexInvertRow}
                    class="accent-theme-primary rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Count south-to-north (inverted)</span>
                </label>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div class="space-y-2">
        <label
          class="text-micro font-mono text-theme-muted uppercase tracking-widest"
          for="grid-size"
        >
          {gridType === "square"
            ? "Grid Cell Size (Pixels)"
            : "Hex Radius (Pixels)"}
        </label>
        <div class="flex items-center gap-4">
          <input
            id="grid-size"
            type="range"
            min={isHex ? 5 : 20}
            max="500"
            step="1"
            bind:value={gridSize}
            class="flex-1 accent-theme-primary h-1"
          />
          <span class="text-xs font-mono text-theme-primary w-12 text-right"
            >{gridSize}px</span
          >
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label
            class="text-micro font-mono text-theme-muted uppercase tracking-widest"
            for="grid-dist"
          >
            Distance per Cell
          </label>
          <input
            id="grid-dist"
            type="number"
            step="0.1"
            bind:value={gridDistance}
            class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 rounded focus:border-theme-primary outline-none text-sm"
          />
        </div>
        <div class="space-y-2">
          <label
            class="text-micro font-mono text-theme-muted uppercase tracking-widest"
            for="grid-unit"
          >
            Unit Name
          </label>
          <input
            id="grid-unit"
            type="text"
            placeholder="ft, m, km..."
            bind:value={gridUnit}
            class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 rounded focus:border-theme-primary outline-none text-sm"
          />
        </div>
      </div>

      <VTTGridFitSection {isHex} {hexAxis} {close} onStartFit={startFit} />

      <div class="pt-2 flex gap-3">
        <button
          type="button"
          class="flex-1 px-4 py-2 border border-theme-border text-theme-muted rounded-md hover:bg-theme-bg transition-all uppercase text-micro font-bold tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          onclick={close}
        >
          Close
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-2 bg-theme-primary text-theme-bg rounded-md font-bold uppercase tracking-wider hover:bg-theme-primary/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-surface"
          onclick={save}
        >
          Apply to All
        </button>
      </div>
    </div>
  </div>
</div>
