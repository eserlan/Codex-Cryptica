<script lang="ts">
  import {
    parseHexLabel,
    type HexCoord,
    type HexLabelConfig,
    type HexOrientation,
  } from "map-engine";

  let {
    labelConfig,
    orientation,
    onGo,
  }: {
    labelConfig: HexLabelConfig | undefined;
    orientation: HexOrientation;
    onGo: (hex: HexCoord, opener: HTMLElement) => void;
  } = $props();

  let text = $state("");
  let message = $state("");

  function submit(opener: HTMLElement | null) {
    const typed = text.trim();
    if (!typed) {
      message = "";
      return;
    }
    const hex = parseHexLabel(typed, labelConfig, orientation);
    if (!hex) {
      message = `There is no hex ${typed} on this map.`;
      return;
    }
    message = "";
    if (opener) onGo(hex, opener);
  }
</script>

<form
  class="flex flex-col gap-1"
  onsubmit={(event) => {
    event.preventDefault();
    const opener =
      event.submitter instanceof HTMLElement
        ? event.submitter
        : event.currentTarget.querySelector("input");
    submit(opener);
  }}
>
  <label
    class="text-micro uppercase tracking-widest font-bold text-theme-muted"
    for="hex-go-to-input"
  >
    Go to hex
  </label>
  <div class="flex items-stretch gap-2">
    <input
      id="hex-go-to-input"
      type="text"
      bind:value={text}
      placeholder="e.g. C04"
      autocomplete="off"
      aria-label="Go to hex"
      class="min-w-0 flex-1 rounded-lg border border-theme-border bg-theme-bg px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-primary"
    />
    <button
      type="button"
      onclick={(event) => submit(event.currentTarget)}
      class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40"
    >
      Go
    </button>
  </div>
  {#if message}
    <p role="status" class="text-micro text-theme-muted">{message}</p>
  {:else}
    <p role="status" class="sr-only"></p>
  {/if}
</form>
